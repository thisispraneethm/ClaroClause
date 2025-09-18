import React from 'react';
import type { ContractAnalysis, AnalysisOptions } from '../../types';
import { ContractInput } from '../ContractInput';
import { ExampleContracts } from '../ExampleContracts';
import { SummaryHeader } from '../SummaryHeader';
import { SummaryDisplay } from '../SummaryDisplay';
import { Loader } from '../Loader';
import { PromptEnhancer } from '../PromptEnhancer';
import { LockIcon } from '../icons/LockIcon';
import { XIcon } from '../icons/XIcon';
import { InfoIcon } from '../icons/InfoIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';

interface AnalyzeViewProps {
  onAnalyze: (text: string, options: AnalysisOptions) => void;
  analysis: ContractAnalysis | null;
  contractText: string;
  setContractText: (text: string) => void;
  isLoading: boolean;
  error: string | null;
  onStartNew: () => void;
  progress: { current: number; total: number } | null;
  analysisOptions: AnalysisOptions | null;
  citedClause: { text: string; occurrence: number } | null;
  onSetError: (message: string) => void;
  onClearError: () => void;
}

type AnalysisStep = 'input' | 'enhance' | 'processing';

// A custom hook to debounce a value.
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// Trust Pillar 1: Verifiability - This component highlights text for citations.
const HighlightableText: React.FC<{ text: string, highlight: { text: string; occurrence: number } | null }> = React.memo(({ text, highlight }) => {
    if (!highlight || !highlight.text || !text.includes(highlight.text)) {
        return <>{text}</>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let occurrenceCounter = 0;
    let key = 0;

    while (lastIndex < text.length) {
        const index = text.indexOf(highlight.text, lastIndex);
        if (index === -1) {
            parts.push(text.substring(lastIndex));
            break;
        }

        if (index > lastIndex) {
            parts.push(<React.Fragment key={`text-${key++}`}>{text.substring(lastIndex, index)}</React.Fragment>);
        }
        
        if (occurrenceCounter === highlight.occurrence) {
             parts.push(
                <mark key={`highlight-${key++}`} className="transition-all duration-300">
                    {highlight.text}
                </mark>
            );
        } else {
            parts.push(<React.Fragment key={`match-${key++}`}>{highlight.text}</React.Fragment>);
        }

        occurrenceCounter++;
        lastIndex = index + highlight.text.length;
    }

    return <>{parts}</>;
});


export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ onAnalyze, analysis, contractText, setContractText, isLoading, error, onStartNew, progress, analysisOptions, citedClause, onSetError, onClearError }) => {
  const [step, setStep] = React.useState<AnalysisStep>('input');
  const [hoveredClause, setHoveredClause] = React.useState<{ text: string | null, occurrence: number | null }>({ text: null, occurrence: null });
  const debouncedHoveredClause = useDebounce(hoveredClause, 300);
  const documentContainerRef = React.useRef<HTMLDivElement>(null);
  
  const [currentAnalysisOptions, setCurrentAnalysisOptions] = React.useState<AnalysisOptions>(
      analysisOptions || { persona: 'layperson', focus: '' }
  );

  const highlightTarget = citedClause || debouncedHoveredClause;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContractText(e.target.value);
  };
  
  const handleFileSelect = (fileContent: string) => {
    onClearError();
    setContractText(fileContent);
  };

  const handleSelectExample = (text: string) => {
    onClearError();
    setContractText(text);
  };
  
  const handleClearText = () => {
    onClearError();
    setContractText('');
  }
  
  const handleProceedToEnhance = () => {
    onClearError();
    setStep('enhance');
  };

  const handleStartAnalysis = (options: AnalysisOptions) => {
    onClearError();
    setCurrentAnalysisOptions(options); 
    setStep('processing');
    onAnalyze(contractText, options);
  };
  
  const handleClauseHover = (text: string | null, occurrence: number | null) => {
    setHoveredClause({ text, occurrence });
  };

  React.useEffect(() => {
    if (!analysis && !isLoading) {
      setStep('input');
    }
  }, [analysis, isLoading]);

  React.useEffect(() => {
    if ((debouncedHoveredClause.text || citedClause) && documentContainerRef.current) {
        const container = documentContainerRef.current;
        const markElement = container.querySelector('mark');
        if (markElement) {
            markElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }
  }, [debouncedHoveredClause, citedClause]);

  if (analysis) {
    return (
      <div className="h-full flex flex-col">
          {error && (
            <div className="relative p-4 m-6 mb-0 bg-destructive/10 text-destructive-foreground rounded-lg text-sm border border-destructive/20">
                <div className="flex items-start pr-8">
                    <InfoIcon className="w-5 h-5 mr-3 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold">Analysis Incomplete</h4>
                        <p className="mt-1 opacity-90">{error}</p>
                    </div>
                </div>
                <button onClick={onClearError} aria-label="Clear error" className="absolute top-3 right-3 p-1 rounded-full hover:bg-destructive/30 transition-colors">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
           )}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
              <div className="flex flex-col overflow-hidden glass-panel rounded-xl">
                  <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
                      <h2 className="text-sm font-semibold text-foreground truncate pr-4">{analysis.documentTitle}</h2>
                       <button 
                         onClick={onStartNew}
                         className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full text-muted-foreground bg-secondary/50 hover:bg-secondary hover:text-foreground transition-colors border border-border"
                       >
                         <ClipboardListIcon className="w-3 h-3"/>
                         Analyze New
                       </button>
                  </div>
                  <div ref={documentContainerRef} className="p-4 text-sm text-muted-foreground overflow-y-auto font-mono whitespace-pre-wrap flex-1 bg-background/50">
                      <HighlightableText text={contractText} highlight={highlightTarget} />
                  </div>
              </div>
              <div className="overflow-y-auto pr-1">
                 {analysis.keyTakeaways.length > 0 && <SummaryHeader analysis={analysis} />}
                 <SummaryDisplay 
                    clauses={analysis.clauses} 
                    isLoading={isLoading && !progress}
                    onClauseHover={handleClauseHover}
                 />
              </div>
          </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center min-h-full">
      <AnimatePresence mode="wait">
        <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="w-full flex flex-col items-center"
        >
          {step === 'input' && (
            <>
              <div className="w-full max-w-4xl text-center">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-card-foreground font-serif">
                  Analyze Document
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Paste any contract, policy, or legal text below. Our AI will give you a simple, plain-English summary.
                </p>
                <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-risk-low">
                  <LockIcon className="h-4 w-4" />
                  <span>Your documents are processed and stored locally in your browser.</span>
                </div>
              </div>
              <div className="w-full max-w-4xl mt-8">
                {error && (
                    <div className="relative mb-4 text-left text-destructive-foreground bg-destructive/20 p-3 pl-4 pr-10 rounded-lg w-full max-w-4xl animate-fade-in text-sm border border-destructive/30">
                        <p>{error}</p>
                        <button onClick={onClearError} aria-label="Clear error" className="absolute top-1/2 right-2 -translate-y-1/2 p-1 rounded-full hover:bg-destructive/30 transition-colors">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <ContractInput
                  value={contractText}
                  onChange={handleInputChange}
                  onFileSelect={handleFileSelect}
                  onDecode={handleProceedToEnhance}
                  isLoading={isLoading}
                  onError={onSetError}
                  onClear={handleClearText}
                />
                <ExampleContracts onSelect={handleSelectExample} />
              </div>
            </>
          )}
          {step === 'enhance' && (
            <PromptEnhancer 
                onBack={() => setStep('input')} 
                onAnalyze={handleStartAnalysis} 
                options={currentAnalysisOptions}
                onOptionsChange={setCurrentAnalysisOptions}
            />
          )}
          {step === 'processing' && <Loader progress={progress} />}
        </motion.div>
      </AnimatePresence>
      {error && step === 'processing' && !analysis && (
        <div className="mt-8 text-center text-destructive-foreground bg-destructive/20 p-4 rounded-lg w-full max-w-4xl animate-fade-in border border-destructive/30">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};