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
                <mark key={`highlight-${key++}`} className="bg-primary/30 text-primary-foreground rounded transition-all duration-300">
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


export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ onAnalyze, analysis, contractText, setContractText, isLoading, error, onStartNew, progress, analysisOptions, citedClause }) => {
  const [step, setStep] = React.useState<AnalysisStep>('input');
  const [hoveredClause, setHoveredClause] = React.useState<{ text: string | null, occurrence: number | null }>({ text: null, occurrence: null });
  const debouncedHoveredClause = useDebounce(hoveredClause, 300);
  const documentContainerRef = React.useRef<HTMLDivElement>(null);
  
  const [inputError, setInputError] = React.useState<string | null>(null);

  const [currentAnalysisOptions, setCurrentAnalysisOptions] = React.useState<AnalysisOptions>(
      analysisOptions || { persona: 'layperson', focus: '' }
  );

  const highlightTarget = citedClause || debouncedHoveredClause;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputError(null);
    setContractText(e.target.value);
  };
  
  const handleFileSelect = (fileContent: string) => {
    setInputError(null);
    setContractText(fileContent);
  };

  const handleSelectExample = (text: string) => {
    setInputError(null);
    setContractText(text);
  };
  
  const handleClearText = () => {
    setInputError(null);
    setContractText('');
  }
  
  const handleProceedToEnhance = () => {
    setInputError(null);
    setStep('enhance');
  };

  const handleStartAnalysis = (options: AnalysisOptions) => {
    setInputError(null);
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
        // Query for the generic `mark` tag. Since only one highlight is active
        // at a time, this is safe and avoids using a non-unique ID.
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
            <div className="flex items-start p-4 m-6 mb-0 bg-destructive/80 text-destructive-foreground rounded-lg text-sm">
                <InfoIcon className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold">Analysis Incomplete</h4>
                    <p className="mt-1">{error}</p>
                </div>
            </div>
           )}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
              <div className="flex flex-col overflow-hidden bg-black/5 backdrop-blur-md rounded-lg border border-white/20 shadow-glass">
                  <div className="flex items-center justify-between p-3 border-b border-white/10">
                      <h2 className="text-sm font-semibold text-foreground">Original Document</h2>
                       <button 
                         onClick={onStartNew}
                         className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md text-muted-foreground hover:bg-white/20 hover:text-foreground transition-colors"
                       >
                         <ClipboardListIcon className="w-3 h-3"/>
                         Analyze Another
                       </button>
                  </div>
                  <div ref={documentContainerRef} className="p-4 text-sm text-muted-foreground overflow-y-auto font-mono whitespace-pre-wrap flex-1 pr-2">
                      <HighlightableText text={contractText} highlight={highlightTarget} />
                  </div>
              </div>
              <div className="overflow-y-auto pr-2">
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
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-violet-600 to-fuchsia-500">
                  Analyze Document
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Paste any contract, policy, or legal text below. Our AI will give you a simple, plain-English summary.
                </p>
                <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-green-600">
                  <LockIcon className="h-4 w-4" />
                  <span>Your document is securely processed and never stored. Ever.</span>
                </div>
              </div>
              <div className="w-full max-w-4xl mt-8">
                {inputError && (
                    <div className="mb-4 text-center text-destructive-foreground bg-destructive/80 p-3 rounded-lg w-full max-w-4xl animate-fade-in text-sm">
                        <p>{inputError}</p>
                    </div>
                )}
                <ContractInput
                  value={contractText}
                  onChange={handleInputChange}
                  onFileSelect={handleFileSelect}
                  onDecode={handleProceedToEnhance}
                  isLoading={isLoading}
                  onError={setInputError}
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
      {error && step !== 'processing' && !analysis && (
        <div className="mt-8 text-center text-destructive-foreground bg-destructive/80 p-4 rounded-lg w-full max-w-4xl animate-fade-in">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};
