import React from 'react';
import type { ContractAnalysis, ChatMessage, AnalysisOptions } from './types';
import { geminiService } from './services/geminiService';
import { getLatestAnalysis, saveAnalysis, getAllAnalyses, deleteAnalysis, PersistedAnalysis, updateChatHistory } from './services/dbService';
import { Sidebar } from './components/Sidebar';
import { AnalyzeView } from './components/tools/AnalyzeView';
import { ChatView } from './components/tools/ChatView';
import { HomeView } from './components/tools/HomeView';
import { AboutView } from './components/tools/AboutView';
import { CompareView } from './components/tools/CompareView';
import { DraftView } from './components/tools/DraftView';
import { HistoryView } from './components/tools/HistoryView';
import { DisclaimerModal } from './components/DisclaimerModal';
import { motion, AnimatePresence } from 'framer-motion';

export type Tool = 'home' | 'analyze' | 'chat' | 'compare' | 'draft' | 'history' | 'about';

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

  const [isDrafting, setIsDrafting] = React.useState<boolean>(false);
  const [draftResult, setDraftResult] = React.useState<string>('');
  
  const [history, setHistory] = React.useState<PersistedAnalysis[]>([]);
  
  // The ID of the current analysis is tracked to update its chat history in the database.
  const [currentAnalysisId, setCurrentAnalysisId] = React.useState<number | undefined>(undefined);

  const [citedClause, setCitedClause] = React.useState<{ text: string; occurrence: number } | null>(null);

  const [progress, setProgress] = React.useState<{ current: number; total: number } | null>(null);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    const allAnalyses = await getAllAnalyses();
    setHistory(allAnalyses);
  };

  React.useEffect(() => {
    // Hydrate application state from IndexedDB on initial load.
    // This allows the user's session to be restored after a page reload, including chat history.
    const hydrateState = async () => {
      const persisted = await getLatestAnalysis();
      if (persisted) {
        setContractText(persisted.contractText);
        setAnalysis(persisted.analysis);
        setAnalysisOptions(persisted.options);
        setChatHistory(persisted.chatHistory || []);
        setCurrentAnalysisId(persisted.id);
        setIsDocumentLoaded(true);
      }
    };
    hydrateState();
    loadHistory();

    const hasAcceptedDisclaimer = localStorage.getItem('disclaimerAccepted') === 'true';
    if (!hasAcceptedDisclaimer) {
        setShowDisclaimer(true);
    }
  }, []);
  
  React.useEffect(() => {
    if (isDocumentLoaded && analysis) {
      geminiService.initializeChat(analysis)
        .then(() => setIsChatReady(true))
        .catch(err => {
            console.error("Failed to initialize chat:", err);
            setError("Could not initialize the chat assistant.");
        });
    } else {
      setIsChatReady(false);
    }
  }, [isDocumentLoaded, analysis]);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclaimerAccepted', 'true');
    setShowDisclaimer(false);
    if (analysisPending) {
        handleAnalyzeContract(analysisPending.text, analysisPending.options);
        setAnalysisPending(null);
    }
  };

  const handleAnalyzeContract = async (text: string, options: AnalysisOptions) => {
    if (localStorage.getItem('disclaimerAccepted') !== 'true') {
        setAnalysisPending({ text, options });
        setShowDisclaimer(true);
        return;
    }
    
    setError(null);
    setIsLoading(true);
    setAnalysis(null);
    setChatHistory([]);
    setIsDocumentLoaded(false);
    setContractText(text);
    setAnalysisOptions(options);

    const tempAnalysis: ContractAnalysis = { documentTitle: "Analyzing...", overallScore: 0, keyTakeaways: [], clauses: [] };
    
    try {
        for await (const event of geminiService.decodeContractStream(text, options)) {
            if (event.type === 'progress') {
                setProgress(event.data);
            } else if (event.type === 'clause') {
                tempAnalysis.clauses.push(event.data);
                setAnalysis({ ...tempAnalysis });
            } else if (event.type === 'header') {
                tempAnalysis.documentTitle = event.data.documentTitle;
                tempAnalysis.overallScore = event.data.overallScore;
                tempAnalysis.keyTakeaways = event.data.keyTakeaways;
            }
        }
        setAnalysis(tempAnalysis);
        setIsDocumentLoaded(true);
        const savedId = await saveAnalysis(text, tempAnalysis, options, []);
        setCurrentAnalysisId(savedId);
        await loadHistory();
    } catch (e) {
        console.error("Analysis failed:", e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred during analysis.');
        // Clear partial analysis results on failure to prevent displaying incomplete data.
        setAnalysis(null);
    } finally {
        setIsLoading(false);
        setProgress(null);
    }
  };
  
  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: message };
    const aiMessageId = (Date.now() + 1).toString();
    const aiTypingMessage: ChatMessage = { id: aiMessageId, sender: 'ai', text: '' };
    
    // Batch the user message and AI typing indicator for a more efficient state update.
    setIsAiTyping(true);
    setChatHistory(prev => [...prev, userMessage, aiTypingMessage]);

    try {
      let fullResponse = '';
      for await (const chunk of geminiService.sendChatMessageStream(message)) {
        fullResponse += chunk;
        setChatHistory(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: fullResponse } : msg));
      }
    } catch(e) {
        console.error("Chat failed:", e);
        const errorText = e instanceof Error ? e.message : 'The AI failed to respond. Please try again.';
        // Update the typing message with an error state.
        setChatHistory(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: '', error: errorText, originalMessage: message } : msg));
    } finally {
        setIsAiTyping(false);
        // Persist the updated chat history to IndexedDB after the AI responds.
        if (currentAnalysisId) {
            // Use a callback with the setter to get the most up-to-date state after the stream.
            setChatHistory(currentHistory => {
                if (currentAnalysisId) {
                    updateChatHistory(currentAnalysisId, currentHistory);
                }
                return currentHistory;
            });
        }
    }
  };

  const handleStartNew = () => {
      setContractText('');
      setAnalysis(null);
      setChatHistory([]);
      setIsDocumentLoaded(false);
      setError(null);
      setCurrentAnalysisId(undefined);
      setActiveTool('analyze');
  };

  const handleDraftDocument = async (prompt: string) => {
    setError(null);
    setIsDrafting(true);
    setDraftResult('');
    try {
      let fullResponse = '';
      for await (const chunk of geminiService.draftDocumentStream(prompt)) {
        fullResponse += chunk;
        setDraftResult(fullResponse);
      }
    } catch (e) {
      console.error("Drafting failed:", e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred while drafting.');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleLoadAnalysis = (item: PersistedAnalysis) => {
    setContractText(item.contractText);
    setAnalysis(item.analysis);
    setAnalysisOptions(item.options);
    setChatHistory(item.chatHistory || []);
    setCurrentAnalysisId(item.id);
    setIsDocumentLoaded(true);
    setError(null);
    setActiveTool('analyze');
  };

  const handleDeleteAnalysis = async (id: number) => {
    await deleteAnalysis(id);
    await loadHistory();
  };
  
  // Citation logic now uses unique clause IDs for 100% accuracy and performance.
  const handleClauseCitationClick = (clauseId: string) => {
    if (!analysis) return;
    // Find clause by its unique ID.
    const clauseToCite = analysis.clauses.find(c => c.id === clauseId);
    if (clauseToCite) {
        // The clause object already contains its text and occurrence index.
        setCitedClause({ text: clauseToCite.originalClause, occurrence: clauseToCite.occurrenceIndex });
        setActiveTool('analyze');
    }
  };
  
  const handleToolChange = (tool: Tool) => {
    setError(null);
    setCitedClause(null); // Clear citation when switching tools
    setActiveTool(tool);
  };

  const renderTool = () => {
    switch(activeTool) {
      case 'home':
        return <HomeView onStartAnalysis={() => setActiveTool('analyze')} />;
      case 'analyze':
        return <AnalyzeView 
                  onAnalyze={handleAnalyzeContract} 
                  analysis={analysis}
                  contractText={contractText}
                  setContractText={setContractText}
                  isLoading={isLoading}
                  error={error}
                  onStartNew={handleStartNew}
                  progress={progress}
                  analysisOptions={analysisOptions}
                  citedClause={citedClause}
                />;
      case 'chat':
        return isDocumentLoaded ? 
               <ChatView 
                  chatHistory={chatHistory} 
                  onSendMessage={handleSendMessage} 
                  isAiTyping={isAiTyping}
                  onClauseClick={handleClauseCitationClick}
                /> : <HomeView onStartAnalysis={() => setActiveTool('analyze')} />;
      case 'compare':
        return <CompareView initialDocument={contractText}/>
      case 'draft':
        return <DraftView 
                onDraft={handleDraftDocument} 
                isDrafting={isDrafting} 
                draftResult={draftResult} 
                setDraftResult={setDraftResult}
                error={error}
               />
      case 'history':
        return <HistoryView 
                history={history} 
                onLoad={handleLoadAnalysis}
                onDelete={handleDeleteAnalysis}
               />
      case 'about':
        return <AboutView />;
      default:
        return <HomeView onStartAnalysis={() => setActiveTool('analyze')} />;
    }
  }

  return (
    <div className="flex h-full font-sans">
      <DisclaimerModal 
        isOpen={showDisclaimer} 
        onAccept={handleAcceptDisclaimer} 
        onClose={() => setShowDisclaimer(false)} 
      />
      <Sidebar 
        activeTool={activeTool} 
        setActiveTool={handleToolChange} 
        isDocumentLoaded={isDocumentLoaded} 
      />
      <main ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full"
            >
              {renderTool()}
            </motion.div>
          </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
