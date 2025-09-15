import React from 'react';
import { motion } from 'framer-motion';
import { LockIcon } from '../icons/LockIcon';
import { BrainCircuitIcon } from '../icons/BrainCircuitIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

const FeatureCard: React.FC<{ icon: React.ElementType, title: string, children: React.ReactNode }> = ({ icon: Icon, title, children }) => {
    return (
        <div className="glass-panel p-6 rounded-lg">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <p className="mt-3 text-muted-foreground">{children}</p>
        </div>
    )
}

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-violet-600 to-fuchsia-500 mb-4">
          About ClaroClause
        </h1>
        <p className="text-lg text-muted-foreground">
            Our mission is to make legal and policy-related text accessible to everyone. We believe that you shouldn't need a law degree to understand your rights and obligations. ClaroClause empowers you with clarity and confidence.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
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
        
        <div className="mt-12 glass-panel p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold">Built for You</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                ClaroClause is a proof-of-concept demonstrating the power of privacy-focused AI for sensitive applications. It's designed for anyone who wants to quickly understand the fine print, from freelancers reviewing contracts to consumers checking terms of service.
            </p>
        </div>

      </motion.div>
    </div>
  );
};