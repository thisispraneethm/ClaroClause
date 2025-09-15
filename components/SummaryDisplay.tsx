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

const riskStyles: { [key in RiskLevel]: { textColorClass: string; borderColorClass: string; bgColorClass: string; icon: React.FC<React.SVGProps<SVGSVGElement>> } } = {
  [RiskLevel.High]: { textColorClass: 'text-red-500', borderColorClass: 'border-red-500', bgColorClass: 'bg-red-500/5', icon: ShieldAlertIcon },
  [RiskLevel.Medium]: { textColorClass: 'text-yellow-500', borderColorClass: 'border-yellow-500', bgColorClass: 'bg-yellow-500/5', icon: InfoIcon },
  [RiskLevel.Low]: { textColorClass: 'text-green-500', borderColorClass: 'border-green-500', bgColorClass: 'bg-green-500/5', icon: CheckCircleIcon },
  [RiskLevel.Unknown]: { textColorClass: 'text-gray-500', borderColorClass: 'border-gray-400', bgColorClass: 'bg-gray-500/5', icon: InfoIcon },
};

const ClauseCard: React.FC<{ clause: DecodedClause & { occurrenceIndex: number }; onHover: (clauseText: string | null, occurrence: number | null) => void; }> = ({ clause, onHover }) => {
  const [isOriginalVisible, setIsOriginalVisible] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<'Copy' | 'Copied!' | 'Failed!'>('Copy');

  const handleToggleOriginal = () => setIsOriginalVisible(!isOriginalVisible);

  const handleCopy = () => {
    navigator.clipboard.writeText(clause.originalClause).then(() => {
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus('Copy'), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        setCopyStatus('Failed!');
        setTimeout(() => setCopyStatus('Copy'), 2000);
    });
  };

  const riskStyle = riskStyles[clause.risk];
  const highRiskGlow = clause.risk === RiskLevel.High ? 'shadow-lg shadow-red-500/10' : '';

  return (
    <motion.div 
      onMouseEnter={() => onHover(clause.originalClause, clause.occurrenceIndex)}
      onMouseLeave={() => onHover(null, null)}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* FIX: The inner div handles hover transforms, preventing layout shift on elements below. */}
      <motion.div
        whileHover={{ scale: 1.015, y: -4 }}
        className={`glass-panel border-l-4 ${riskStyle.borderColorClass} rounded-r-xl rounded-b-xl backdrop-blur-sm transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/10 ${highRiskGlow}`}
      >
        <div className="p-5">
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-lg font-semibold text-card-foreground flex-1 pr-2">{clause.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
               {clause.confidence === 'Low' && (
                 <div className="relative group">
                  <HelpCircleIcon className="h-4 w-4 text-yellow-500" />
                  <span className="absolute bottom-full mb-2 w-48 left-1/2 -translate-x-1/2 p-2 text-xs font-semibold text-primary-foreground bg-gray-900/80 backdrop-blur-sm border border-white/10 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      AI confidence is low. The original text may be ambiguous or complex.
                  </span>
                 </div>
              )}
              {clause.goodToKnow && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full text-cyan-700 bg-cyan-500/10 border border-cyan-700/30">
                  <CheckCircleIcon className="h-3 w-3" />
                  Good to Know
                </span>
              )}
              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${riskStyle.textColorClass} bg-white/60`}>
                {clause.risk} Risk
              </span>
            </div>
          </div>
          <p className="mt-3 text-muted-foreground leading-relaxed">{clause.explanation}</p>
        </div>
        
        <div className="mt-2 border-t border-white/10 px-5 py-3 flex items-center justify-start gap-4 text-sm">
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
              <div className="bg-black/5 p-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original Clause</h4>
                      <button 
                          onClick={handleCopy}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md text-muted-foreground hover:bg-white/20 hover:text-foreground transition-all duration-200"
                      >
                          {copyStatus === 'Copied!' ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
                          <span>{copyStatus}</span>
                      </button>
                  </div>
                <p className="text-sm text-muted-foreground font-mono whitespace-pre-wrap break-words">{clause.originalClause}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

const RiskGroupAccordion: React.FC<{ level: RiskLevel, clauses: (DecodedClause & { occurrenceIndex: number })[], onClauseHover: (clauseText: string | null, occurrence: number | null) => void; }> = ({ level, clauses, onClauseHover }) => {
    const [isOpen, setIsOpen] = React.useState(level === RiskLevel.High); // High risk is open by default
    const riskStyle = riskStyles[level];
    const IconComponent = riskStyle.icon;
    // FIX: Add unique ID for content area for aria-controls.
    const contentId = React.useId();

    if (!clauses || clauses.length === 0) return null;

    return (
        <motion.div layout className="glass-panel rounded-xl overflow-hidden border-t-0 border" style={{ borderColor: 'rgba(255, 255, 255, 0.2)'}}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors duration-200 hover:bg-white/10 border-l-4 ${riskStyle.borderColorClass}`}
                aria-expanded={isOpen}
                aria-controls={contentId}
            >
                <div className="flex items-center gap-3">
                    <IconComponent className={`w-5 h-5 ${riskStyle.textColorClass}`} />
                    <span className="font-semibold text-card-foreground">{level} Risk</span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold text-muted-foreground bg-white/10 rounded-full">{clauses.length}</span>
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
                        <div className={`p-4 space-y-4 border-t border-white/10 ${riskStyle.bgColorClass}`}>
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
    // FIX: Calculate occurrence index for each clause to handle duplicates.
    const clauseOccurrences: { [key: string]: number } = {};
    const clausesWithIndex = clauses.map(clause => {
        const text = clause.originalClause;
        const count = clauseOccurrences[text] || 0;
        clauseOccurrences[text] = count + 1;
        return { ...clause, occurrenceIndex: count };
    });

    return clausesWithIndex.reduce((acc, clause) => {
        const risk = clause.risk;
        if (!acc[risk]) {
            acc[risk] = [];
        }
        acc[risk].push(clause);
        return acc;
    }, {} as Record<RiskLevel, (DecodedClause & { occurrenceIndex: number })[]>);
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
    <div className="space-y-6 mt-6">
      <h2 className="text-2xl font-bold text-left text-card-foreground">
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
         <div className="mt-8 flex items-start text-sm text-muted-foreground glass-panel rounded-lg p-4">
            <InfoIcon className="h-5 w-5 mr-3 text-cyan-500 flex-shrink-0 mt-0.5" />
            <p>This is an AI-generated summary and not legal advice. Please consult with a legal professional for important matters.</p>
        </div>
      )}
    </div>
  );
};
