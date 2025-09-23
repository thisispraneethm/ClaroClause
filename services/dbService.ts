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
    // FIX: Refactored database versioning to use the standard chained `version()` pattern.
    // This is the correct, industry-standard way to declare schemas and migrations in Dexie,
    // improving code clarity and ensuring robust, predictable database upgrades.
    // FIX: Added (this as Dexie) type assertion to resolve TypeScript error where 'version' method was not found on the subclass.
    (this as Dexie).version(1).stores({
      analyses: '++id, createdAt'
    });
    (this as Dexie).version(2).stores({
      analyses: '++id, createdAt', // Indexed fields must be kept in new versions
    }).upgrade(tx => {
        // Migration logic handles old data that doesn't have the chatHistory property.
        return tx.table('analyses').toCollection().modify(analysis => {
            if (analysis.chatHistory === undefined) {
                analysis.chatHistory = [];
            }
        });
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

/**
 * Updates the chat history for a specific analysis.
 * @returns {Promise<boolean>} - True if the update was successful, false otherwise.
 */
export async function updateChatHistory(id: number, chatHistory: ChatMessage[]): Promise<boolean> {
    const updatedCount = await db.analyses.update(id, { chatHistory });
    return updatedCount > 0;
}

export async function clearAnalysisHistory(): Promise<void> {
    await db.analyses.clear();
}

/**
 * Updates the analysis and options for a specific record.
 * @returns {Promise<boolean>} - True if the update was successful, false otherwise.
 */
export async function updateAnalysis(id: number, analysis: ContractAnalysis, options: AnalysisOptions): Promise<boolean> {
    const updatedCount = await db.analyses.update(id, { analysis, options });
    return updatedCount > 0;
}