import React from 'react';
import type { ComparisonResult, ComparedClause } from '../types';
import { ChangeType } from '../types';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { InfoIcon } from './icons/InfoIcon';
import { GitCompareArrowsIcon } from './icons/GitCompareArrowsIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { MinusCircleIcon } from './icons/MinusCircleIcon';
import { PencilLineIcon } from './icons/PencilLineIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';


interface ComparisonResultDisplayProps {
  result: ComparisonResult;
  onReset: () => void;
}

const changeStyles = {
    [ChangeType.Added]: {
        icon: PlusCircleIcon,
        borderColorClass: 'border-green-500',
        textColorClass: 'text-green-500',
        label: 'Added',
    },
    [ChangeType.Removed]: {
        icon: MinusCircleIcon,
        borderColorClass: 'border-red-500',
        textColorClass: 'text-red-500',
        label: 'Removed',
    },
    [ChangeType.Modified]: {
        icon: PencilLineIcon,
        borderColorClass: 'border-yellow-500',
        textColorClass: 'text-yellow-500',
        label: 'Modified',
    },
    [ChangeType.Unchanged]: {
        icon: InfoIcon,
        borderColorClass: 'border-gray-400',
        textColorClass: 'text-gray-400',
        label: 'Unchanged',
    },
};

const ClauseComparisonCard: React.FC<{ clause: ComparedClause }> = ({ clause }) => {
    const style = changeStyles[clause.changeType];
    const [isExpanded, setIsExpanded] = React.useState(clause.changeType !== ChangeType.Unchanged);
    const contentId = React.useId();

    const renderContent = () => {
        switch (clause.changeType) {
            case ChangeType.Added:
                return <div className="p-4 bg-black/5 rounded-b-lg"><p className="whitespace-pre-wrap break-words">{clause.textB}</p></div>;
            case ChangeType.Removed:
                return <div className="p-4 bg-black/5 rounded-b-lg"><p className="whitespace-pre-wrap break-words">{clause.textA}</p></div>;
            case ChangeType.Modified:
                return (
                    <div className="bg-black/5 rounded-b-lg p-4">
                        <p className="italic text-sm text-muted-foreground mb-4 p-3 bg-white/10 rounded-md border border-white/10">{clause.summary}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">From Document A</h4>
                                <p className="text-sm whitespace-pre-wrap break-words opacity-80">{clause.textA}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">To Document B</h4>
                                <p className="text-sm whitespace-pre-wrap break-words">{clause.textB}</p>
                            </div>
                        </div>
                    </div>
                );
            case ChangeType.Unchanged:
                return <div className="p-4 bg-black/5 rounded-b-lg"><p className="whitespace-pre-wrap break-words opacity-60">{clause.textA}</p></div>;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`glass-panel border-l-4 rounded-r-lg rounded-b-lg ${style.borderColorClass}`}
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 text-left"
                aria-expanded={isExpanded}
                aria-controls={contentId}
            >
                <div className="flex items-center gap-3">
                    <style.icon className={`w-5 h-5 ${style.textColorClass}`} />
                    <span className="font-semibold">{style.label}</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        id={contentId}
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: 'auto' },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden border-t border-white/10"
                    >
                        {renderContent()}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export const ComparisonResultDisplay: React.FC<ComparisonResultDisplayProps> = ({ result, onReset }) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
    };
    
    const summaryItems = [
        { type: ChangeType.Added, count: result.summary.added },
        { type: ChangeType.Removed, count: result.summary.removed },
        { type: ChangeType.Modified, count: result.summary.modified },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-4xl mx-auto"
        >
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Comparison Result</h1>
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors bg-white/20 hover:bg-white/40 border border-white/20"
                >
                    <GitCompareArrowsIcon className="w-4 h-4" />
                    New Comparison
                </button>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="glass-panel rounded-xl p-6 mb-8"
            >
                <h2 className="text-xl font-bold mb-4">Summary of Changes</h2>
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                    {summaryItems.map(item => {
                        // FIX: A component variable must be capitalized for JSX to recognize it as a component.
                        const IconComponent = changeStyles[item.type].icon;
                        return (
                            <motion.div
                                key={item.type}
                                variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
                                className="flex items-center gap-3 text-lg"
                            >
                                <IconComponent className={`w-7 h-7 ${changeStyles[item.type].textColorClass}`} />
                                <span className="font-bold text-2xl">{item.count}</span>
                                <span className="text-muted-foreground">{changeStyles[item.type].label}</span>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
            
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
            >
                <h2 className="text-2xl font-bold">Detailed Breakdown</h2>
                {result.clauses.map((clause, index) => (
                    <ClauseComparisonCard key={index} clause={clause} />
                ))}
            </motion.div>

        </motion.div>
    );
};
