import React from 'react';
// FIX: Import Variants to explicitly type framer-motion variant objects.
import { motion, Variants } from 'framer-motion';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { LockIcon } from '../icons/LockIcon';
import { BrainCircuitIcon } from '../icons/BrainCircuitIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface HomeViewProps {
  onStartAnalysis: () => void;
}

const ScrollIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 1.5, duration: 0.5 }}
    className="absolute bottom-10 left-1/2 -translate-x-1/2"
  >
    <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center items-start p-1">
      <motion.div
        className="w-1 h-2 rounded-full bg-muted-foreground"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  </motion.div>
);

const FeatureCard: React.FC<{ icon: React.ElementType, title: string, children: React.ReactNode }> = ({ icon: Icon, title, children }) => {
    return (
        <motion.div 
            className="glass-panel p-6 rounded-2xl h-full flex flex-col"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            viewport={{ once: true, amount: 0.3 }}
            whileHover={{ y: -8, scale: 1.03, boxShadow: '0 20px 30px -10px rgba(var(--primary), 0.15)' }}
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground">{title}</h3>
            </div>
            <p className="mt-4 text-muted-foreground flex-1">{children}</p>
        </motion.div>
    )
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartAnalysis }) => {
  // FIX: Explicitly typing variants with `Variants` prevents TypeScript from incorrectly
  // widening string literal types (e.g., 'easeOut') to `string`, which caused a type error.
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <div className="relative isolate overflow-y-auto h-full">
      <div className="container mx-auto px-4 pt-24 pb-12 md:pt-32 md:pb-20 text-center relative min-h-[80vh] flex flex-col justify-center">
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto"
        >
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-card-foreground font-serif">
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-primary to-fuchsia-400">ClaroClause</span>
            </motion.h1>
            <motion.p variants={itemVariants} className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Instantly understand any legal document. Paste your text, and our AI provides a simple, plain-English explanation. 100% private and secure.
            </motion.p>
            <motion.div variants={itemVariants} className="mt-10 flex justify-center">
                <button
                onClick={onStartAnalysis}
                className={`group relative inline-flex items-center justify-center px-8 py-3 h-14 overflow-hidden rounded-full font-semibold text-primary-foreground transition-all duration-300 bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring shadow-lg shadow-primary/30 animate-subtle-pulse`}
                >
                <span className="absolute h-0 w-0 rounded-full bg-white/20 transition-all duration-500 ease-out group-hover:h-64 group-hover:w-64"></span>
                <span className="relative flex items-center gap-2 text-lg">
                    Start Analyzing for Free
                    <ClipboardListIcon className="h-5 w-5" />
                </span>
                </button>
            </motion.div>
        </motion.div>
        <ScrollIndicator />
      </div>

      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                viewport={{ once: true, amount: 0.8 }}
                className="max-w-3xl mx-auto text-center"
            >
                <h2 className="text-base font-semibold leading-7 text-primary">How it Works</h2>
                <p className="mt-2 text-4xl font-bold tracking-tight text-card-foreground sm:text-5xl font-serif">Clarity, Confidence, and Control</p>
                <p className="mt-6 text-lg leading-8 text-muted-foreground">
                    Our mission is to make legal and policy-related text accessible to everyone. We believe that you shouldn't need a law degree to understand your rights and obligations.
                </p>
            </motion.div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                    <FeatureCard icon={LockIcon} title="Maximum Privacy">
                        Your documents are sent securely for analysis and are never stored. We don't log your data, ensuring your sensitive information remains completely private.
                    </FeatureCard>
                    <FeatureCard icon={BrainCircuitIcon} title="Powerful AI Analysis">
                        We leverage state-of-the-art AI models to provide real-time analysis without compromising your data privacy.
                    </FeatureCard>
                    <FeatureCard icon={SparklesIcon} title="Instant Clarity">
                        Get a plain-English explanation of complex clauses, a fairness score, and key takeaways in seconds. Understand what you're signing, instantly.
                    </FeatureCard>
                </div>
            </div>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        viewport={{ once: true, amount: 0.5 }}
        className="pb-24 sm:pb-32"
      >
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="glass-panel p-8 sm:p-12 rounded-3xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent" />
                 <SparklesIcon className="mx-auto h-12 w-12 text-primary" />
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-card-foreground sm:text-4xl font-serif">Ready to Decode the Fine Print?</h2>
                <p className="mt-6 max-w-2xl mx-auto text-lg leading-8 text-muted-foreground">
                    ClaroClause is designed for anyone who wants to quickly understand the fine print, from freelancers reviewing contracts to consumers checking terms of service.
                </p>
                <div className="mt-10 flex items-center justify-center">
                    <button
                        onClick={onStartAnalysis}
                        className="group relative inline-flex items-center justify-center px-8 py-3 h-14 overflow-hidden rounded-full font-semibold text-primary-foreground transition-all duration-300 bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring shadow-lg shadow-primary/30"
                    >
                        <span className="absolute h-0 w-0 rounded-full bg-white/20 transition-all duration-500 ease-out group-hover:h-64 group-hover:w-64"></span>
                        <span className="relative flex items-center gap-2 text-lg">
                            Analyze Your First Document
                        </span>
                    </button>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
};