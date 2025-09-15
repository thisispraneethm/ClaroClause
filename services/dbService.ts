import Dexie, { type Table } from 'dexie';
import type { ContractAnalysis, AnalysisOptions } from '../types';

export interface PersistedAnalysis {
  id?: number;
  contractText: string;
  analysis: ContractAnalysis;
  options: AnalysisOptions;
  createdAt: Date;
}

export class ClaroClauseDB extends Dexie {
  analyses!: Table<PersistedAnalysis>;

  constructor() {
    super('ClaroClauseDB');
    // FIX: Cast 'this' to the base Dexie class to resolve a TypeScript type inference issue
    // where methods from the base class are not found on the subclass instance.
    (this as Dexie).version(1).stores({
      analyses: '++id, createdAt', // Primary key and index
    });
  }
}

export const db = new ClaroClauseDB();

export async function saveAnalysis(
    contractText: string,
    analysis: ContractAnalysis,
    options: AnalysisOptions
): Promise<void> {
    // For session persistence, we only need to store the latest analysis.
    // Clear any previous entries before adding the new one.
    await db.analyses.clear();
    await db.analyses.add({
        contractText,
        analysis,
        options,
        createdAt: new Date(),
    });
}

export async function getLatestAnalysis(): Promise<PersistedAnalysis | undefined> {
    return db.analyses.orderBy('createdAt').last();
}

export async function clearAnalysisHistory(): Promise<void> {
    await db.analyses.clear();
}
