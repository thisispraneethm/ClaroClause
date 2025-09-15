import { GoogleGenAI, Type, Chat } from '@google/genai';
import type { AnalysisOptions, AnalysisStreamEvent, ContractAnalysis, DecodedClause, ComparisonResult } from '../types';

/**
 * A basic sanitization function to remove characters that could be used
 * in prompt injection attacks from user-provided focus text.
 */
function sanitizeInput(text: string): string {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: This is intentional for sanitization
    return text.replace(/[<>{}[\]|`]/g, '');
}

const clauseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A concise, descriptive title for the clause." },
        explanation: { type: Type.STRING, description: "A simple, plain-English explanation of what the clause means and its implications." },
        risk: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Unknown'], description: "The potential risk level for the user." },
        originalClause: { type: Type.STRING, description: "The exact, verbatim text of the original clause from the source document." },
        confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "The AI's confidence in its analysis of this specific clause." },
        goodToKnow: { type: Type.BOOLEAN, description: "True if this clause contains positive or beneficial information for the user." },
    },
    required: ["title", "explanation", "risk", "originalClause", "confidence"]
};

const analysisSchema = {
  type: Type.ARRAY,
  items: clauseSchema,
};

const headerSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: { type: Type.NUMBER, description: "A fairness score from 0-100, where 100 is perfectly fair and 0 is highly unfavorable." },
        keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A bulleted list of the 3-5 most critical findings from the entire document." },
    },
    required: ["overallScore", "keyTakeaways"]
};

const comparisonClauseSchema = {
    type: Type.OBJECT,
    properties: {
        changeType: { type: Type.STRING, enum: ['Added', 'Removed', 'Modified', 'Unchanged'] },
        summary: { type: Type.STRING, description: "For 'Modified' clauses, a concise summary of the change. For others, a label like 'Clause Added'." },
        textA: { type: Type.STRING, description: "The full text of the clause from Document A. Should be empty if changeType is 'Added'." },
        textB: { type: Type.STRING, description: "The full text of the clause from Document B. Should be empty if changeType is 'Removed'." },
    },
    required: ["changeType", "summary", "textA", "textB"],
};

const comparisonResultSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.OBJECT,
            properties: {
                added: { type: Type.NUMBER },
                removed: { type: Type.NUMBER },
                modified: { type: Type.NUMBER },
            },
            required: ["added", "removed", "modified"],
        },
        clauses: {
            type: Type.ARRAY,
            items: comparisonClauseSchema,
        },
    },
    required: ["summary", "clauses"],
};


class GeminiService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async initializeChat(analysis: ContractAnalysis): Promise<void> {
    // FIX: Make chat initialization more robust. If keyTakeaways are missing,
    // generate a fallback context from the clause titles.
    let contextSummary: string;
    if (analysis.keyTakeaways && analysis.keyTakeaways.length > 0) {
        contextSummary = analysis.keyTakeaways.map(t => `- ${t}`).join('\n');
    } else {
        const clauseTitles = analysis.clauses.map(c => c.title).slice(0, 10).join(', ');
        contextSummary = `The document contains clauses such as: ${clauseTitles}...`;
    }

    const systemInstruction = `You are a helpful assistant who is an expert in legal documents. The user has just analyzed a document.
Here is a summary of their document:
${contextSummary}

Answer the user's questions about this document in a clear, concise, and helpful manner. Do not provide legal advice.`;

    this.chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
          systemInstruction,
      }
    });
  }

  public async *sendChatMessageStream(message: string): AsyncGenerator<string> {
    if (!this.chat) {
      throw new Error("Chat not initialized.");
    }
    if (!message) {
      throw new Error("Cannot send an empty message.");
    }
    const result = await this.chat.sendMessageStream({ message });
    for await (const chunk of result) {
        yield chunk.text;
    }
  }

  private chunkText(text: string, chunkSize = 4000): string[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        if (paragraph.length > chunkSize) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = '';
            }
            let remainingParagraph = paragraph;
            while (remainingParagraph.length > chunkSize) {
                let splitIndex = remainingParagraph.lastIndexOf(' ', chunkSize);
                if (splitIndex === -1) { 
                    splitIndex = chunkSize;
                }
                chunks.push(remainingParagraph.substring(0, splitIndex));
                remainingParagraph = remainingParagraph.substring(splitIndex).trim();
            }
            currentChunk = remainingParagraph;
            continue;
        }

        if (currentChunk.length + paragraph.length + 2 > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = '';
        }

        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [text];
  }
  
  private buildClausePrompt(chunk: string, options: AnalysisOptions): string {
      return `Analyze the following legal text chunk. Your role is a '${options.persona}'. 
      Identify every distinct clause. For each clause, provide a title, a simple explanation, its risk level, confidence score, and the original text.
      ${options.focus ? `Pay special attention to these topics: ${options.focus}.` : ''}
      The text chunk is:
      ---
      ${chunk}
      ---
      `;
  }
  
  private buildHeaderPrompt(clauses: DecodedClause[], options: AnalysisOptions): string {
      // FIX (Scalability): Send a concise summary of each clause instead of the full text.
      // This prevents the final summarization prompt from exceeding the context window limit.
      const clauseText = clauses.map(c => `Clause: ${c.title}\nRisk: ${c.risk}\nExplanation: ${c.explanation.substring(0, 150)}...`).join('\n\n');
      return `You are acting as a '${options.persona}'. Based on the following analyzed clauses from a legal document, provide a final summary.
      Generate an overall fairness score from 0-100 and a list of the 3-5 most important key takeaways.
      ${options.focus ? `The user was specifically interested in: ${options.focus}.` : ''}
      
      Here are the clauses:
      ---
      ${clauseText}
      ---
      `;
  }

  public async *decodeContractStream(contractText: string, options: AnalysisOptions): AsyncGenerator<AnalysisStreamEvent> {
    // FIX (Security): Sanitize all user-provided inputs to mitigate prompt injection.
    const sanitizedContractText = sanitizeInput(contractText);
    const sanitizedOptions: AnalysisOptions = {
        ...options,
        focus: sanitizeInput(options.focus),
    };

    const chunks = this.chunkText(sanitizedContractText);
    const totalChunks = chunks.length;
    let processedChunks = 0;
    const allClauses: DecodedClause[] = [];

    yield { type: 'progress', data: { current: 0, total: totalChunks } };
    
    // FIX: Process chunks sequentially to provide accurate, smooth progress updates.
    // The previous implementation using .map() and a for...of loop over promises
    // started all requests in parallel, causing progress updates to be batched
    // and misleadingly fast. This new loop ensures one chunk is processed at a time.
    for (const chunk of chunks) {
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: this.buildClausePrompt(chunk, sanitizedOptions),
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: analysisSchema,
                },
            });
            const clauses = JSON.parse(response.text) as DecodedClause[];
            for (const clause of clauses) {
                allClauses.push(clause);
                yield { type: 'clause', data: clause };
            }
        } catch(e) {
            // FIX: Prevent silent data loss. If a chunk fails, abort the entire analysis
            // and throw an error to be displayed to the user. This ensures data integrity.
            console.error("Failed to process a contract chunk:", e);
            throw new Error(`Analysis failed while processing a part of the document. The results shown are incomplete.`);
        } finally {
            processedChunks++;
            yield { type: 'progress', data: { current: processedChunks, total: totalChunks } };
        }
    }


    if (allClauses.length > 0) {
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: this.buildHeaderPrompt(allClauses, sanitizedOptions),
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: headerSchema,
                }
            });
            yield { type: 'header', data: JSON.parse(response.text) };
        } catch (e) {
            console.error("Failed to generate analysis header:", e);
            // If the header fails, the user still has the clauses. We can allow this to fail gracefully.
            // But we should still inform the user. We will throw a less severe error.
            throw new Error('Could not generate the final summary, but the clause breakdown is available.');
        }
    }
  }

  public async compareDocuments(docA: string, docB: string): Promise<ComparisonResult> {
      // FIX (Security): Sanitize all user-provided inputs to mitigate prompt injection.
      const sanitizedDocA = sanitizeInput(docA);
      const sanitizedDocB = sanitizeInput(docB);

      const prompt = `You are a meticulous legal document comparison tool. Compare Document A and Document B clause by clause.
      - Identify every clause that has been added, removed, or modified.
      - For modified clauses, provide a brief, neutral summary of the change.
      - Also include clauses that are unchanged for complete context.
      - Structure the entire output as a single JSON object adhering to the provided schema.

      Document A:
      ---
      ${sanitizedDocA}
      ---

      Document B:
      ---
      ${sanitizedDocB}
      ---
      `;

      const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
              responseMimeType: 'application/json',
              responseSchema: comparisonResultSchema,
          },
      });

      return JSON.parse(response.text) as ComparisonResult;
  }
}

export const geminiService = new GeminiService();