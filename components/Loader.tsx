import React from 'react';
import { motion } from 'framer-motion';

const loadingMessages = [
  'Translating legalese into plain English...',
  'Checking the fine print for hidden risks...',
  'Consulting with our digital legal expert...',
  'Simplifying complex clauses and structures...',
  'Analyzing document intent and implications...',
  'Cross-referencing legal patterns...',
  'Decoding contractual obligations...',
];

interface LoaderProps {
    progress?: {
        current: number;
        total: number;
    } | null
}

const DecodingMatrix: React.FC = () => {
    return (
        <div className="relative w-24 h-24">
            {/* Base Grid */}
            <div className="absolute inset-0 grid grid-cols-4 gap-2">
                {[...Array(16)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="bg-primary/10 rounded-sm"
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: [0.1, 0.5, 0.1] }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: 'easeInOut'
                        }}
                    />
                ))}
            </div>
            {/* Scanner */}
             <motion.div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(var(--primary-rgb), 0.5) 50%, transparent 100%)',
                    boxShadow: '0 0 10px rgba(var(--primary-rgb), 0.7)',
                    filter: 'blur(2px)'
                }}
                animate={{ y: ['-100%', '100%'] }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear'
                }}
            />
        </div>
    );
};

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
    <div className="flex flex-col items-center justify-center space-y-8 my-12 animate-fade-in w-full max-w-md mx-auto">
        <DecodingMatrix />
      <div className="w-full text-center">
        <p className="text-foreground text-center font-semibold">{progressText}</p>
        <p className="text-muted-foreground text-center transition-opacity duration-500 text-sm h-5">{loadingMessages[messageIndex]}</p>
      </div>

      {progress && (
        <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden shadow-inner relative">
            <motion.div 
                className="bg-primary h-full rounded-full" 
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
        </div>
      )}
    </div>
  );
};