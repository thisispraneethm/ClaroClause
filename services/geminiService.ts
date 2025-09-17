import { GoogleGenAI, Type, Chat } from '@google/genai';
import { MAX_COMPARE_TEXT_LENGTH } from '../constants';
import type { AnalysisOptions, AnalysisStreamEvent, ContractAnalysis, DecodedClause, ComparisonResult } from '../types';
import { RiskLevel } from '../types';

/**
 * A targeted sanitization function to mitigate prompt injection.
 * This function is designed to be less destructive than a generic sanitizer. It removes
 * characters like backticks, which are uncommon in legal text but are used to execute
 * code or change formatting in prompts, while preserving common legal punctuation.
 */
function sanitizeInput(text: string): string {
    // Removes backticks and some markdown characters. Preserves `[]` and `_` which can be valid.
    return text.replace(/[`#*]/g, '');
}

/**
 * FIX: Added a validation layer for AI-generated clause data.
 * This function ensures that the data structure conforms to the application's expectations,
 * preventing crashes from unexpected or malformed API responses (e.g., an invalid 'risk' enum value).
 * It provides safe default values for missing or invalid fields.
 */
function validateClause(partialClause: any): Omit<DecodedClause, 'id' | 'occurrenceIndex'> {
    const riskValues = Object.values(RiskLevel);
    const confidenceValues = ['High', 'Medium', 'Low'];

    // Ensure risk is a valid enum value, otherwise default to 'Unknown'.
    const validatedRisk = partialClause.risk && riskValues.includes(partialClause.risk)
        ? partialClause.risk
        : RiskLevel.Unknown;

    // Ensure confidence is a valid enum value, otherwise default to 'Low'.
    const validatedConfidence = partialClause.confidence && confidenceValues.includes(partialClause.confidence)
        ? partialClause.confidence
        : 'Low';
    
    return {
        title: typeof partialClause.title === 'string' ? partialClause.title : "Untitled Clause",
        explanation: typeof partialClause.explanation === 'string' ? partialClause.explanation : "No explanation provided.",
        risk: validatedRisk,
        originalClause: typeof partialClause.originalClause === 'string' ? partialClause.originalClause : "",
        confidence: validatedConfidence,
        goodToKnow: partialClause.goodToKnow === true, // Coerce to boolean
    };
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
        documentTitle: { type: Type.STRING, description: "A concise, descriptive title for the entire document, based on its content. E.g., 'Apartment Lease Agreement'." },
        overallScore: { type: Type.NUMBER, description: "A fairness score from 0-100, where 100 is perfectly fair and 0 is highly unfavorable." },
        keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A bulleted list of the 3-5 most critical findings from the entire document." },
    },
    required: ["documentTitle", "overallScore", "keyTakeaways"]
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
  private streamAbortController: AbortController | null = null;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public cancelOngoingStreams = () => {
    if (this.streamAbortController) {
      this.streamAbortController.abort();
      this.streamAbortController = null;
    }
  };

  public async initializeChat(analysis: ContractAnalysis): Promise<void> {
    const contextSummary = (analysis.keyTakeaways && analysis.keyTakeaways.length > 0)
        ? analysis.keyTakeaways.map(t => `- ${t}`).join('\n')
        : `The document contains ${analysis.clauses.length} clauses.`;
    
    const clauseContext = analysis.clauses.map(c => `Clause ID: ${c.id}, Title: "${c.title}"`).join('\n');

    const systemInstruction = `You are a helpful assistant who is an expert in legal documents. The user has just analyzed a document titled "${analysis.documentTitle}".
Here is a summary of their document:
${contextSummary}

Here is a list of the clause IDs and titles from the document:
---
${clauseContext}
---

Answer the user's questions about this document in a clear, concise, and helpful manner. When your answer is based on specific clauses, you MUST cite them by referencing their unique ID in brackets, like this: [Citation: clause-ID-goes-here]. This is mandatory for accuracy and verifiability. Do not provide legal advice.`;

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
    
    // FIX: Sanitize user input to mitigate prompt injection.
    const sanitizedMessage = sanitizeInput(message);

    this.cancelOngoingStreams();
    this.streamAbortController = new AbortController();
    const signal = this.streamAbortController.signal;

    try {
        const result = await this.chat.sendMessageStream({ message: sanitizedMessage });
        for await (const chunk of result) {
            if (signal.aborted) { 
                console.log("Chat stream aborted.");
                throw new DOMException('Stream aborted by user', 'AbortError');
            }
            yield chunk.text;
        }
    } finally {
        this.streamAbortController = null;
    }
  }

  public async *draftDocumentStream(prompt: string): AsyncGenerator<string> {
    if (!prompt) {
      throw new Error("Cannot send an empty prompt.");
    }
    // FIX: Sanitize user input to mitigate prompt injection.
    const sanitizedPrompt = sanitizeInput(prompt);
    
    const fullPrompt = `You are an AI legal assistant. A user wants to draft a document.
    Prompt: "${sanitizedPrompt}"
    Based on the prompt, generate a well-structured document. If the prompt is ambiguous, create a standard version of the requested document.`;

    this.cancelOngoingStreams();
    this.streamAbortController = new AbortController();
    const signal = this.streamAbortController.signal;

    try {
        const result = await this.ai.models.generateContentStream({ 
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });
        for await (const chunk of result) {
            if (signal.aborted) {
                console.log("Draft stream aborted.");
                throw new DOMException('Stream aborted by user', 'AbortError');
            }
            yield chunk.text;
        }
    } finally {
        this.streamAbortController = null;
    }
  }

  private chunkText(text: string, chunkSize = 4000): string[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();
        if (trimmedParagraph.length === 0) continue;

        if (trimmedParagraph.length > chunkSize) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = '';
            }
            let remainingPara = trimmedParagraph;
            while (remainingPara.length > chunkSize) {
                let splitIndex = remainingPara.lastIndexOf('. ', chunkSize);
                if (splitIndex === -1) { 
                    splitIndex = remainingPara.lastIndexOf(' ', chunkSize);
                }
                if (splitIndex === -1) { 
                    splitIndex = chunkSize;
                }
                chunks.push(remainingPara.substring(0, splitIndex + 1));
                remainingPara = remainingPara.substring(splitIndex + 1).trim();
            }
            currentChunk = remainingPara;
            continue;
        }

        if (currentChunk.length + trimmedParagraph.length + 2 > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = '';
        }

        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + trimmedParagraph;
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
      const clauseText = clauses.map(c => `Clause: ${c.title} (Risk: ${c.risk})`).join('\n');
      return `You are acting as a '${options.persona}'. Based on the following list of analyzed clauses from a legal document, provide a final summary.
      Generate a document title, an overall fairness score from 0-100 and a list of the 3-5 most important key takeaways.
      ${options.focus ? `The user was specifically interested in: ${options.focus}.` : ''}
      
      Here are the clauses:
      ---
      ${clauseText}
      ---
      `;
  }

  public async *decodeContractStream(contractText: string, options: AnalysisOptions): AsyncGenerator<AnalysisStreamEvent> {
    const sanitizedContractText = sanitizeInput(contractText);
    const sanitizedOptions: AnalysisOptions = {
        ...options,
        focus: sanitizeInput(options.focus),
    };

    this.cancelOngoingStreams();
    this.streamAbortController = new AbortController();
    const signal = this.streamAbortController.signal;

    try {
        const chunks = this.chunkText(sanitizedContractText);
        const totalChunks = chunks.length;
        let processedChunks = 0;
        const allClauses: DecodedClause[] = [];
        
        const clauseOccurrences: { [key: string]: number } = {};

        yield { type: 'progress', data: { current: 0, total: totalChunks } };
        
        for (const chunk of chunks) {
            if (signal.aborted) {
                console.warn("Analysis stream aborted by user action.");
                throw new DOMException('Stream aborted by user', 'AbortError');
            }
            try {
                const response = await this.ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: this.buildClausePrompt(chunk, sanitizedOptions),
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: analysisSchema,
                    },
                });
                const responseText = response.text?.trim();
                if (!responseText) {
                    console.warn("Received empty response for a chunk, skipping.");
                    continue;
                }
                
                // FIX: Instead of casting directly, parse and then validate each item.
                // This makes the application resilient to malformed or incomplete data from the AI.
                const parsedData = JSON.parse(responseText);
                const partialClauses = Array.isArray(parsedData) ? parsedData : [];

                for (const rawClause of partialClauses) {
                    const partialClause = validateClause(rawClause);

                    // Do not add clauses with no original text, as they are likely parsing errors.
                    if (!partialClause.originalClause) continue;

                    const text = partialClause.originalClause;
                    const count = clauseOccurrences[text] || 0;
                    clauseOccurrences[text] = count + 1;
                    
                    const clause: DecodedClause = {
                        ...partialClause,
                        id: `clause-${allClauses.length}`,
                        occurrenceIndex: count,
                    };

                    allClauses.push(clause);
                    yield { type: 'clause', data: clause };
                }
            } catch(e) {
                if (e instanceof Error && e.name === 'AbortError') throw e; 
                console.error("Failed to process a contract chunk:", e);
                throw new Error(`Analysis failed while processing a part of the document. The results shown are incomplete.`);
            } finally {
                processedChunks++;
                yield { type: 'progress', data: { current: processedChunks, total: totalChunks } };
            }
        }

        if (signal.aborted) { throw new DOMException('Stream aborted by user', 'AbortError'); }

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
                throw new Error('Could not generate the final summary, but the clause breakdown is available.');
            }
        }
    } finally {
        this.streamAbortController = null;
    }
  }

  public async compareDocuments(docA: string, docB: string): Promise<ComparisonResult> {
      if (docA.length + docB.length > MAX_COMPARE_TEXT_LENGTH) {
          throw new Error(`The combined size of the documents is too large to be compared at once. Please shorten one or both documents and try again.`);
      }

      // FIX: Removed the misleading AbortController logic. The generateContent API call
      // is not cancellable, so pretending it is creates confusion and incorrect assumptions.
      // The component logic has been updated to handle unmounts correctly without this.
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