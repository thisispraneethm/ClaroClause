import React from 'react';
import type { ContractAnalysis } from '../types';
import { RiskLevel } from '../types';
import { InfoIcon } from './icons/InfoIcon';
import { motion, useSpring, useTransform } from 'framer-motion';

interface SummaryHeaderProps {
  analysis: ContractAnalysis;
}

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 45;

  let colorClass = 'text-green-500';
  if (score < 75) colorClass = 'text-yellow-500';
  if (score < 50) colorClass = 'text-red-500';
  
  const progressSpring = useSpring(0, { stiffness: 30, damping: 20 });
  const scoreSpring = useSpring(0, { stiffness: 50, damping: 25 });
  
  React.useEffect(() => {
    progressSpring.set(score / 100);
    scoreSpring.set(score);
  }, [score, progressSpring, scoreSpring]);

  const offset = useTransform(progressSpring, (p) => circumference - p * circumference);
  const displayScore = useTransform(scoreSpring, (v) => Math.round(v));

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          className="text-gray-500/20"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        {/* Progress circle */}
        <motion.circle
          className={colorClass}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className={`text-3xl font-bold ${colorClass}`}>
            {displayScore}
        </motion.span>
        <span className="text-xs text-muted-foreground">Contract Score</span>
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
    
    const riskItems = [
        { level: RiskLevel.Low, color: 'bg-green-500', label: 'Low Risk' },
        { level: RiskLevel.Medium, color: 'bg-yellow-500', label: 'Medium Risk' },
        { level: RiskLevel.High, color: 'bg-red-500', label: 'High Risk' },
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
                                <span>{riskCounts[item.level] || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-2 md:pl-4">
                    <h2 className="text-xl font-bold text-card-foreground mb-3">Key Takeaways</h2>
                    <ul className="space-y-3">
                        {analysis.keyTakeaways.map((takeaway, index) => (
                            <motion.li 
                                key={`takeaway-${index}`} 
                                className="flex items-start"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.15 }}
                            >
                                <InfoIcon className="w-4 h-4 text-primary mt-1 mr-3 flex-shrink-0" />
                                <span className="text-muted-foreground leading-relaxed">{takeaway}</span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.div>
    )
}
