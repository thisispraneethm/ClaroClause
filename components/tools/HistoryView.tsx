import React from 'react';
import { motion } from 'framer-motion';
import type { PersistedAnalysis } from '../../services/dbService';
import { HistoryIcon } from '../icons/HistoryIcon';
import { XIcon } from '../icons/XIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';

interface HistoryViewProps {
  history: PersistedAnalysis[];
  onLoad: (item: PersistedAnalysis) => void;
  onDelete: (id: number) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onLoad, onDelete }) => {

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <HistoryIcon className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Analysis History</h1>
        </div>

        {history.length === 0 ? (
          <div className="text-center glass-panel p-8 rounded-lg mt-10">
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
            {history.map((item) => (
              <motion.div
                key={item.id}
                layout
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="glass-panel p-4 rounded-lg flex items-center justify-between"
              >
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-semibold truncate pr-2" title={item.documentTitle}>
                    {item.documentTitle || 'Untitled Document'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Analyzed on {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={() => onLoad(item)}
                    title="Load Analysis"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md text-muted-foreground hover:bg-white/20 hover:text-foreground transition-colors"
                  >
                    <ClipboardListIcon className="w-4 h-4" />
                    Load
                  </button>
                  <button
                    onClick={() => item.id && onDelete(item.id)}
                    title="Delete Analysis"
                    className="p-2 rounded-full text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};