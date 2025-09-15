import React from 'react';
import type { ChatMessage } from '../../types';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BrainCircuitIcon } from '../icons/BrainCircuitIcon';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatViewProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isAiTyping: boolean;
}

const AiTypingIndicator: React.FC = () => (
    <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.3s]"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.15s]"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse"></span>
    </div>
);

const ChatBubble: React.FC<{ message: ChatMessage; onSendMessage: (msg: string) => void; isAiTyping: boolean; }> = ({ message, onSendMessage, isAiTyping }) => {
  const isUser = message.sender === 'user';
  const isTyping = message.sender === 'ai' && message.text === '' && !message.error;

  let bubbleContent;
  if (isTyping) {
    bubbleContent = <AiTypingIndicator />;
  } else if (message.error) {
    // FIX: Render a retry button for better error recovery.
    bubbleContent = (
      <div className="flex flex-col items-start gap-2">
        <p>{message.error}</p>
        {message.originalMessage && (
          <button
            onClick={() => onSendMessage(message.originalMessage!)}
            disabled={isAiTyping}
            className="mt-1 px-3 py-1 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-50 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  } else {
    bubbleContent = message.text;
  }
  
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
         <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <BrainCircuitIcon className="w-5 h-5 text-primary-foreground" />
         </div>
      )}
      <div 
        className={`max-w-xl p-4 rounded-xl text-sm leading-relaxed shadow-md whitespace-pre-wrap break-words transition-colors duration-300
        ${isUser 
          ? 'bg-gradient-to-br from-violet-600 to-fuchsia-500 text-primary-foreground rounded-br-none' 
          : message.error 
          ? 'bg-red-500/10 border border-red-500/30 text-red-100 rounded-bl-none'
          : 'bg-white/30 backdrop-blur-sm text-foreground rounded-bl-none glass-panel'
        }`}
      >
        {bubbleContent}
      </div>
    </div>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({ chatHistory, onSendMessage, isAiTyping }) => {
  const [input, setInput] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      const scrollThreshold = 100; // Only scroll if user is within 100px of the bottom
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;
      
      // Don't scroll aggressively if the user has scrolled up to read history
      if (isNearBottom) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [chatHistory, isAiTyping]);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto'; // Reset height to get accurate scrollHeight
        const scrollHeight = textarea.scrollHeight;

        const computedStyle = window.getComputedStyle(textarea);
        // FIX: Dynamically get max-height from CSS to avoid hardcoded values.
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
        {/* FIX: Use semantic list elements for chat history to improve accessibility. */}
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
                        <ChatBubble message={msg} onSendMessage={onSendMessage} isAiTyping={isAiTyping} />
                    </motion.li>
                ))}
            </AnimatePresence>
        </ul>
        <div ref={chatEndRef} />
      </div>
      <div className="mt-4 pt-4 border-t border-white/20">
        <form onSubmit={handleSubmit} className="flex items-end gap-3 relative">
         {isAiTyping && (
             <div className="absolute -top-px -left-px -right-px -bottom-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-flow pointer-events-none rounded-xl" style={{ backgroundSize: '200% 200%' }}/>
          )}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAiTyping ? "AI is responding..." : "Ask a question about the document..."}
            className="flex-1 bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-sm placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 shadow-glass resize-none max-h-40 overflow-y-auto"
            disabled={isAiTyping}
          />
          <button 
            type="submit"
            className="w-11 h-11 flex-shrink-0 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={!input.trim() || isAiTyping}
            aria-label="Send message"
          >
            <SparklesIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};