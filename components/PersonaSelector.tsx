import React from 'react';
import type { AnalysisPersona } from '../types';
import { BrainCircuitIcon } from './icons/BrainCircuitIcon';

const personas: { id: AnalysisPersona; name: string; description: string }[] = [
    { id: 'layperson', name: 'Layperson', description: 'Simple, everyday language.' },
    { id: 'business_owner', name: 'Business Owner', description: 'Focus on liability and costs.' },
    { id: 'lawyer', name: 'Legal Professional', description: 'Technical and precise language.' },
    { id: 'first_home_buyer', name: 'First-Time Home Buyer', description: 'Focus on fees and commitments.' },
    { id: 'explain_like_im_five', name: 'Explain Like I\'m 5', description: 'Uses simple analogies.' },
];

interface PersonaSelectorProps {
    currentPersona: AnalysisPersona;
    onPersonaChange: (persona: AnalysisPersona) => void;
    isRephrasing: boolean;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({ currentPersona, onPersonaChange, isRephrasing }) => {
    return (
        <div className="glass-panel rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BrainCircuitIcon className="w-5 h-5 text-primary" />
                    <label htmlFor="persona-select" className="text-sm font-semibold text-card-foreground">
                        Change AI Perspective
                    </label>
                </div>
                {isRephrasing ? (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-4 h-4 rounded-full animate-spin border-2 border-dashed border-primary border-t-transparent"></div>
                        <span>Re-analyzing...</span>
                    </div>
                ) : (
                    <select
                        id="persona-select"
                        value={currentPersona}
                        onChange={(e) => onPersonaChange(e.target.value as AnalysisPersona)}
                        disabled={isRephrasing}
                        className="bg-secondary/50 border-border rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary transition"
                    >
                        {personas.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                )}
            </div>
        </div>
    );
};
