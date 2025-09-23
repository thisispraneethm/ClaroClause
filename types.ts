export enum RiskLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Unknown = 'Unknown'
}

export interface DecodedClause {
  // A unique ID and occurrence index are added to each clause for robust citation.
  id: string;
  occurrenceIndex: number;
  title: string;
  explanation: string;
  risk: RiskLevel;
  originalClause: string;
  confidence: 'High' | 'Medium' | 'Low';
  goodToKnow?: boolean;
}

export interface ContractAnalysis {
  documentTitle: string;
  overallScore: number;
  keyTakeaways: string[];
  clauses: DecodedClause[];
}

export type HeaderAnalysis = Omit<ContractAnalysis, 'clauses'>;

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  error?: string;
  originalMessage?: string; // Used to resend the original message on error.
}

export type AnalysisPersona = 'layperson' | 'business_owner' | 'lawyer' | 'first_home_buyer' | 'explain_like_im_five';

export interface AnalysisOptions {
  persona: AnalysisPersona;
  focus: string;
}

// --- Stream Event Types ---

export interface ProgressEvent {
  type: 'progress';
  data: {
    current: number;
    total: number;
  };
}

export interface ClauseEvent {
  type: 'clause';
  data: DecodedClause;
}

export interface HeaderEvent {
  type: 'header';
  data: HeaderAnalysis;
}

export type AnalysisStreamEvent = ProgressEvent | ClauseEvent | HeaderEvent;

// --- Comparison Types ---

export enum ChangeType {
    Added = 'Added',
    Removed = 'Removed',
    Modified = 'Modified',
    Unchanged = 'Unchanged',
}

export interface ComparedClause {
    changeType: ChangeType;
    summary: string;
    textA: string;
    textB: string;
}

export interface ComparisonResult {
    summary: {
        added: number;
        removed: number;
        modified: number;
    };
    clauses: ComparedClause[];
}

// --- Re-analysis Types ---
export interface RephrasedClause {
    id: string;
    newExplanation: string;
}