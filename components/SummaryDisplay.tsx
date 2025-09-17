import React from 'react';
import type { DecodedClause } from '../types';
import { RiskLevel } from '../types';
import { InfoIcon } from './icons/InfoIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { CopyIcon } from './icons/CopyIcon';
import { ShieldAlertIcon } from './icons/ShieldAlertIcon';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { motion, AnimatePresence, Variants } from 'framer-motion';

const riskStyles: { [key in RiskLevel]: { textColorClass: string; borderColorClass: string; icon: React.FC<React.SVGProps<SVGSVGElement>> } } = {
  [RiskLevel.High]: { textColorClass: 'text-risk-high', borderColorClass: 'border-risk-high', icon: ShieldAlertIcon },
  [RiskLevel.Medium]: { textColorClass: 'text-risk-medium', borderColorClass: 'border-risk-medium', icon: InfoIcon },
  [RiskLevel.Low]: { textColorClass: 'text-risk-low', borderColorClass: 'border-risk-low', icon: CheckCircleIcon },
  [RiskLevel.Unknown]: { textColorClass: 'text-muted-foreground', borderColorClass: 'border-muted', icon: InfoIcon },
};

const ClauseCard: React.FC<{ clause: DecodedClause; onHover: (clauseText: string | null, occurrence: number | null) => void; }> = ({ clause, onHover }) => {
  const [isOriginalVisible, setIsOriginalVisible] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<'Copy' | 'Copied!' | 'Failed!'>('Copy');
  // FIX: A ref to hold the timer ID. This prevents memory leaks by allowing
  // the timeout to be cleared if the component unmounts before it fires.
  const copyTimeoutRef = React.useRef<number | null>(null);

  // FIX: The cleanup function returned by useEffect will now clear any pending
  // timeouts, preventing state updates on an unmounted component.
  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);


  const handleToggleOriginal = () => setIsOriginalVisible(!isOriginalVisible);

  const handleCopy = () => {
    // FIX: Clear any existing timeout before setting a new one.
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    navigator.clipboard.writeText(clause.originalClause).then(() => {
        setCopyStatus('Copied!');
        // FIX: Store the new timeout ID in the ref.
        copyTimeoutRef.current = window.setTimeout(() => setCopyStatus('Copy'), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        setCopyStatus('Failed!');
        copyTimeoutRef.current = window.setTimeout(() => setCopyStatus('Copy'), 2000);
    });
  };

  const riskStyle = riskStyles[clause.risk];
  const highRiskGlow = clause.risk === RiskLevel.High ? 'shadow-lg shadow-risk-high/10' : '';

  return (
    <motion.div 
      onMouseEnter={() => onHover(clause.originalClause, clause.occurrenceIndex)}
      onMouseLeave={() => onHover(null, null)}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: '0px 8px 40px -8px rgba(var(--primary-rgb), 0.2)' }}
    >
      <div
        className={`glass-panel border-l-4 ${riskStyle.borderColorClass} rounded-r-xl rounded-b-xl backdrop-blur-sm transition-shadow duration-300 ${highRiskGlow} overflow-hidden`}
      >
        <div className="p-5">
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-lg font-semibold text-card-foreground flex-1 pr-2">{clause.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
               {clause.confidence === 'Low' && (
                 <div className="relative group">
                  <HelpCircleIcon className="h-4 w-4 text-risk-medium" />
                  <span className="absolute bottom-full mb-2 w-48 left-1/2 -translate-x-1/2 p-2 text-xs font-semibold text-primary-foreground bg-slate-800/80 backdrop-blur-sm border border-border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      AI confidence is low. The original text may be ambiguous or complex.
                  </span>
                 </div>
              )}
              {clause.goodToKnow && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full text-cyan-300 bg-cyan-500/10 border border-cyan-300/20">
                  <CheckCircleIcon className="h-3 w-3" />
                  Good to Know
                </span>
              )}
              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${riskStyle.textColorClass} bg-background`}>
                {clause.risk} Risk
              </span>
            </div>
          </div>
          <p className="mt-3 text-muted-foreground leading-relaxed">{clause.explanation}</p>
        </div>
        
        <div className="border-t border-border/50 bg-white/5 px-5 py-3 flex items-center justify-start gap-4 text-sm">
          <button onClick={handleToggleOriginal} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200">
            <DocumentTextIcon className="h-4 w-4" />
            <span>Original Text</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-300 ${isOriginalVisible ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        <AnimatePresence>
          {isOriginalVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="bg-background/50 p-4 border-t border-border/50">
                  <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original Clause</h4>
                      <button 
                          onClick={handleCopy}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md text-muted-foreground bg-secondary/50 hover:bg-secondary hover:text-foreground transition-all duration-200"
                      >
                          {copyStatus === 'Copied!' ? <CheckCircleIcon className="w-3.5 h-3.5 text-risk-low" /> : <CopyIcon className="w-3.5 h-3.5" />}
                          <span>{copyStatus}</span>
                      </button>
                  </div>
                <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap break-words">{clause.originalClause}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const RiskGroupAccordion: React.FC<{ level: RiskLevel, clauses: DecodedClause[], onClauseHover: (clauseText: string | null, occurrence: number | null) => void; }> = ({ level, clauses, onClauseHover }) => {
    const [isOpen, setIsOpen] = React.useState(level === RiskLevel.High); // High risk is open by default
    const riskStyle = riskStyles[level];
    const IconComponent = riskStyle.icon;
    const contentId = React.useId();

    if (!clauses || clauses.length === 0) return null;

    return (
        <motion.div layout className="glass-panel rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors duration-200 hover:bg-white/5 border-l-4 ${riskStyle.borderColorClass}`}
                aria-expanded={isOpen}
                aria-controls={contentId}
            >
                <div className="flex items-center gap-3">
                    <IconComponent className={`w-5 h-5 ${riskStyle.textColorClass}`} />
                    <span className="font-semibold text-card-foreground">{level} Risk</span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background/50 rounded-full">{clauses.length}</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        id={contentId}
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: 'auto' },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className={`p-4 space-y-4 border-t border-border/50`}>
                            <AnimatePresence>
                                {clauses.map((clause, index) => (
                                    <ClauseCard key={`${index}-${clause.title}`} clause={clause} onHover={onClauseHover} />
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};


interface SummaryDisplayProps {
  clauses: DecodedClause[];
  isLoading: boolean;
  onClauseHover: (clauseText: string | null, occurrence: number | null) => void;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ clauses, isLoading, onClauseHover }) => {
  const groupedClauses = React.useMemo(() => {
    // FIX: Removed redundant calculation of occurrenceIndex.
    // The `clauses` prop already contains the necessary index from the geminiService.
    return clauses.reduce((acc, clause) => {
        const risk = clause.risk;
        if (!acc[risk]) {
            acc[risk] = [];
        }
        acc[risk].push(clause);
        return acc;
    }, {} as Record<RiskLevel, DecodedClause[]>);
  }, [clauses]);

  const riskOrder = [RiskLevel.High, RiskLevel.Medium, RiskLevel.Low, RiskLevel.Unknown];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };
  
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <div className="space-y-6 mt-8">
      <h2 className="text-2xl font-bold text-left text-card-foreground font-serif">
        Clause-by-Clause Breakdown
      </h2>
      <motion.div 
        layout 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
          {riskOrder.map(level => (
            groupedClauses[level] && (
                <motion.div key={level} variants={itemVariants}>
                    <RiskGroupAccordion
                        level={level}
                        clauses={groupedClauses[level]}
                        onClauseHover={onClauseHover}
                    />
                </motion.div>
            )
          ))}
      </motion.div>
      
      {isLoading && (
        <div className="flex items-center justify-center space-x-2 text-muted-foreground pt-4">
          <div className="w-5 h-5 rounded-full animate-spin border-2 border-dashed border-primary border-t-transparent"></div>
          <span>AI is analyzing the summary...</span>
        </div>
      )}

      {!isLoading && clauses.length > 0 && (
         <div className="mt-8 flex items-start text-sm text-muted-foreground glass-panel rounded-xl p-4">
            <InfoIcon className="h-5 w-5 mr-3 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p>This is an AI-generated summary and not legal advice. Please consult with a legal professional for important matters.</p>
        </div>
      )}
    </div>
  );
};