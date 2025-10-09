import React from 'react';
import type { ChatMessage } from '../../types';
import { BrainCircuitIcon } from '../icons/BrainCircuitIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface ChatViewProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  onRetryMessage: (message: string) => void;
  isAiTyping: boolean;
  onClauseClick: (clauseId: string) => void;
  isChatReady: boolean;
  onRetryInit: () => void;
  prepopulatedMessage: string | null;
  onClearPrepopulatedMessage: () => void;
}

const AiTypingIndicator: React.FC = () => (
    <div className="flex items-center gap-1.5 p-4">
        <motion.div 
            className="h-2 w-2 bg-muted-foreground rounded-full" 
            animate={{ y: [0, -4, 0] }} 
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
        />
        <motion.div 
            className="h-2 w-2 bg-muted-foreground rounded-full" 
            animate={{ y: [0, -4, 0] }} 
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.1 }}
        />
        <motion.div 
            className="h-2 w-2 bg-muted-foreground rounded-full" 
            animate={{ y: [0, -4, 0] }} 
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
        />
    </div>
);

const ParsedMessage: React.FC<{ text: string; onClauseClick: (clauseId: string) => void }> = React.memo(({ text, onClauseClick }) => {
    const parts = text.split(/(\[Citation: [a-zA-Z0-9-]+?\])/g);
    
    return (
        <>
            {parts.map((part, index) => {
                const match = part.match(/\[Citation: ([a-zA-Z0-9-]+?)\]/);
                if (match) {
                    const clauseId = match[1];
                    // FIX: Improved user-friendliness of citation text.
                    // Instead of a potentially confusing chunk index like "Clause 0", this now
                    // displays the full, more specific identifier like "Clause 0-5".
                    const userFriendlyText = `Clause ${clauseId.replace('clause-', '')}`;
                    return (
                        <button
                            key={index}
                            onClick={() => onClauseClick(clauseId)}
                            className="inline-flex items-center gap-1 font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2 py-0.5 rounded-full transition-all duration-200"
                        >
                            <ClipboardListIcon className="inline-block w-3 h-3" />
                            <span className="text-xs">{userFriendlyText}</span>
                        </button>
                    );
                }
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
});


const ChatBubble: React.FC<{ message: ChatMessage; onRetryMessage: (msg: string) => void; isAiTyping: boolean; onClauseClick: (clauseId: string) => void; }> = ({ message, onRetryMessage, isAiTyping, onClauseClick }) => {
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
            onClick={() => onRetryMessage(message.originalMessage!)}
            disabled={isAiTyping}
            className="mt-1 px-3 py-1 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-full disabled:opacity-50 transition-colors"
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
         <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-primary/20">
            <SparklesIcon className="w-5 h-5 text-primary-foreground" />
         </div>
      )}
      <div 
        className={`max-w-xl rounded-2xl leading-relaxed shadow-md whitespace-pre-wrap break-words transition-colors duration-300
        ${isUser 
          ? 'bg-primary text-primary-foreground rounded-br-lg' 
          : message.error 
          ? 'bg-destructive/10 border border-destructive/20 text-destructive rounded-bl-lg'
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
        "What are my biggest risks?",
        "Explain the termination clause.",
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in p-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <BrainCircuitIcon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold font-serif">Chat with your Document</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
                Ask questions, get summaries, and clarify complex points. Here are some suggestions to get you started:
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {suggestions.slice(0, 3).map((suggestion) => (
                    <button
                        key={suggestion}
                        onClick={() => onSendMessage(suggestion)}
                        className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary/80 border border-border rounded-full hover:bg-secondary transition-all duration-200"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
};

const InitErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in p-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 border border-destructive/20">
            <BrainCircuitIcon className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-3xl font-bold font-serif">Chat Unavailable</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
            The chat assistant could not be initialized. This might be a temporary connection issue.
        </p>
        <div className="mt-6">
            <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary/80 border border-border rounded-full hover:bg-secondary transition-all duration-200"
            >
                Try Again
            </button>
        </div>
    </div>
);


export const ChatView: React.FC<ChatViewProps> = ({ chatHistory, onSendMessage, onRetryMessage, isAiTyping, onClauseClick, isChatReady, onRetryInit, prepopulatedMessage, onClearPrepopulatedMessage }) => {
  const [input, setInput] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = React.useRef<HTMLUListElement>(null);
  const prevHistoryLength = React.useRef(chatHistory.length);


  React.useEffect(() => {
    if (prepopulatedMessage) {
      setInput(prepopulatedMessage);
      onClearPrepopulatedMessage();
      textareaRef.current?.focus();
    }
  }, [prepopulatedMessage, onClearPrepopulatedMessage]);

  /**
   * BUG FIX: Hardened the auto-scroll logic.
   * This effect now correctly identifies when the user sends a new message and
   * forces a scroll to the bottom, ensuring their own message is always visible.
   * For incoming AI messages, it preserves the existing behavior of only
   * auto-scrolling if the user is already near the bottom.
   */
  React.useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      const scrollThreshold = 100;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;
      const userJustSentMessage = chatHistory.length > prevHistoryLength.current && chatHistory[chatHistory.length - 1]?.sender === 'user';
      
      if (isNearBottom || userJustSentMessage) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevHistoryLength.current = chatHistory.length;
  }, [chatHistory]);

  React.useEffect(() => {
    if (isChatReady && chatHistory.length === 0) {
      textareaRef.current?.focus();
    }
  }, [isChatReady, chatHistory.length]);

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
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!isChatReady ? (
            <InitErrorState onRetry={onRetryInit} />
        ) : chatHistory.length === 0 && !isAiTyping ? (
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
                            <ChatBubble message={msg} onRetryMessage={onRetryMessage} isAiTyping={isAiTyping} onClauseClick={onClauseClick} />
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ul>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="mt-auto p-4">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            {isAiTyping && (
                <div className="absolute -inset-0.5 rounded-full bg-[length:200%_200%] bg-gradient-to-r from-primary via-fuchsia-400 to-primary animate-flow-border pointer-events-none" />
            )}
            <div className="relative glass-panel rounded-full flex items-end p-2 pl-5">
              <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isAiTyping ? "AI is responding..." : "Ask a question about the document..."}
                  className="flex-1 bg-transparent border-none text-base placeholder-muted-foreground focus:ring-0 disabled:opacity-50 resize-none max-h-40 overflow-y-auto"
                  disabled={isAiTyping || !isChatReady}
                  aria-label="Chat input"
              />
              <button 
                  type="submit"
                  className="w-10 h-10 flex-shrink-0 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:scale-90"
                  disabled={!input.trim() || isAiTyping || !isChatReady}
                  aria-label="Send message"
              >
                  <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};