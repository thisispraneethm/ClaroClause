import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PersistedAnalysis } from '../../services/dbService';
import { HistoryIcon } from '../icons/HistoryIcon';
import { XIcon } from '../icons/XIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { RiskLevel } from '../../types';

interface HistoryViewProps {
  history: PersistedAnalysis[];
  onLoad: (item: PersistedAnalysis) => void;
  onDelete: (id: number) => void;
}

const HistoryCard: React.FC<{ item: PersistedAnalysis; onLoad: () => void; onDelete: () => void; }> = ({ item, onLoad, onDelete }) => {
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    };

    const riskCounts = React.useMemo(() => {
        return item.analysis.clauses.reduce((acc, clause) => {
            acc[clause.risk] = (acc[clause.risk] || 0) + 1;
            return acc;
        }, {} as Record<RiskLevel, number>);
    }, [item.analysis.clauses]);

    const riskItems = [
        { level: RiskLevel.High, color: 'bg-risk-high' },
        { level: RiskLevel.Medium, color: 'bg-risk-medium' },
        { level: RiskLevel.Low, color: 'bg-risk-low' },
    ];

    return (
        <motion.div
            layout
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="glass-panel p-4 rounded-xl flex items-center justify-between transition-colors duration-200 hover:bg-muted/10"
        >
            <div className="flex-1 overflow-hidden">
                <h3 className="font-semibold truncate pr-2 text-card-foreground" title={item.documentTitle}>
                    {item.documentTitle || 'Untitled Document'}
                </h3>
                <p className="text-xs text-muted-foreground">
                    Analyzed on {formatDate(item.createdAt)}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {riskItems.map(risk => (
                        <div key={risk.level} className="flex items-center gap-1.5" title={`${riskCounts[risk.level] || 0} ${risk.level} risk clauses`}>
                            <span className={`h-2 w-2 rounded-full ${risk.color}`}></span>
                            <span>{riskCounts[risk.level] || 0}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                    onClick={onLoad}
                    title="Load Analysis"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md text-muted-foreground bg-card/50 hover:bg-muted/20 hover:text-foreground transition-colors border border-border"
                >
                    <ClipboardListIcon className="w-4 h-4" />
                    Load
                </button>
                <button
                    onClick={onDelete}
                    title="Delete Analysis"
                    className="p-2 rounded-full text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-colors"
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onLoad, onDelete }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <HistoryIcon className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold font-serif">Analysis History</h1>
        </div>

        {history.length === 0 ? (
          <div className="text-center glass-panel p-8 rounded-lg mt-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <HistoryIcon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">No History Found</h2>
            <p className="text-muted-foreground mt-2">
              Your past document analyses will appear here.
            </p>
          </div>
        ) : (
          <motion.div 
            className="space-y-4"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
                {history.map((item) => (
                    item.id ? (
                        <HistoryCard
                            key={item.id}
                            item={item}
                            onLoad={() => onLoad(item)}
                            onDelete={() => item.id && onDelete(item.id)}
                        />
                    ) : null
                ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};