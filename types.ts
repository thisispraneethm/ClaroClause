export enum RiskLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Unknown = 'Unknown'
}

export interface DecodedClause {
  title: string;
  explanation: string;
  risk: RiskLevel;
  originalClause: string;
  confidence: 'High' | 'Medium' | 'Low';
  goodToKnow?: boolean;
}

export interface ContractAnalysis {
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
  originalMessage?: string; // FIX: Added to support retry functionality
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