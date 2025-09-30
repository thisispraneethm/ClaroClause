import React, { useLayoutEffect, useState, useRef, useCallback } from 'react';
import type { ContractAnalysis, AnalysisOptions, AnalysisPersona } from '../../types';
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
import { MessageSquarePlusIcon } from '../icons/MessageSquarePlusIcon';
import { PersonaSelector } from '../PersonaSelector';

interface AnalyzeViewProps {
  onAnalyze: (text: string, options: AnalysisOptions) => void;
  analysis: ContractAnalysis | null;
  contractText: string;
  setContractText: (text: string) => void;
  isLoading: boolean;
  isRephrasing: boolean;
  error: string | null;
  onStartNew: () => void;
  progress: { current: number; total: number } | null;
  analysisOptions: AnalysisOptions | null;
  citedClause: { text: string; occurrence: number } | null;
  onSetError: (message: string) => void;
  onClearError: () => void;
  onAskAboutClause: (clauseText: string) => void;
  onRephrase: (newPersona: AnalysisPersona) => void;
}

type AnalysisStep = 'input' | 'enhance' | 'processing';

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
const HighlightableText: React.FC<{ text: string, highlight: { text: string; occurrence: number } | null }> = ({ text, highlight }) => {
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
};

/**
 * BUG FIX: Correctly memoized the `HighlightableText` component.
 * By providing a custom equality check function to `React.memo`, we ensure the component
 * only re-renders when the actual text or highlight content changes. This prevents
 * costly re-renders of the entire document on every mouse movement, fixing a major
 * performance bottleneck.
 */
const MemoizedHighlightableText = React.memo(HighlightableText, (prevProps, nextProps) => {
    if (prevProps.text !== nextProps.text) return false;
    if (prevProps.highlight?.text !== nextProps.highlight?.text) return false;
    if (prevProps.highlight?.occurrence !== nextProps.highlight?.occurrence) return false;
    return true;
});


export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ onAnalyze, analysis, contractText, setContractText, isLoading, isRephrasing, error, onStartNew, progress, analysisOptions, citedClause, onSetError, onClearError, onAskAboutClause, onRephrase }) => {
  const [step, setStep] = React.useState<AnalysisStep>('input');
  const [hoveredClause, setHoveredClause] = React.useState<{ text: string | null, occurrence: number | null }>({ text: null, occurrence: null });
  const debouncedHoveredClause = useDebounce(hoveredClause, 300);
  const documentContainerRef = React.useRef<HTMLDivElement>(null);
  const [askButtonPosition, setAskButtonPosition] = useState<{ top: number; right: number } | null>(null);
  
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
  
  const handleClauseHover = useCallback((text: string | null, occurrence: number | null) => {
    setHoveredClause({ text, occurrence });
  }, []);

  React.useEffect(() => {
    if (!analysis && !isLoading) {
      setStep('input');
    }
  }, [analysis, isLoading]);

  useLayoutEffect(() => {
    if (highlightTarget.text && documentContainerRef.current) {
        const container = documentContainerRef.current;
        const markElement = container.querySelector('mark');
        if (markElement) {
            markElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
            const containerRect = container.getBoundingClientRect();
            const markRect = markElement.getBoundingClientRect();
            setAskButtonPosition({
                top: markRect.top - containerRect.top + container.scrollTop,
                right: container.clientWidth - (markRect.right - containerRect.left) + 8,
            });
        } else {
            setAskButtonPosition(null);
        }
    } else {
        setAskButtonPosition(null);
    }
  }, [highlightTarget]);

  if (analysis) {
    return (
      <div className="h-full flex flex-col">
          {error && (
            <div className="relative p-4 m-6 mb-0 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20">
                <div className="flex items-start pr-8">
                    <InfoIcon className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold">Analysis Error</h4>
                        <p className="mt-1 opacity-90">{error}</p>
                    </div>
                </div>
                <button onClick={onClearError} aria-label="Clear error" className="absolute top-3 right-3 p-1 rounded-full hover:bg-destructive/30 transition-colors">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
           )}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
              <div className="flex flex-col overflow-hidden glass-panel rounded-xl relative border border-border/50">
                  <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
                      <h2 className="text-sm font-semibold text-foreground truncate pr-4">{analysis.documentTitle}</h2>
                       <button 
                         onClick={onStartNew}
                         className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full text-muted-foreground bg-secondary/50 hover:bg-secondary hover:text-foreground transition-colors border border-border"
                       >
                         <ClipboardListIcon className="w-3 h-3"/>
                         Analyze New Document
                       </button>
                  </div>
                  <div ref={documentContainerRef} className="p-4 text-sm text-muted-foreground overflow-y-auto font-mono whitespace-pre-wrap flex-1 bg-background/50 relative">
                      <MemoizedHighlightableText text={contractText} highlight={highlightTarget} />
                  </div>

                  <AnimatePresence>
                    {askButtonPosition && highlightTarget.text && (
                        <motion.button
                            onClick={() => onAskAboutClause(highlightTarget.text!)}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="absolute z-20 flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/80 transition-transform hover:scale-105"
                            style={{ top: askButtonPosition.top, right: askButtonPosition.right }}
                            aria-label="Ask about this clause"
                        >
                            <MessageSquarePlusIcon className="w-3.5 h-3.5" />
                            Ask
                        </motion.button>
                    )}
                  </AnimatePresence>
              </div>
              <div className="overflow-y-auto pr-1 pb-4">
                 {analysisOptions && <PersonaSelector currentPersona={analysisOptions.persona} onPersonaChange={onRephrase} isRephrasing={isRephrasing}/>}
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
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-card-foreground font-serif">
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
                    <div className="relative mb-4 text-left text-destructive bg-destructive/10 p-3 pl-4 pr-10 rounded-lg w-full max-w-4xl animate-fade-in text-sm border border-destructive/20">
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
        <div className="mt-8 text-center text-destructive bg-destructive/10 p-4 rounded-lg w-full max-w-4xl animate-fade-in border border-destructive/20">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};