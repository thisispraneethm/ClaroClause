import React from 'react';
import type { ContractAnalysis, ChatMessage, AnalysisOptions } from './types';
import { geminiService } from './services/geminiService';
import { getLatestAnalysis, saveAnalysis, clearAnalysisHistory } from './services/dbService';
import { Sidebar } from './components/Sidebar';
import { AnalyzeView } from './components/tools/AnalyzeView';
import { ChatView } from './components/tools/ChatView';
import { HomeView } from './components/tools/HomeView';
import { AboutView } from './components/tools/AboutView';
import { CompareView } from './components/tools/CompareView';
import { DisclaimerModal } from './components/DisclaimerModal';
import { motion, AnimatePresence } from 'framer-motion';

export type Tool = 'home' | 'analyze' | 'chat' | 'compare' | 'draft' | 'about';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = React.useState<Tool>('home');
  const [contractText, setContractText] = React.useState<string>('');
  const [analysis, setAnalysis] = React.useState<ContractAnalysis | null>(null);
  const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
  const [analysisOptions, setAnalysisOptions] = React.useState<AnalysisOptions | null>(null);
  
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDocumentLoaded, setIsDocumentLoaded] = React.useState<boolean>(false);
  const [isChatReady, setIsChatReady] = React.useState<boolean>(false);
  const [isAiTyping, setIsAiTyping] = React.useState<boolean>(false);
  const [showDisclaimer, setShowDisclaimer] = React.useState<boolean>(false);
  const [analysisPending, setAnalysisPending] = React.useState<{text: string, options: AnalysisOptions} | null>(null);

  const [progress, setProgress] = React.useState<{ current: number; total: number } | null>(null);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // FIX: Hydrate application state from IndexedDB on initial load.
    // This allows the user's session to be persisted across page reloads.
    const loadPersistedState = async () => {
        try {
            const persisted = await getLatestAnalysis();
            if (persisted) {
                setContractText(persisted.contractText);
                setAnalysis(persisted.analysis);
                setAnalysisOptions(persisted.options);
                // FIX (UX): Set the active tool to 'analyze' to immediately show the restored session.
                setActiveTool('analyze');
            }
        } catch (err) {
            console.error("Failed to load persisted state from database:", err);
            // If the database is corrupt or fails to load, clear it to prevent a broken state.
            await clearAnalysisHistory();
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadPersistedState();
  }, []);

  React.useEffect(() => {
    const hasAccepted = localStorage.getItem('claroclause_disclaimer_accepted');
    if (!hasAccepted) {
        setShowDisclaimer(true);
    }
  }, []);
  
  React.useEffect(() => {
    // FIX: This effect makes the main app content inert when the modal is open,
    // preventing background interaction and improving accessibility.
    const mainContent = mainContentRef.current;
    if (mainContent) {
        // The 'inert' property is not yet in the default TS DOM types.
        // We cast to any to use it.
        (mainContent as any).inert = showDisclaimer;
    }
  }, [showDisclaimer]);


  const handleDisclaimerAccept = () => {
      localStorage.setItem('claroclause_disclaimer_accepted', 'true');
      setShowDisclaimer(false);
      if (analysisPending) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          triggerAnalysis(analysisPending.text, analysisPending.options);
          setAnalysisPending(null);
      }
  };
  
  const handleDisclaimerClose = () => {
    setShowDisclaimer(false);
    // If the user closes the modal, cancel the pending analysis.
    setAnalysisPending(null);
  };


  const triggerAnalysis = React.useCallback(async (text: string, options: AnalysisOptions) => {
      // Reset all states for a new analysis
      setIsLoading(true);
      setError(null);
      setAnalysis(null);
      setContractText(text);
      setAnalysisOptions(options); // Persist options in case of retry
      setIsDocumentLoaded(false);
      setIsChatReady(false);
      setChatHistory([]);
      setProgress(null);

      let resultsFound = false;

      try {
        const stream = geminiService.decodeContractStream(text, options);

        for await (const event of stream) {
          if (event.type === 'progress') {
            setProgress(event.data);
          } else if (event.type === 'clause') {
            resultsFound = true;
            setAnalysis(prev => ({
              overallScore: prev?.overallScore || 0,
              keyTakeaways: prev?.keyTakeaways || [],
              clauses: [...(prev?.clauses || []), event.data],
            }));
          } else if (event.type === 'header') {
            resultsFound = true;
            setAnalysis(prev => {
              if (!prev) return null; // Should not happen if clauses exist
              return {
                ...prev,
                overallScore: event.data.overallScore,
                keyTakeaways: event.data.keyTakeaways,
              };
            });
          }
        }
        
        if (!resultsFound) {
             setError('The AI could not analyze the document. This can happen with very short, unclear, or unsupported text. Please try again with a different document.');
        }

      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to analyze the document. The AI model may be busy or the response was invalid. Please try again.');
        // FIX: The flawed check for partial results using stale state has been removed.
        // The error message from geminiService is sufficient to indicate incomplete results.
      } finally {
        setIsLoading(false);
        setProgress(null);
      }
  }, []);

  const handleAnalyze = React.useCallback((text: string, options: AnalysisOptions) => {
    if (!text.trim()) {
        setError('Please provide some text to analyze.');
        return;
    }
    const hasAccepted = localStorage.getItem('claroclause_disclaimer_accepted');
    if (!hasAccepted) {
        setAnalysisPending({ text, options });
        setShowDisclaimer(true);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        triggerAnalysis(text, options);
    }
  }, [triggerAnalysis]);
  
  const handleStartAnalysis = () => {
    setActiveTool('analyze');
  }

  const handleSendMessage = React.useCallback(async (message: string) => {
    if (isAiTyping) return;

    const userMessageId = crypto.randomUUID();
    const aiMessageId = crypto.randomUUID();

    const newUserMessage: ChatMessage = { id: userMessageId, sender: 'user', text: message };
    const aiTypingMessage: ChatMessage = { id: aiMessageId, sender: 'ai', text: '' };
    
    setChatHistory(prev => [...prev.filter(m => !m.error), newUserMessage, aiTypingMessage]);
    setIsAiTyping(true);
    
    try {
      const stream = geminiService.sendChatMessageStream(message);
      
      for await (const chunk of stream) {
        setChatHistory(prev => prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, text: msg.text + chunk } : msg
        ));
      }
    } catch (err) {
      console.error(err);
      const errorText = "Sorry, I couldn't get a response from the AI.";
      setChatHistory(prev => prev.map(msg => 
        msg.id === aiMessageId ? { ...msg, error: errorText, text: '', originalMessage: message } : msg
      ));
    } finally {
      setIsAiTyping(false);
    }
  }, [isAiTyping]);

  const handleReset = () => {
    setContractText('');
    setAnalysis(null);
    setError(null);
    setIsDocumentLoaded(false);
    setIsChatReady(false);
    setActiveTool('analyze');
    setChatHistory([]);
    setProgress(null);
    setAnalysisOptions(null);
    // FIX: Clear the persisted analysis from the database.
    clearAnalysisHistory().catch(console.error);
  };
  
  React.useEffect(() => {
    // FIX: Prevent chat initialization if an analysis error occurred.
    // This ensures data integrity by not allowing chat on partial/failed results.
    if (analysis && !isLoading && !error && !isChatReady && analysis.clauses.length > 0) {
      // FIX: Persist the successful analysis to IndexedDB for session recovery.
      if (contractText && analysisOptions) {
        saveAnalysis(contractText, analysis, analysisOptions).catch(err => {
            console.error("Failed to save analysis to DB:", err);
        });
      }

      setIsDocumentLoaded(true);
      geminiService.initializeChat(analysis)
        .then(() => {
          setIsChatReady(true);
        })
        .catch(err => {
            console.error("Failed to initialize chat:", err);
            setError("The document was analyzed, but the chat session could not be started. Please try again.");
            setIsChatReady(false);
        });
    }
  }, [analysis, isLoading, isChatReady, error, contractText, analysisOptions]);

  React.useEffect(() => {
    if (activeTool === 'chat' && isChatReady && chatHistory.length === 0) {
      setChatHistory([{ id: crypto.randomUUID(), sender: 'ai', text: "I've read the document. Feel free to ask me anything about it." }]);
    }
  }, [activeTool, isChatReady, chatHistory.length]);

  const renderTool = () => {
    switch (activeTool) {
      case 'home':
        return <HomeView onStartAnalysis={handleStartAnalysis} />;
      case 'analyze':
        return (
          <AnalyzeView 
            onAnalyze={handleAnalyze}
            analysis={analysis}
            contractText={contractText}
            setContractText={setContractText}
            isLoading={isLoading}
            error={error}
            onStartNew={handleReset}
            progress={progress}
            analysisOptions={analysisOptions}
          />
        );
      case 'chat':
        return (
          <ChatView 
            chatHistory={chatHistory} 
            onSendMessage={handleSendMessage} 
            isAiTyping={isAiTyping}
          />
        );
      case 'compare':
        return <CompareView initialDocument={contractText} />;
      case 'about':
        return <AboutView />;
      default:
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 glass-panel rounded-lg">
                    <h2 className="text-2xl font-bold mb-2">Feature Coming Soon!</h2>
                    <p className="text-muted-foreground">The "{activeTool}" tool is under development. Please check back later.</p>
                </div>
            </div>
        )
    }
  };

  return (
    <div className="flex h-screen text-foreground font-sans">
      <div ref={mainContentRef} className="flex h-full w-full">
        <Sidebar 
          activeTool={activeTool} 
          setActiveTool={setActiveTool} 
          isDocumentLoaded={isDocumentLoaded && isChatReady}
        />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
              <motion.div
                  key={activeTool}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="h-full"
              >
                  {renderTool()}
              </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <DisclaimerModal 
        isOpen={showDisclaimer} 
        onAccept={handleDisclaimerAccept}
        onClose={handleDisclaimerClose}
      />
    </div>
  );
};

export default App;
