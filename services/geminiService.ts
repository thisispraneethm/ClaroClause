import { GoogleGenAI, Type, Chat, GenerateContentResponse } from '@google/genai';
import { MAX_COMPARE_TEXT_LENGTH } from '../constants';
import type { AnalysisOptions, AnalysisStreamEvent, ContractAnalysis, DecodedClause, ComparisonResult, RephrasedClause, HeaderAnalysis } from '../types';
import { RiskLevel, CONFIDENCE_LEVELS } from '../types';

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
 * Provides a validation layer for AI-generated clause data. This function ensures
 * that the data structure from the API conforms to the application's expectations,
 * preventing crashes from unexpected or malformed responses (e.g., an invalid 'risk' enum value).
 * It provides safe default values for missing or invalid fields.
 */
function validateClause(partialClause: any): Omit<DecodedClause, 'id' | 'occurrenceIndex'> {
    const riskValues = Object.values(RiskLevel);
    
    // Ensure risk is a valid enum value, otherwise default to 'Unknown'.
    const validatedRisk = partialClause.risk && riskValues.includes(partialClause.risk)
        ? partialClause.risk
        : RiskLevel.Unknown;

    // Ensure confidence is a valid enum value, otherwise default to 'Low'.
    const validatedConfidence = partialClause.confidence && CONFIDENCE_LEVELS.includes(partialClause.confidence)
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
        confidence: { type: Type.STRING, enum: [...CONFIDENCE_LEVELS], description: "The AI's confidence in its analysis of this specific clause." },
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

const rephraseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING, description: "The unique ID of the clause being rephrased." },
            newExplanation: { type: Type.STRING, description: "The new, simple, plain-English explanation of the clause from the new persona's perspective." },
        },
        required: ["id", "newExplanation"]
    }
};


class GeminiService {
  private ai: GoogleGenAI | null = null;
  private chat: Chat | null = null;
  private streamAbortController: AbortController | null = null;
  private requestAbortController: AbortController | null = null;

  constructor() {
    // Constructor is now safe and won't throw on instantiation.
  }
  
