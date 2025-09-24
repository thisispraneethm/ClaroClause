import React from 'react';
import type { ContractAnalysis } from '../types';
import { RiskLevel } from '../types';
import { InfoIcon } from './icons/InfoIcon';
import { motion, useSpring, useTransform } from 'framer-motion';
import { CopyIcon } from './icons/CopyIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface SummaryHeaderProps {
  analysis: ContractAnalysis;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
    const spring = useSpring(0, { stiffness: 100, damping: 30 });
    const display = useTransform(spring, (current) => Math.round(current));

    React.useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return <motion.span>{display}</motion.span>;
}

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 46;

  let colorClass = 'text-risk-low';
  let gradientFrom = 'rgb(var(--risk-low-rgb))';
  let gradientTo = 'rgba(var(--risk-low-rgb), 0.5)';

  if (score < 75) {
      colorClass = 'text-risk-medium';
      gradientFrom = 'rgb(var(--risk-medium-rgb))';
      gradientTo = 'rgba(var(--risk-medium-rgb), 0.5)';
  }
  if (score < 50) {
      colorClass = 'text-risk-high';
      gradientFrom = 'rgb(var(--risk-high-rgb))';
      gradientTo = 'rgba(var(--risk-high-rgb), 0.5)';
  }
  
  const progressSpring = useSpring(0, { stiffness: 30, damping: 20, restDelta: 0.001 });
  
  React.useEffect(() => {
    progressSpring.set(score / 100);
  }, [score, progressSpring]);

  const offset = useTransform(progressSpring, (p) => circumference - p * circumference);
  const uniqueGradientId = React.useId();

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={uniqueGradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          className="text-border/50"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r="46"
          cx="50"
          cy="50"
        />
        {/* Progress circle */}
        <motion.circle
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeLinecap="round"
          stroke={`url(#${uniqueGradientId})`}
          fill="transparent"
          r="46"
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-bold font-serif ${colorClass}`}>
            <AnimatedNumber value={score} />
        </span>
        <span className="text-xs text-muted-foreground mt-1">Fairness Score</span>
      </div>
    </div>
  );
};


export const SummaryHeader: React.FC<SummaryHeaderProps> = ({ analysis }) => {
    const riskCounts = React.useMemo(() => {
        return analysis.clauses.reduce((acc, clause) => {
            acc[clause.risk] = (acc[clause.risk] || 0) + 1;
            return acc;
        }, {} as Record<RiskLevel, number>);
    }, [analysis.clauses]);
    
    const [copyStatus, setCopyStatus] = React.useState<'Copy' | 'Copied!'>('Copy');
    const copyTimeoutRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    const handleCopySummary = () => {
        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
        const summaryText = `
Document: ${analysis.documentTitle}
Contract Score: ${analysis.overallScore}/100

Key Takeaways:
${analysis.keyTakeaways.map(t => `- ${t}`).join('\n')}
    `.trim();

        navigator.clipboard.writeText(summaryText).then(() => {
            setCopyStatus('Copied!');
            copyTimeoutRef.current = window.setTimeout(() => setCopyStatus('Copy'), 2000);
        });
    };

    const riskItems = [
        { level: RiskLevel.High, color: 'bg-risk-high', label: 'High Risk' },
        { level: RiskLevel.Medium, color: 'bg-risk-medium', label: 'Medium Risk' },
        { level: RiskLevel.Low, color: 'bg-risk-low', label: 'Low Risk' },
    ];

    return (
        <motion.div 
            className="glass-panel rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="flex flex-col items-center justify-center md:col-span-1">
                    <ScoreCircle score={analysis.overallScore} />
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        {riskItems.map(item => (
                            <div key={item.level} className="flex items-center gap-1.5" title={`${riskCounts[item.level] || 0} ${item.label} clauses`}>
                                <span className={`h-2 w-2 rounded-full ${item.color}`}></span>
                                <span><AnimatedNumber value={riskCounts[item.level] || 0} /></span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-2 md:pl-4">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-3xl font-bold text-card-foreground font-serif">Key Takeaways</h2>
                        <button
                            onClick={handleCopySummary}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs rounded-full text-muted-foreground bg-secondary hover:text-foreground transition-all duration-200"
                        >
                            {copyStatus === 'Copied!' ? <CheckCircleIcon className="w-3.5 h-3.5 text-risk-low" /> : <CopyIcon className="w-3.5 h-3.5" />}
                            <span>{copyStatus} Summary</span>
                        </button>
                    </div>
                    <ul className="space-y-3">
                        {analysis.keyTakeaways.map((takeaway, index) => (
                            <motion.li 
                                key={`takeaway-${index}`} 
                                className="flex items-start"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.15, ease: 'easeOut' }}
                            >
                                <div className="w-5 h-5 flex-shrink-0 mt-0.5 mr-3 rounded-full bg-primary/20 flex items-center justify-center">
                                  <InfoIcon className="w-3 h-3 text-primary" />
                                </div>
                                <span className="text-muted-foreground leading-relaxed">{takeaway}</span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.div>
    )
}