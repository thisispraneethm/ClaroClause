import React from 'react';
import { motion } from 'framer-motion';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { SearchCodeIcon } from './icons/SearchCodeIcon';

const loadingMessages = [
  'Translating legalese into plain English...',
  'Checking the fine print...',
  'Consulting with our digital legal expert...',
  'Simplifying complex clauses...',
  'Analyzing document structure...'
];

interface LoaderProps {
    progress?: {
        current: number;
        total: number;
    } | null
}

export const Loader: React.FC<LoaderProps> = ({ progress }) => {
  const [messageIndex, setMessageIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);
  
  const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0;
  const progressText = progress ? `Analyzing chunk ${progress.current} of ${progress.total}...` : 'Preparing analysis...';


  return (
    <div className="flex flex-col items-center justify-center space-y-6 my-12 animate-fade-in w-full max-w-md mx-auto">
        {/* 
          Breathtaking: The loader icon is now a subtle, elegant pulse, enhancing the feel of a sophisticated process.
        */}
        <div className="relative w-20 h-20">
            <DocumentTextIcon className="w-full h-full text-muted-foreground/30" />
            <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
            >
                <SearchCodeIcon className="w-10 h-10 text-primary" />
            </motion.div>
        </div>

      <div className="w-full text-center">
        <p className="text-foreground text-center font-semibold">{progressText}</p>
        <p className="text-muted-foreground text-center transition-opacity duration-500 text-sm h-5">{loadingMessages[messageIndex]}</p>
      </div>

      {progress && (
        <div className="w-full bg-secondary/50 rounded-full h-2.5 overflow-hidden shadow-inner">
            <motion.div 
                className="bg-primary h-2.5 rounded-full" 
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
        </div>
      )}
    </div>
  );
};