import React from 'react';
import type { ChatMessage } from '../../types';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BrainCircuitIcon } from '../icons/BrainCircuitIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { SendIcon } from '../icons/SendIcon';

interface ChatViewProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isAiTyping: boolean;
  onClauseClick: (clauseId: string) => void;
}

const AiTypingIndicator: React.FC = () => (
    <div className="flex items-center gap-1.5 p-4">
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.3s]"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.15s]"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse"></span>
    </div>
);

const ParsedMessage: React.FC<{ text: string; onClauseClick: (clauseId: string) => void }> = React.memo(({ text, onClauseClick }) => {
    // Parses the robust citation format `[Citation: clause-ID]`.
    const parts = text.split(/(\[Citation: [a-zA-Z0-9-]+?\])/g);
    
    return (
        <>
            {parts.map((part, index) => {
                const match = part.match(/\[Citation: ([a-zA-Z0-9-]+?)\]/);
                if (match) {
                    const clauseId = match[1];
                    // The text displayed to the user can be a simplified version.
                    const userFriendlyText = `Clause ${clauseId.split('-')[1]}`;
                    return (
                        <button
                            key={index}
                            onClick={() => onClauseClick(clauseId)}
                            className="inline font-semibold text-primary underline decoration-primary/50 decoration-dotted underline-offset-2 hover:decoration-solid transition-all bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded-md"
                        >
                            <ClipboardListIcon className="inline-block w-3.5 h-3.5 mr-1 align-text-bottom" />
                            {userFriendlyText}
                        </button>
                    );
                }
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
});


const ChatBubble: React.FC<{ message: ChatMessage; onSendMessage: (msg: string) => void; isAiTyping: boolean; onClauseClick: (clauseId: string) => void; }> = ({ message, onSendMessage, isAiTyping, onClauseClick }) => {
  const isUser = message.sender === 'user';
  const isTyping = message.sender === 'ai' && message.text === '' && !message.error;

  let bubbleContent;
  if (isTyping) {
    bubbleContent = <AiTypingIndicator />;
  } else if (message.error) {
    bubbleContent = (
      <div className="flex flex-col items-start gap-2 p-4">
        <p className="text-destructive">{message.error}</p>
        {message.originalMessage && (
          <button
            onClick={() => onSendMessage(message.originalMessage!)}
            disabled={isAiTyping}
            className="mt-1 px-3 py-1 text-xs font-semibold bg-muted/20 hover:bg-muted/30 rounded-full disabled:opacity-50 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  } else {
    bubbleContent = <div className="p-4"><ParsedMessage text={message.text} onClauseClick={onClauseClick} /></div>;
  }
  
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
         <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
            <BrainCircuitIcon className="w-5 h-5 text-primary-foreground" />
         </div>
      )}
      <div 
        className={`max-w-xl rounded-2xl leading-relaxed shadow-md whitespace-pre-wrap break-words transition-colors duration-300
        ${isUser 
          ? 'bg-primary text-primary-foreground rounded-br-lg' 
          : message.error 
          ? 'bg-destructive/10 border border-destructive/20 rounded-bl-lg'
          : 'glass-panel rounded-bl-lg'
        }`}
      >
        {bubbleContent}
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ onSendMessage: (msg: string) => void }> = ({ onSendMessage }) => {
    const suggestions = [
        "Summarize the most important clauses.",
        "What are the biggest risks for me in this document?",
        "Explain the termination clause in simple terms.",
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in p-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BrainCircuitIcon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Chat with your Document</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
                Ask questions, get summaries, and clarify complex points. Here are some suggestions to get you started:
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
                {suggestions.slice(0, 3).map((suggestion) => (
                    <button
                        key={suggestion}
                        onClick={() => onSendMessage(suggestion)}
                        className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-card/80 border border-border rounded-full hover:bg-muted/20 transition-all duration-200"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const ChatView: React.FC<ChatViewProps> = ({ chatHistory, onSendMessage, isAiTyping, onClauseClick }) => {
  const [input, setInput] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      const scrollThreshold = 100;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;
      
      if (isNearBottom) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [chatHistory, isAiTyping]);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const computedStyle = window.getComputedStyle(textarea);
        const maxHeightString = computedStyle.getPropertyValue('max-height');
        const maxHeight = maxHeightString !== 'none' ? parseInt(maxHeightString, 10) : Infinity;

        if (!isNaN(maxHeight) && scrollHeight > maxHeight) {
            textarea.style.height = `${maxHeight}px`;
        } else {
            textarea.style.height = `${scrollHeight}px`;
        }
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isAiTyping) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto pr-2 pb-4">
        {chatHistory.length === 0 && !isAiTyping ? (
            <EmptyState onSendMessage={onSendMessage} />
        ) : (
            <ul ref={chatContainerRef} role="log" aria-live="polite" className="space-y-6">
                <AnimatePresence>
                    {chatHistory.map((msg) => (
                        <motion.li
                            key={msg.id}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            <ChatBubble message={msg} onSendMessage={onSendMessage} isAiTyping={isAiTyping} onClauseClick={onClauseClick} />
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ul>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex items-end gap-3 relative glass-panel rounded-2xl p-2">
         {isAiTyping && (
             <div className="absolute -top-px -left-px -right-px -bottom-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-flow pointer-events-none rounded-2xl" style={{ backgroundSize: '200% 200%' }}/>
          )}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAiTyping ? "AI is responding..." : "Ask a question about the document..."}
            className="flex-1 bg-transparent border-none px-2 py-2.5 text-base placeholder-muted-foreground focus:ring-0 disabled:opacity-50 resize-none max-h-40 overflow-y-auto"
            disabled={isAiTyping}
          />
          <button 
            type="submit"
            className="w-10 h-10 flex-shrink-0 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={!input.trim() || isAiTyping}
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};