import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CopyIcon } from '../icons/CopyIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { PencilIcon } from '../icons/PencilIcon';

interface DraftViewProps {
  onDraft: (prompt: string) => void;
  isDrafting: boolean;
  draftResult: string;
  setDraftResult: (result: string) => void;
  error: string | null;
}

export const DraftView: React.FC<DraftViewProps> = ({ onDraft, isDrafting, draftResult, setDraftResult, error }) => {
  const [prompt, setPrompt] = React.useState('');
  const [copyStatus, setCopyStatus] = React.useState<'Copy' | 'Copied!'>('Copy');
  const resultTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleDraft = () => {
    if (prompt.trim()) {
      onDraft(prompt);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftResult).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy'), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };
  
  // Auto-resize the textarea as content streams in or is edited by the user.
  React.useEffect(() => {
    const textarea = resultTextareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [draftResult]);

  const hasResult = draftResult.trim().length > 0;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-start min-h-full">
      <div className="w-full max-w-4xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-card-foreground font-serif">
          Draft with AI
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Describe the document you need, and our AI will generate a starting draft for you.
        </p>
      </div>

      <div className="w-full max-w-4xl mt-8">
        <div className="glass-panel p-6 rounded-2xl relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., a simple non-disclosure agreement for a freelance project..."
            className="w-full h-32 p-4 bg-card/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all duration-300 resize-none shadow-inner"
            disabled={isDrafting}
          />
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleDraft}
              disabled={isDrafting || !prompt.trim()}
              className="group relative inline-flex items-center justify-center px-8 py-3 h-12 overflow-hidden rounded-full font-semibold text-primary-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring shadow-lg shadow-primary/30"
            >
              <span className="absolute h-0 w-0 rounded-full bg-white/20 transition-all duration-500 ease-out group-hover:h-56 group-hover:w-56"></span>
              <span className="relative flex items-center gap-2">
                {isDrafting ? 'Generating...' : 'Generate Draft'}
                {!isDrafting && <PencilIcon className="h-5 w-5" />}
              </span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-8 text-center text-destructive-foreground bg-destructive/20 p-4 rounded-lg w-full max-w-4xl animate-fade-in border border-destructive/30">
          <p>{error}</p>
        </div>
      )}

      {(isDrafting || hasResult) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-4xl mt-8"
        >
          <div className="glass-panel p-6 rounded-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold font-serif">Generated Document</h2>
              {hasResult && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-all duration-200"
                >
                  {copyStatus === 'Copied!' ? <CheckCircleIcon className="w-3.5 h-3.5 text-risk-low" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  <span>{copyStatus}</span>
                </button>
              )}
            </div>
             <textarea
                ref={resultTextareaRef}
                value={draftResult}
                onChange={(e) => setDraftResult(e.target.value)}
                readOnly={isDrafting}
                placeholder={isDrafting ? "AI is generating your document..." : "Generated document will appear here."}
                className="w-full min-h-[250px] p-4 bg-card/50 border-none rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary transition-all duration-300 resize-y shadow-inner"
             />
          </div>
        </motion.div>
      )}
    </div>
  );
};