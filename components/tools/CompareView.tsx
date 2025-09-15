import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../../services/geminiService';
import type { ComparisonResult } from '../../types';
import { Loader } from '../Loader';
import { ComparisonResultDisplay } from '../ComparisonResultDisplay';
import { GitCompareArrowsIcon } from '../icons/GitCompareArrowsIcon';
import { UploadIcon } from '../icons/UploadIcon';
import { XIcon } from '../icons/XIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';

// Set a reasonable limit to prevent client-side DoS
const MAX_TEXT_LENGTH = 100000; 

interface DocumentInputProps {
    title: string;
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
    onError: (message: string) => void;
    disabled: boolean;
}

const DocumentInput: React.FC<DocumentInputProps> = ({ title, value, onChange, onClear, onError, disabled }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isReadingFile, setIsReadingFile] = React.useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > MAX_TEXT_LENGTH) {
                onError(`File is too large. Please select a file smaller than ${MAX_TEXT_LENGTH / 1000}KB.`);
                event.target.value = '';
                return;
            }
            setIsReadingFile(true);
            const reader = new FileReader();
            reader.onload = (e) => {
                onChange(e.target?.result as string);
                setIsReadingFile(false);
            };
            reader.onerror = () => {
                setIsReadingFile(false);
                onError("There was an error reading the file.");
            };
            reader.readAsText(file);
        }
        event.target.value = '';
    };

    const handleTextAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = event.target.value;
        if (newValue.length > MAX_TEXT_LENGTH) {
            onError(`Pasted text is too long (${(newValue.length / 1000).toFixed(1)}KB) and was rejected. Please paste text smaller than ${MAX_TEXT_LENGTH / 1000}KB.`);
            // Reject the change by not calling onChange
        } else {
            onChange(newValue);
        }
    };

    return (
        <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col h-full">
            <h3 className="font-semibold text-center mb-3">{title}</h3>
            <div className="relative flex-1">
                <textarea
                    value={value}
                    onChange={handleTextAreaChange}
                    placeholder={`Paste document text here...`}
                    className="w-full h-full p-3 bg-white/20 border border-white/30 rounded-lg resize-none focus:ring-2 focus:ring-primary/50 transition"
                    disabled={disabled || isReadingFile}
                />
                {value && !disabled && (
                    <button onClick={onClear} aria-label="Clear input" className="absolute top-2 right-2 p-1 rounded-full bg-black/10 hover:bg-black/20"><XIcon className="w-4 h-4" /></button>
                )}
            </div>
            <div className="mt-3">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="text/*" />
                <button onClick={() => fileInputRef.current?.click()} disabled={disabled || isReadingFile} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-white/20 hover:bg-white/40 disabled:opacity-50 border border-white/20">
                    <UploadIcon className="h-4 w-4" />
                    {isReadingFile ? 'Reading...' : 'Upload File'}
                </button>
            </div>
        </div>
    );
};

interface CompareViewProps {
  initialDocument: string;
}

export const CompareView: React.FC<CompareViewProps> = ({ initialDocument }) => {
    const [docA, setDocA] = React.useState('');
    const [docB, setDocB] = React.useState('');
    const [result, setResult] = React.useState<ComparisonResult | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setDocA(initialDocument);
    }, [initialDocument]);

    const handleCompare = async () => {
        if (!docA.trim() || !docB.trim()) {
            setError('Please provide text for both documents to compare.');
            return;
        }
        setError(null);
        setIsLoading(true);
        setResult(null);
        try {
            const comparisonResult = await geminiService.compareDocuments(docA, docB);
            setResult(comparisonResult);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to compare the documents. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = () => {
        setResult(null);
        setError(null);
        setIsLoading(false);
        setDocA('');
        setDocB('');
    };

    const renderContent = () => {
        if (result) {
            return <ComparisonResultDisplay result={result} onReset={handleReset} />;
        }
        if (isLoading) {
            return <div className="mt-20"><Loader /></div>;
        }

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="w-full"
            >
                <div className="w-full max-w-5xl text-center mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-violet-600 to-fuchsia-500">
                      Compare Documents
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                      See what’s changed between two versions of a document.
                    </p>
                </div>
                {initialDocument && (
                    <div className="text-center my-4">
                        <button onClick={() => setDocA(initialDocument)} className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium rounded-full transition-colors bg-white/20 hover:bg-white/40 border border-white/20">
                            <DocumentTextIcon className="w-4 h-4" /> Load current document into Document A
                        </button>
                    </div>
                )}
                <div className="mt-6 w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6 min-h-[400px]">
                    <DocumentInput title="Document A" value={docA} onChange={setDocA} onClear={() => setDocA('')} onError={setError} disabled={isLoading} />
                    <DocumentInput title="Document B" value={docB} onChange={setDocB} onClear={() => setDocB('')} onError={setError} disabled={isLoading} />
                </div>
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleCompare}
                        disabled={isLoading || !docA.trim() || !docB.trim()}
                        className="group relative inline-flex items-center justify-center px-8 py-3 h-12 overflow-hidden rounded-full font-semibold text-white transition-all duration-300 disabled:opacity-50 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-primary/30"
                    >
                      <span className="absolute h-0 w-0 rounded-full bg-purple-700 transition-all duration-500 ease-out group-hover:h-56 group-hover:w-56"></span>
                      <span className="relative flex items-center gap-2">
                        <GitCompareArrowsIcon className="h-5 w-5" />
                        Compare
                      </span>
                    </button>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-start min-h-full">
            <AnimatePresence mode="wait">
                <div key={result ? 'result' : 'input'} className="w-full">
                    {renderContent()}
                </div>
            </AnimatePresence>
            {error && (
                <div className="mt-8 text-center text-destructive-foreground bg-destructive/80 p-4 rounded-lg w-full max-w-4xl animate-fade-in">
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
};