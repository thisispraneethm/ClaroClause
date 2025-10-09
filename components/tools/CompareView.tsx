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
import { MAX_COMPARE_TEXT_LENGTH, MAX_TEXT_LENGTH } from '../../constants';

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
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [isReadingFile, setIsReadingFile] = React.useState(false);

    React.useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, parseFloat(getComputedStyle(textarea).maxHeight) || Infinity);
            textarea.style.height = `${newHeight}px`;
        }
    }, [value]);

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
                    ref={textareaRef}
                    value={value}
                    onChange={handleTextAreaChange}
                    placeholder={`Paste document text here...`}
                    className="w-full h-full p-3 bg-background/50 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary/50 transition max-h-full"
                    disabled={disabled || isReadingFile}
                />
                {value && !disabled && (
                    <button onClick={onClear} aria-label="Clear input" className="absolute top-2 right-2 p-1 rounded-full bg-secondary/50 hover:bg-secondary"><XIcon className="w-4 h-4" /></button>
                )}
            </div>
            <div className="mt-3">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="text/*" />
                <button onClick={() => fileInputRef.current?.click()} disabled={disabled || isReadingFile} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-secondary/50 hover:bg-secondary disabled:opacity-50 border border-border">
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
    const [docA, setDocA] = React.useState(initialDocument || '');
    const [docB, setDocB] = React.useState('');
    const [result, setResult] = React.useState<ComparisonResult | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const isMounted = React.useRef(true);
    
    React.useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            // The `compareDocuments` operation is cancellable. This ensures the API request
            // is aborted if the user navigates away, saving resources and preventing errors.
            geminiService.cancelOngoingOperations();
        };
    }, []);

    const handleCompare = async () => {
        if (!docA.trim() || !docB.trim()) {
            setError('Please provide text for both documents to compare.');
            return;
        }

        // BUG FIX & HARDENING: Add proactive, client-side validation for combined document
        // length. This prevents the API call from being made if it's guaranteed to fail,
        // providing immediate and clearer feedback to the user.
        if (docA.length + docB.length > MAX_COMPARE_TEXT_LENGTH) {
            const combinedKb = ((docA.length + docB.length) / 1000).toFixed(0);
            const maxKb = MAX_COMPARE_TEXT_LENGTH / 1000;
            setError(`The combined size of the documents is too large (${combinedKb}KB). The maximum is ${maxKb}KB. Please shorten them and try again.`);
            return;
        }

        setError(null);
        setIsLoading(true);
        setResult(null);
        try {
            const comparisonResult = await geminiService.compareDocuments(docA, docB);
            if (isMounted.current) {
                setResult(comparisonResult);
            }
        } catch (err) {
            console.error(err);
            if (isMounted.current && !(err instanceof DOMException && err.name === 'AbortError')) {
                setError(err instanceof Error ? err.message : 'Failed to compare the documents. Please try again.');
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    };
    
    const handleReset = () => {
        setResult(null);
        setError(null);
        setIsLoading(false);
        // Do not clear docA and docB to allow users to make edits and re-compare
    };

    const showLoadButton = initialDocument && initialDocument !== docA;

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
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-card-foreground font-serif">
                      Compare Documents
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                      See what’s changed between two versions of a document.
                    </p>
                </div>
                {showLoadButton && (
                    <div className="text-center my-4 animate-fade-in">
                        <button onClick={() => setDocA(initialDocument)} className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium rounded-full transition-colors bg-secondary/50 hover:bg-secondary border border-border">
                            <DocumentTextIcon className="w-4 h-4" /> Load latest analyzed document into Document A
                        </button>
                    </div>
                )}
                <div className="mt-6 w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:h-[60vh]">
                    <DocumentInput title="Document A (Original)" value={docA} onChange={setDocA} onClear={() => setDocA('')} onError={setError} disabled={isLoading} />
                    <DocumentInput title="Document B (Revised)" value={docB} onChange={setDocB} onClear={() => setDocB('')} onError={setError} disabled={isLoading} />
                </div>
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleCompare}
                        disabled={isLoading || !docA.trim() || !docB.trim()}
                        className="group relative inline-flex items-center justify-center px-8 py-3 h-12 overflow-hidden rounded-full font-semibold text-primary-foreground transition-all duration-300 disabled:opacity-50 bg-primary hover:scale-105 active:scale-100 shadow-lg shadow-primary-glow"
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
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
                <div key={result ? 'result' : 'input'} className="w-full flex justify-center">
                    {renderContent()}
                </div>
            </AnimatePresence>
            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 text-center text-destructive bg-destructive/10 border border-destructive/20 p-4 rounded-lg w-full max-w-4xl"
                >
                    <p>{error}</p>
                </motion.div>
            )}
        </div>
    );
};