  /**
   * Lazily initializes and returns the GoogleGenAI instance.
   * This prevents the app from crashing on startup if the API key is not set,
   * allowing for graceful error handling within the application UI.
   */
  private getAi(): GoogleGenAI {
    if (!this.ai) {
        if (!process.env.API_KEY) {
            // Provide a more user-friendly error message.
            throw new Error("API_KEY environment variable not set. Please configure it to use the application.");
        }
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return this.ai;
  }

  /**
   * Provides a single, robust cancellation method for ALL ongoing AI operations.
   * This unified approach aborts both streaming and non-streaming requests,
   * preventing race conditions and resource leaks when the user navigates away
   * or starts a new action.
   */
  public cancelOngoingOperations = () => {
    if (this.streamAbortController) {
      this.streamAbortController.abort();
      this.streamAbortController = null;
    }
    if (this.requestAbortController) {
      this.requestAbortController.abort();
      this.requestAbortController = null;
    }
  };

  /**
   * Wraps a non-streaming API call with a Promise.race to make it cancellable.
   * This is essential for preventing orphaned requests if the user navigates away.
   */
  private async _cancellableGenerateContent(
    ...args: Parameters<InstanceType<typeof GoogleGenAI>['models']['generateContent']>
  ): Promise<GenerateContentResponse> {
    const localAbortController = new AbortController();
    this.requestAbortController = localAbortController;
    const signal = localAbortController.signal;

    try {
        const abortPromise = new Promise<never>((_, reject) => {
            if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
        const generatePromise = this.getAi().models.generateContent(...args);
        return await Promise.race([generatePromise, abortPromise]);
    } finally {
        if (this.requestAbortController === localAbortController) {
            this.requestAbortController = null;
        }
    }
  }

  /**
   * Centralizes JSON response parsing and validation. This helper checks for common
   * failure modes (like safety blocks) before attempting to parse the JSON,
   * providing clearer, more specific error messages to the user.
   */
  private _parseJsonResponse<T>(response: GenerateContentResponse, errorMessage: string): T {
    const text = response.text?.trim();
    if (!text) {
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY') {
            throw new Error("The request was blocked due to safety concerns. Please modify your input.");
        }
        if (finishReason === 'RECITATION') {
            throw new Error("The response was blocked as it may contain copyrighted material.");
        }
        throw new Error("The AI returned an empty response. It may have been unable to process the request.");
    }
    try {
        const jsonMatch = text.match(/```(json)?\s*([\sS]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[2] : text;
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON:", text);
        throw new Error(errorMessage);
    }
  }

  /**
   * Centralizes error handling for all AI API calls. It checks for common,
   * specific error types like user-initiated cancellation or rate limiting to
   * provide more helpful feedback.
   */
  private _handleApiError(e: unknown, defaultMessage: string): Error {
    if (e instanceof Error) {
        if (e.name === 'AbortError') {
            return e; // Propagate cancellation errors gracefully
        }
        if (e.message.includes('429')) {
            return new Error("Too many requests. Please wait a moment and try again.");
        }
        return new Error(e.message || defaultMessage);
    }
    return new Error(defaultMessage);
  }

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

    this.chat = this.getAi().chats.create({
      model: 'gemini-2.5-flash',
      config: {
          systemInstruction,
      }
    });
  }

  public async *sendChatMessageStream(message: string): AsyncGenerator<string> {
    if (!this.chat) throw new Error("Chat not initialized.");
    if (!message) throw new Error("Cannot send an empty message.");
    
    // This pattern is used to make an otherwise non-cancellable stream cancellable.
    // The AbortController is managed externally by `cancelOngoingOperations`.
    // Inside the loop, we check if a cancellation has been requested.
    this.cancelOngoingOperations();
    const localAbortController = new AbortController();
    this.streamAbortController = localAbortController;
    const signal = localAbortController.signal;

    try {
        const result = await this.chat.sendMessageStream({ message: sanitizeInput(message) });
        for await (const chunk of result) {
            if (signal.aborted) throw new DOMException('Stream aborted by user', 'AbortError');
            yield chunk.text;
        }
    } catch (e) {
        throw this._handleApiError(e, "The AI failed to respond. Please try again.");
    } finally {
        if (this.streamAbortController === localAbortController) this.streamAbortController = null;
    }
  }

  public async *draftDocumentStream(prompt: string): AsyncGenerator<string> {
    if (!prompt) throw new Error("Cannot send an empty prompt.");
    
    const fullPrompt = `You are an AI legal assistant. A user wants to draft a document.
    Prompt: "${sanitizeInput(prompt)}"
    Based on the prompt, generate a well-structured document. If the prompt is ambiguous, create a standard version of the requested document.`;

    // This pattern is used to make an otherwise non-cancellable stream cancellable.
    this.cancelOngoingOperations();
    const localAbortController = new AbortController();
    this.streamAbortController = localAbortController;
    const signal = localAbortController.signal;

    try {
        const result = await this.getAi().models.generateContentStream({ model: 'gemini-2.5-flash', contents: fullPrompt });
        for await (const chunk of result) {
            if (signal.aborted) throw new DOMException('Stream aborted by user', 'AbortError');
            yield chunk.text;
        }
    } catch (e) {
        throw this._handleApiError(e, "An unknown error occurred while drafting.");
    } finally {
        if (this.streamAbortController === localAbortController) this.streamAbortController = null;
    }
  }

  public async *decodeContractStream(text: string, options: AnalysisOptions): AsyncGenerator<AnalysisStreamEvent> {
    const sanitizedText = sanitizeInput(text);

    const chunkSize = 8000;
    const chunks = sanitizedText.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) || [];
    if (chunks.length === 0) throw new Error("The document is empty.");
    
    const personaMap = {
        'layperson': 'a layperson with no legal background',
        'business_owner': 'a small business owner concerned with risk and liability',
        'lawyer': 'a lawyer looking for potential issues and ambiguities',
        'first_home_buyer': 'a first-time home buyer who is unfamiliar with real estate documents',
        'explain_like_im_five': 'a five-year-old child'
    };
    const personaDescription = personaMap[options.persona] || personaMap['layperson'];
    const focus = options.focus ? `The user is particularly interested in clauses related to: ${sanitizeInput(options.focus)}.` : '';
    const failedChunks: string[] = [];

    try {
        const headerPrompt = `Analyze the beginning of the following document to determine its overall nature.
---
DOCUMENT START:
${chunks[0].substring(0, 4000)}
---
DOCUMENT END.
Based on this initial text, provide a concise title for the document, an overall fairness score from 0 to 100, and 3-5 key takeaways. Explain these as if you were talking to ${personaDescription}.`;
        
        const headerResponse = await this._cancellableGenerateContent({
            model: 'gemini-2.5-flash', contents: headerPrompt, config: { responseMimeType: 'application/json', responseSchema: headerSchema }
        });
        const headerJson = this._parseJsonResponse<HeaderAnalysis>(headerResponse, "The AI failed to generate a valid document summary. The document may be malformed or un-analyzable.");
        yield { type: 'header', data: headerJson };

        let occurrenceMap: { [key: string]: number } = {};
        for (let i = 0; i < chunks.length; i++) {
            yield { type: 'progress', data: { current: i + 1, total: chunks.length } };
            const clausePrompt = `You are a legal document analysis expert... For each clause you find, provide a plain-English explanation... Explain it as if you were talking to ${personaDescription}. ${focus}...
---
CHUNK START:
${chunks[i]}
---
CHUNK END.`;
            
            try {
                const clauseResponse = await this.getAi().models.generateContent({ model: 'gemini-2.5-flash', contents: clausePrompt, config: { responseMimeType: 'application/json', responseSchema: analysisSchema }});
                const clausesData = this._parseJsonResponse<any[]>(clauseResponse, `The AI failed to analyze a section of the document (chunk ${i+1}).`);
                
                if (Array.isArray(clausesData)) {
                    for (const item of clausesData) {
                        const validatedItem = validateClause(item);
                        const originalText = validatedItem.originalClause;
                        const currentOccurrence = occurrenceMap[originalText] || 0;
                        occurrenceMap[originalText] = currentOccurrence + 1;
                        yield { type: 'clause', data: { ...validatedItem, id: `clause-${i}-${clausesData.indexOf(item)}`, occurrenceIndex: currentOccurrence } };
                    }
                }
            } catch (chunkError) {
                // HARDENING: Instead of silently continuing, track which chunks failed.
                console.error(`Skipping problematic chunk ${i+1} due to error:`, chunkError);
                failedChunks.push(`section ${i + 1}`);
                continue;
            }
        }
        
        // HARDENING: After the loop, check if any chunks failed. If so, throw a
        // comprehensive error to prevent silent partial analysis failures. This ensures
        // the user is explicitly notified of incomplete results.
        if (failedChunks.length > 0) {
            const message = `Analysis may be incomplete. The AI failed to process ${failedChunks.length} section(s) of the document (${failedChunks.join(', ')}). This can happen with unusual formatting or content.`;
            throw new Error(message);
        }

    } catch(e) {
        throw this._handleApiError(e, "An unknown error occurred during analysis.");
    }
  }

  public async compareDocuments(docA: string, docB: string): Promise<ComparisonResult> {
    if (docA.length + docB.length > MAX_COMPARE_TEXT_LENGTH) {
        throw new Error(`The combined size of the documents is too large. Please shorten them and try again.`);
    }

    const prompt = `You are an expert at comparing legal documents...
---
DOCUMENT A START:
${sanitizeInput(docA)}
DOCUMENT A END.
---
DOCUMENT B START:
${sanitizeInput(docB)}
DOCUMENT B END.
---
`;
    try {
        const response = await this._cancellableGenerateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: comparisonResultSchema }
        });
        return this._parseJsonResponse(response, "The AI failed to generate a valid comparison. The documents may be too dissimilar or malformed.");
    } catch (e) {
        throw this._handleApiError(e, "Failed to compare the documents. Please try again.");
    }
  }
  
  public async rephraseAnalysis(clauses: DecodedClause[], options: AnalysisOptions): Promise<RephrasedClause[]> {
    const personaMap = {
        'layperson': 'a layperson with no legal background',
        'business_owner': 'a small business owner concerned with risk and liability',
        'lawyer': 'a lawyer looking for potential issues and ambiguities',
        'first_home_buyer': 'a first-time home buyer who is unfamiliar with real estate documents',
        'explain_like_im_five': 'a five-year-old child'
    };
    const personaDescription = personaMap[options.persona] || personaMap['layperson'];
    const focus = options.focus ? `The user is particularly interested in clauses related to: ${sanitizeInput(options.focus)}.` : '';

    const clausesToRephrase = clauses.map(c => ({ id: c.id, originalClause: c.originalClause, title: c.title }));

    const prompt = `You are a legal document analysis expert... re-explain the clauses from a different perspective.
Your new persona: Explain everything as if you were talking to ${personaDescription}.
User's focus: ${focus}
Clauses to re-explain:
${JSON.stringify(clausesToRephrase, null, 2)}
`;
    try {
        const response = await this._cancellableGenerateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: rephraseSchema }
        });
        const rephrasedData = this._parseJsonResponse<RephrasedClause[]>(response, "The AI failed to re-analyze the clauses. Please try again.");
        if (!Array.isArray(rephrasedData)) throw new Error("AI response was not a valid array.");
        return rephrasedData;
    } catch (e) {
        throw this._handleApiError(e, "The AI failed to re-analyze the clauses. Please try again.");
    }
  }
}

export const geminiService = new GeminiService();