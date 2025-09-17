import React from 'react';
import type { AnalysisOptions, AnalysisPersona } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

const personas: { id: AnalysisPersona; name: string; description: string }[] = [
    { id: 'layperson', name: 'Layperson', description: 'Simple, everyday language. Focus on practical implications.' },
    { id: 'business_owner', name: 'Business Owner', description: 'Focus on liability, costs, and commercial risks.' },
    { id: 'lawyer', name: 'Legal Professional', description: 'Technical analysis, focusing on legal precision and potential loopholes.' },
    { id: 'first_home_buyer', name: 'First-Time Home Buyer', description: 'Focus on fees, timelines, and long-term commitments in property docs.' },
    { id: 'explain_like_im_five', name: 'Explain Like I\'m 5', description: 'Uses simple analogies and stories to explain complex topics.' },
];

interface PromptEnhancerProps {
    onAnalyze: (options: AnalysisOptions) => void;
    onBack: () => void;
    // This is a controlled component; its state is managed by the parent.
    options: AnalysisOptions;
    onOptionsChange: (options: AnalysisOptions) => void;
}

export const PromptEnhancer: React.FC<PromptEnhancerProps> = ({ onAnalyze, onBack, options, onOptionsChange }) => {
    
    const handlePersonaChange = (persona: AnalysisPersona) => {
        onOptionsChange({ ...options, persona });
    }

    const handleFocusChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onOptionsChange({ ...options, focus: e.target.value });
    }

    const handleSubmit = () => {
        onAnalyze(options);
    };

    return (
        <div className="w-full max-w-3xl animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold font-serif">Enhance Analysis</h2>
                <p className="text-muted-foreground mt-2">Tailor the AI's focus for more relevant results.</p>
            </div>
            <div className="glass-panel p-6 md:p-8 rounded-3xl space-y-8">
                <div>
                    <label className="text-lg font-semibold block mb-3">1. Select a Persona</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {personas.map((p) => (
                            <div key={p.id}>
                                <input
                                    type="radio"
                                    id={p.id}
                                    name="persona"
                                    value={p.id}
                                    checked={options.persona === p.id}
                                    onChange={() => handlePersonaChange(p.id)}
                                    className="sr-only"
                                />
                                <label
                                    htmlFor={p.id}
                                    className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all duration-200 ${options.persona === p.id ? 'bg-primary/20 border-primary/50 ring-2 ring-primary' : 'bg-card border hover:border-muted hover:bg-muted/10'}`}
                                >
                                    <span className="font-semibold">{p.name}</span>
                                    <span className="text-xs text-muted-foreground mt-1">{p.description}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="focus-input" className="text-lg font-semibold block mb-3">
                        2. Specify Areas of Focus (Optional)
                    </label>
                    <textarea
                        id="focus-input"
                        value={options.focus}
                        onChange={handleFocusChange}
                        placeholder="e.g., termination clauses, liability limitations, data privacy..."
                        className="w-full h-24 p-4 bg-card border border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all duration-300 resize-none shadow-inner"
                    />
                </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-full transition-colors bg-card text-foreground hover:bg-muted/20 border border"
                >
                    <ArrowLeftIcon className="h-4 w-4"/>
                    Back
                </button>
                <button
                    onClick={handleSubmit}
                    className={`group relative inline-flex items-center justify-center px-8 py-3 h-12 overflow-hidden rounded-full font-semibold text-primary-foreground transition-all duration-300 bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring shadow-lg shadow-primary/20 animate-subtle-pulse`}
                >
                    <span className="absolute h-0 w-0 rounded-full bg-white/20 transition-all duration-500 ease-out group-hover:h-56 group-hover:w-56"></span>
                    <span className="relative flex items-center gap-2">
                        Start Analysis
                        <SparklesIcon className="h-5 w-5" />
                    </span>
                </button>
            </div>
        </div>
    );
};