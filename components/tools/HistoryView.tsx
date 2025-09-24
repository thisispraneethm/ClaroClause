import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PersistedAnalysis } from '../../services/dbService';
import { HistoryIcon } from '../icons/HistoryIcon';
import { XIcon } from '../icons/XIcon';
import { Trash2Icon } from '../icons/Trash2Icon';
import { RiskLevel } from '../../types';

interface HistoryViewProps {
  history: PersistedAnalysis[];
  onLoad: (item: PersistedAnalysis) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
  deletingId: number | null;
}

/**
 * PERFORMANCE FIX: The date formatter is now created once at the module level.
 * This prevents the expensive `new Intl.DateTimeFormat()` constructor from being
 * called on every single render for every item in the history list, significantly
 * improving rendering performance.
 */
const dateFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const HistoryCard: React.FC<{ item: PersistedAnalysis; onLoad: () => void; onDelete: () => void; isDeleting: boolean; }> = ({ item, onLoad, onDelete, isDeleting }) => {

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
    
    const totalClauses = React.useMemo(() => {
        return item.analysis.clauses.length;
    }, [item.analysis.clauses]);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the parent button's onLoad from firing.
        onDelete();
    };

    return (
        <motion.div
            layout
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        >
            <button
                onClick={onLoad}
                disabled={isDeleting}
                aria-label={`Load analysis for ${item.documentTitle || 'Untitled Document'}`}
                className="w-full text-left glass-panel p-4 rounded-xl flex items-center justify-between transition-all duration-200 hover:bg-card/80 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:transform-none group"
            >
                <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold truncate pr-2 text-card-foreground group-hover:text-primary transition-colors" title={item.documentTitle}>
                        {item.documentTitle || 'Untitled Document'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Analyzed on {dateFormatter.format(item.createdAt)}
                    </p>
                    {totalClauses > 0 && (
                      <div className="mt-3 w-full h-1.5 flex rounded-full overflow-hidden bg-secondary" title="Risk profile">
                        {riskItems.map(risk => {
                          const count = riskCounts[risk.level] || 0;
                          if (count === 0) return null;
                          const percentage = (count / totalClauses) * 100;
                          return <div key={risk.level} className={`${risk.color}`} style={{ width: `${percentage}%` }} />;
                        })}
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 pl-4">
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        title="Delete Analysis"
                        aria-label={`Delete analysis for ${item.documentTitle || 'Untitled Document'}`}
                        className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors z-10 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? (
                            <div className="w-4 h-4 rounded-full animate-spin border-2 border-dashed border-destructive border-t-transparent"></div>
                        ) : (
                            <Trash2Icon className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </button>
        </motion.div>
    );
};

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onLoad, onDelete, onClearAll, deletingId }) => {
    
    const handleClearAll = () => {
        if (window.confirm('Are you sure you want to permanently delete all analysis history? This action cannot be undone.')) {
            onClearAll();
        }
    }
    
    return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                <HistoryIcon className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-4xl font-bold font-serif">Analysis History</h1>
            </div>
            {history.length > 0 && (
                <button 
                    onClick={handleClearAll}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full text-destructive-foreground bg-destructive/20 border border-destructive/30 hover:bg-destructive/30 transition-colors"
                    aria-label="Clear all analysis history"
                >
                    <Trash2Icon className="w-4 h-4"/>
                    Clear All
                </button>
            )}
        </div>

        {history.length === 0 ? (
          <div className="text-center glass-panel p-8 rounded-lg mt-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <HistoryIcon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold font-serif">No History Found</h2>
            <p className="text-muted-foreground mt-2">
              Your past document analyses will appear here.
            </p>
          </div>
        ) : (
          <motion.div 
            className="space-y-4"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } }
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
                            isDeleting={deletingId === item.id}
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