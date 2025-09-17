import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { LockIcon } from '../icons/LockIcon';

interface HomeViewProps {
  onStartAnalysis: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartAnalysis }) => {
  return (
    <div className="flex items-center justify-center h-full text-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-3xl"
      >
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-violet-600 to-fuchsia-500">
          Welcome to ClaroClause
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Instantly understand any legal document. Paste your text, and our AI provides a simple, plain-English explanation.
        </p>
        <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-green-600">
          <LockIcon className="h-4 w-4" />
          <span>Your document is securely processed and never stored. 100% private.</span>
        </div>
        <div className="mt-10 flex justify-center">
            <button
              onClick={onStartAnalysis}
              className={`group relative inline-flex items-center justify-center px-8 py-3 h-14 overflow-hidden rounded-full font-semibold text-white transition-all duration-300 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-fuchsia-500 shadow-lg shadow-primary/30 animate-subtle-pulse`}
            >
              <span className="absolute h-0 w-0 rounded-full bg-purple-700 transition-all duration-500 ease-out group-hover:h-64 group-hover:w-64"></span>
              <span className="relative flex items-center gap-2 text-lg">
                Start Analyzing
                <ClipboardListIcon className="h-5 w-5" />
              </span>
            </button>
        </div>
      </motion.div>
    </div>
  );
};
