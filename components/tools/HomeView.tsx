import React from 'react';
import { motion, Variants } from 'framer-motion';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { LockIcon } from '../icons/LockIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { MessageCircleIcon } from '../icons/MessageCircleIcon';
import { GitCompareArrowsIcon } from '../icons/GitCompareArrowsIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { HistoryIcon } from '../icons/HistoryIcon';

interface HomeViewProps {
  onStartAnalysis: () => void;
}

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => {
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current?.style.setProperty("--mouse-x", `${x}px`);
      cardRef.current?.style.setProperty("--mouse-y", `${y}px`);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
      }}
      className="glass-panel p-8 rounded-3xl h-full flex flex-col items-start feature-card"
    >
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5 border border-primary/20">
        {icon}
      </div>
      <h3 className="text-xl font-bold font-serif text-card-foreground">{title}</h3>
      <p className="mt-2 text-muted-foreground flex-1">{description}</p>
    </motion.div>
  );
};

export const HomeView: React.FC<HomeViewProps> = ({ onStartAnalysis }) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div className="relative isolate overflow-y-auto h-full p-4 md:p-8">
      <div className="container mx-auto">
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto text-center pt-16 md:pt-24"
        >
            <motion.div variants={itemVariants} className="mb-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2 text-base font-semibold text-primary tracking-wide border border-primary/20">
                    <SparklesIcon className="w-5 h-5" />
                    ClaroClause
                </span>
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-card-foreground font-serif">
                Understand the Fine Print, <br/><span className="animated-gradient-text bg-clip-text text-transparent bg-gradient-to-br from-primary via-fuchsia-400 to-primary">Instantly</span>
            </motion.h1>
            <motion.p variants={itemVariants} className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Paste any legal document, and our AI provides a simple, plain-English explanation. 100% private and secure, right in your browser.
            </motion.p>
            <motion.div variants={itemVariants} className="mt-10 flex justify-center">
                <button
                onClick={onStartAnalysis}
                className={`group relative inline-flex items-center justify-center px-8 py-3 h-14 overflow-hidden rounded-full font-semibold text-primary-foreground transition-all duration-300 bg-primary hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring shadow-lg shadow-primary-glow-lg animate-subtle-pulse`}
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
                  <span className="relative flex items-center gap-2 text-lg">
                      Analyze a Document
                      <ClipboardListIcon className="h-5 w-5" />
                  </span>
                </button>
            </motion.div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mt-20 lg:mt-24 pb-20"
        >
          <FeatureCard
            icon={<ClipboardListIcon className="w-6 h-6 text-primary" />}
            title="Intelligent Analysis"
            description="Get a clear, clause-by-clause breakdown with risk levels and simple explanations."
          />
          <FeatureCard
            icon={<MessageCircleIcon className="w-6 h-6 text-primary" />}
            title="Conversational Clarity"
            description="Ask follow-up questions in plain English to clarify complex legal points."
          />
          <FeatureCard
            icon={<GitCompareArrowsIcon className="w-6 h-6 text-primary" />}
            title="Track Changes"
            description="See what’s been added, removed, or modified between two document versions."
          />
          <FeatureCard
            icon={<PencilIcon className="w-6 h-6 text-primary" />}
            title="Draft with AI"
            description="Describe the document you need, and our AI will generate a starting draft for you."
          />
          <FeatureCard
            icon={<HistoryIcon className="w-6 h-6 text-primary" />}
            title="Session History"
            description="Your analyses are saved locally, allowing you to review past results."
          />
          <FeatureCard
            icon={<LockIcon className="w-6 h-6 text-primary" />}
            title="Ironclad Privacy"
            description="Your data is never stored. All analysis is performed securely in your browser session."
          />

        </motion.div>
      </div>
    </div>
  );
};