import Dexie, { type Table } from 'dexie';
import type { ContractAnalysis, AnalysisOptions, ChatMessage } from '../types';

export interface PersistedAnalysis {
  id?: number;
  documentTitle: string;
  contractText: string;
  analysis: ContractAnalysis;
  options: AnalysisOptions;
  chatHistory: ChatMessage[];
  createdAt: Date;
}

export class ClaroClauseDB extends Dexie {
  analyses!: Table<PersistedAnalysis>;

  constructor() {
    super('ClaroClauseDB');
    // The schema version is updated to include chatHistory.
    (this as Dexie).version(2).stores({
      analyses: '++id, createdAt', // Primary key and index
    }).upgrade(tx => {
        // Migration logic handles old data that doesn't have the chatHistory property.
        return tx.table('analyses').toCollection().modify(analysis => {
            if (!analysis.chatHistory) {
                analysis.chatHistory = [];
            }
        });
    });
    // Original version 1 store for backward compatibility.
    (this as Dexie).version(1).stores({
      analyses: '++id, createdAt'
    });
  }
}

export const db = new ClaroClauseDB();

export async function saveAnalysis(
    contractText: string,
    analysis: ContractAnalysis,
    options: AnalysisOptions,
    chatHistory: ChatMessage[]
): Promise<number | undefined> {
    const id = await db.analyses.add({
        documentTitle: analysis.documentTitle,
        contractText,
        analysis,
        options,
        chatHistory,
        createdAt: new Date(),
    });
    return id;
}

export async function getLatestAnalysis(): Promise<PersistedAnalysis | undefined> {
    return db.analyses.orderBy('createdAt').last();
}

export async function getAllAnalyses(): Promise<PersistedAnalysis[]> {
    return db.analyses.orderBy('createdAt').reverse().toArray();
}

export async function deleteAnalysis(id: number): Promise<void> {
    await db.analyses.delete(id);
}

// Updates the chat history for a specific analysis.
export async function updateChatHistory(id: number, chatHistory: ChatMessage[]): Promise<void> {
    await db.analyses.update(id, { chatHistory });
}

export async function clearAnalysisHistory(): Promise<void> {
    await db.analyses.clear();
}
