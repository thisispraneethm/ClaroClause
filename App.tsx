import React from 'react';
import type { ContractAnalysis, ChatMessage, AnalysisOptions, DecodedClause } from './types';
import { geminiService } from './services/geminiService';
import { getLatestAnalysis, saveAnalysis, getAllAnalyses, deleteAnalysis, PersistedAnalysis, updateChatHistory } from './services/dbService';
import { Sidebar } from './components/Sidebar';
import { AnalyzeView } from './components/tools/AnalyzeView';
import { ChatView } from './components/tools/ChatView';
import { HomeView } from './components/tools/HomeView';
import { CompareView } from './components/tools/CompareView';
import { DraftView } from './components/tools/DraftView';
import { HistoryView } from './components/tools/HistoryView';
import { DisclaimerModal } from './components/DisclaimerModal';
import { motion, AnimatePresence } from 'framer-motion';
import { LockIcon } from './components/icons/LockIcon';

export type Tool = 'home' | 'analyze' | 'chat' | 'compare' | 'draft' | 'history';

// --- State Management (useReducer) ---

interface AppState {
  activeTool: Tool;
  contractText: string;
  analysis: ContractAnalysis | null;
  chatHistory: ChatMessage[];
  analysisOptions: AnalysisOptions | null;
  isLoading: boolean;
  error: string | null;
  isDocumentLoaded: boolean;
  isChatReady: boolean;
  isAiTyping: boolean;
  showDisclaimer: boolean;
  analysisPending: { text: string; options: AnalysisOptions } | null;
  history: PersistedAnalysis[];
  currentAnalysisId: number | undefined;
  citedClause: { text: string; occurrence: number } | null;
  progress: { current: number; total: number } | null;
}

type AppAction =
  | { type: 'SET_TOOL'; payload: Tool }
  | { type: 'SET_HISTORY'; payload: PersistedAnalysis[] }
  | { type: 'HYDRATE_STATE'; payload: PersistedAnalysis }
  | { type: 'START_NEW' }
  | { type: 'LOAD_ANALYSIS'; payload: PersistedAnalysis }
  | { type: 'ACCEPT_DISCLAIMER' }
  | { type: 'SHOW_DISCLAIMER'; payload: { text: string; options: AnalysisOptions } }
  | { type: 'CLOSE_DISCLAIMER' }
  | { type: 'ANALYSIS_START'; payload: { text: string; options: AnalysisOptions } }
  | { type: 'ANALYSIS_PROGRESS'; payload: { current: number; total: number } | null }
  | { type: 'ANALYSIS_UPDATE'; payload: ContractAnalysis }
  | { type: 'ANALYSIS_SUCCESS'; payload: { analysis: ContractAnalysis; id: number | undefined } }
  | { type: 'ANALYSIS_FAILURE'; payload: string }
  | { type: 'SET_CONTRACT_TEXT'; payload: string }
  | { type: 'CHAT_INIT_SUCCESS' }
  | { type: 'CHAT_INIT_FAILURE'; payload: string }
  | { type: 'SEND_CHAT_MESSAGE'; payload: { userMessage: ChatMessage; aiMessage: ChatMessage } }
  | { type: 'RETRY_CHAT_MESSAGE'; payload: { aiMessage: ChatMessage } }
  | { type: 'STREAM_CHAT_RESPONSE'; payload: { id: string; fullResponse: string } }
  | { type: 'CHAT_RESPONSE_FAILURE'; payload: { id: string; error: string; originalMessage: string } }
  | { type: 'FINISH_CHAT_STREAM' }
  | { type: 'RESET_ACTIVE_ANALYSIS' }
  | { type: 'SET_CITED_CLAUSE'; payload: { text: string; occurrence: number } | null }
  | { type: 'CLEAR_ERROR' };

const initialState: AppState = {
  activeTool: 'home',
  contractText: '',
  analysis: null,
  chatHistory: [],
  analysisOptions: null,
  isLoading: false,
  error: null,
  isDocumentLoaded: false,
  isChatReady: false,
  isAiTyping: false,
  showDisclaimer: false,
  analysisPending: null,
  history: [],
  currentAnalysisId: undefined,
  citedClause: null,
  progress: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TOOL':
      // FIX: Cancel any ongoing AI streams when the user switches tools.
      // This prevents "zombie" processes, resource leaks, and state corruption
      // from background tasks affecting the wrong view.
      geminiService.cancelOngoingStreams();
      return { ...state, activeTool: action.payload, error: null, citedClause: null };
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    case 'HYDRATE_STATE': {
      const persisted = action.payload;
      return {
        ...state,
        contractText: persisted.contractText,
        analysis: persisted.analysis,
        analysisOptions: persisted.options,
        chatHistory: persisted.chatHistory || [],
        currentAnalysisId: persisted.id,
        isDocumentLoaded: true,
      };
    }
    case 'START_NEW':
      geminiService.cancelOngoingStreams();
      return {
        ...state,
        contractText: '',
        analysis: null,
        chatHistory: [],
        isDocumentLoaded: false,
        error: null,
        currentAnalysisId: undefined,
        activeTool: 'analyze',
        isChatReady: false,
      };
    case 'LOAD_ANALYSIS': {
      geminiService.cancelOngoingStreams();
      const item = action.payload;
      return {
        ...state,
        contractText: item.contractText,
        analysis: item.analysis,
        analysisOptions: item.options,
        chatHistory: item.chatHistory || [],
        currentAnalysisId: item.id,
        isDocumentLoaded: true,
        isChatReady: false,
        error: null,
        activeTool: 'analyze',
      };
    }
    case 'SHOW_DISCLAIMER':
      return { ...state, analysisPending: action.payload, showDisclaimer: true };
    case 'ACCEPT_DISCLAIMER':
      return { ...state, showDisclaimer: false, analysisPending: null };
    case 'CLOSE_DISCLAIMER':
      // FIX: Clear the pending analysis state when the disclaimer is dismissed,
      // preventing stale state from persisting.
      return { ...state, showDisclaimer: false, analysisPending: null };
    case 'ANALYSIS_START':
      return {
        ...state,
        error: null,
        isLoading: true,
        analysis: null,
        chatHistory: [],
        isDocumentLoaded: false,
        contractText: action.payload.text,
        analysisOptions: action.payload.options,
        progress: null,
        isChatReady: false,
      };
    case 'SET_CONTRACT_TEXT':
        // FIX: Clear any previous errors when the user starts modifying the input.
        return { ...state, contractText: action.payload, error: null };
    case 'CLEAR_ERROR':
        return { ...state, error: null };
    case 'ANALYSIS_PROGRESS':
      return { ...state, progress: action.payload };
    case 'ANALYSIS_UPDATE':
      return { ...state, analysis: action.payload };
    case 'ANALYSIS_SUCCESS':
      return {
        ...state,
        isLoading: false,
        progress: null,
        analysis: action.payload.analysis,
        isDocumentLoaded: true,
        currentAnalysisId: action.payload.id,
      };
    case 'ANALYSIS_FAILURE':
      return { ...state, isLoading: false, progress: null, error: action.payload };
    case 'CHAT_INIT_SUCCESS':
      return { ...state, isChatReady: true };
    case 'CHAT_INIT_FAILURE':
      return { ...state, isChatReady: false, error: action.payload };
    case 'SEND_CHAT_MESSAGE': {
      // FIX: Filter out any previous, incomplete AI message bubbles.
      // This handles the case where a user sends a new message while the AI is still "typing",
      // preventing a stuck typing indicator from the cancelled stream.
      const cleanedHistory = state.chatHistory.filter(
        (msg) => !(msg.sender === 'ai' && msg.text === '' && !msg.error)
      );
      return {
        ...state,
        isAiTyping: true,
        chatHistory: [...cleanedHistory, action.payload.userMessage, action.payload.aiMessage],
      };
    }
    case 'RETRY_CHAT_MESSAGE': {
      // Filter out the previous AI error message before retrying.
      const cleanedHistory = state.chatHistory.filter(msg => !msg.error);
      return {
        ...state,
        isAiTyping: true,
        chatHistory: [...cleanedHistory, action.payload.aiMessage],
      };
    }
    case 'STREAM_CHAT_RESPONSE':
      return {
        ...state,
        chatHistory: state.chatHistory.map(msg =>
          msg.id === action.payload.id ? { ...msg, text: action.payload.fullResponse } : msg
        ),
      };
    case 'CHAT_RESPONSE_FAILURE':
      return {
        ...state,
        isAiTyping: false,
        chatHistory: state.chatHistory.map(msg =>
          msg.id === action.payload.id ? { ...msg, text: '', error: action.payload.error, originalMessage: action.payload.originalMessage } : msg
        ),
      };
    case 'FINISH_CHAT_STREAM':
      return { ...state, isAiTyping: false };
    case 'RESET_ACTIVE_ANALYSIS':
        geminiService.cancelOngoingStreams();
        return {
            ...state,
            contractText: '',
            analysis: null,
            chatHistory: [],
            isDocumentLoaded: false,
            error: null,
            currentAnalysisId: undefined,
            // Keep the user on the history page to see the result of their action
            activeTool: 'history',
            isChatReady: false,
        };
    case 'SET_CITED_CLAUSE':
      return { ...state, citedClause: action.payload, activeTool: 'analyze' };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = React.useReducer(appReducer, initialState);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    const allAnalyses = await getAllAnalyses();
    dispatch({ type: 'SET_HISTORY', payload: allAnalyses });
  };

  React.useEffect(() => {
    const hydrateState = async () => {
      const persisted = await getLatestAnalysis();
      if (persisted) {
        dispatch({ type: 'HYDRATE_STATE', payload: persisted });
      }
    };
    hydrateState();
    loadHistory();
  }, []);

  React.useEffect(() => {
    if (state.isDocumentLoaded && state.analysis) {
      geminiService.initializeChat(state.analysis)
        .then(() => dispatch({ type: 'CHAT_INIT_SUCCESS' }))
        .catch(err => {
          console.error("Failed to initialize chat:", err);
          dispatch({ type: 'CHAT_INIT_FAILURE', payload: "Could not initialize the chat assistant." });
        });
    }
  }, [state.isDocumentLoaded, state.analysis]);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('disclaimerAccepted', 'true');
    const pending = state.analysisPending;
    dispatch({ type: 'ACCEPT_DISCLAIMER' });
    if (pending && pending.text.trim()) {
      handleAnalyzeContract(pending.text, pending.options);
    }
  };

  const handleAnalyzeContract = async (text: string, options: AnalysisOptions) => {
    if (localStorage.getItem('disclaimerAccepted') !== 'true') {
      dispatch({ type: 'SHOW_DISCLAIMER', payload: { text, options } });
      return;
    }
    dispatch({ type: 'ANALYSIS_START', payload: { text, options } });

    const tempAnalysis: ContractAnalysis = { documentTitle: "Analyzing...", overallScore: 0, keyTakeaways: [], clauses: [] };

    try {
      for await (const event of geminiService.decodeContractStream(text, options)) {
        if (event.type === 'progress') {
          dispatch({ type: 'ANALYSIS_PROGRESS', payload: event.data });
        } else if (event.type === 'clause') {
          tempAnalysis.clauses.push(event.data);
          dispatch({ type: 'ANALYSIS_UPDATE', payload: { ...tempAnalysis } });
        } else if (event.type === 'header') {
          tempAnalysis.documentTitle = event.data.documentTitle;
          tempAnalysis.overallScore = event.data.overallScore;
          tempAnalysis.keyTakeaways = event.data.keyTakeaways;
        }
      }
      dispatch({ type: 'ANALYSIS_UPDATE', payload: { ...tempAnalysis } });
      const savedId = await saveAnalysis(text, tempAnalysis, options, []);
      dispatch({ type: 'ANALYSIS_SUCCESS', payload: { analysis: tempAnalysis, id: savedId } });
      await loadHistory();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
      dispatch({ type: 'ANALYSIS_FAILURE', payload: message });
    } finally {
        dispatch({ type: 'ANALYSIS_PROGRESS', payload: null });
    }
  };

  /**
   * FIX: Refactored chat streaming logic into a single helper to avoid code duplication.
   * This handles the core logic for sending a message and processing the AI's response stream.
   */
  const _streamAiResponse = async (message: string, aiMessageId: string) => {
      try {
        let fullResponse = '';
        for await (const chunk of geminiService.sendChatMessageStream(message)) {
          fullResponse += chunk;
          dispatch({ type: 'STREAM_CHAT_RESPONSE', payload: { id: aiMessageId, fullResponse } });
        }
      } catch (e) {
        console.error("Chat failed:", e);
        if (e instanceof Error && e.name === 'AbortError') {
          console.log("Chat stream was cancelled.");
          return; // Don't show an error if it was a user-initiated cancellation.
        }
        const errorText = e instanceof Error ? e.message : 'The AI failed to respond. Please try again.';
        dispatch({ type: 'CHAT_RESPONSE_FAILURE', payload: { id: aiMessageId, error: errorText, originalMessage: message } });
      } finally {
        dispatch({ type: 'FINISH_CHAT_STREAM' });
      }
  };

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: message };
    const aiMessageId = (Date.now() + 1).toString();
    const aiTypingMessage: ChatMessage = { id: aiMessageId, sender: 'ai', text: '' };

    dispatch({ type: 'SEND_CHAT_MESSAGE', payload: { userMessage, aiMessage: aiTypingMessage } });
    await _streamAiResponse(message, aiMessageId);
  };

  const handleRetryMessage = async (originalMessage: string) => {
    const aiMessageId = (Date.now() + 1).toString();
    const aiTypingMessage: ChatMessage = { id: aiMessageId, sender: 'ai', text: '' };

    dispatch({ type: 'RETRY_CHAT_MESSAGE', payload: { aiMessage: aiTypingMessage } });
    await _streamAiResponse(originalMessage, aiMessageId);
  };
  
   // Persist chat history whenever it changes, but not while AI is typing.
  React.useEffect(() => {
    if (state.currentAnalysisId && !state.isAiTyping && state.chatHistory.length > 0) {
      // Ensure we don't save during initial hydration or loading.
      const lastMessage = state.chatHistory[state.chatHistory.length - 1];
      if(lastMessage.sender === 'ai' && lastMessage.text === '' && !lastMessage.error) return;

      updateChatHistory(state.currentAnalysisId, state.chatHistory);
    }
  }, [state.chatHistory, state.isAiTyping, state.currentAnalysisId]);

  const handleDeleteAnalysis = async (id: number) => {
    const isDeletingCurrent = state.currentAnalysisId === id;
    
    await deleteAnalysis(id);
    await loadHistory();

    if (isDeletingCurrent) {
        dispatch({ type: 'RESET_ACTIVE_ANALYSIS' });
    }
  };

  const handleClauseCitationClick = (clauseId: string) => {
    if (!state.analysis) return;
    const clauseToCite = state.analysis.clauses.find(c => c.id === clauseId);
    if (clauseToCite) {
      dispatch({ type: 'SET_CITED_CLAUSE', payload: { text: clauseToCite.originalClause, occurrence: clauseToCite.occurrenceIndex } });
    }
  };

  const renderTool = () => {
    switch (state.activeTool) {
      case 'home':
        return <HomeView onStartAnalysis={() => dispatch({ type: 'SET_TOOL', payload: 'analyze' })} />;
      case 'analyze':
        return <AnalyzeView
          onAnalyze={handleAnalyzeContract}
          analysis={state.analysis}
          contractText={state.contractText}
          setContractText={(text) => dispatch({ type: 'SET_CONTRACT_TEXT', payload: text })}
          isLoading={state.isLoading}
          error={state.error}
          onStartNew={() => dispatch({ type: 'START_NEW' })}
          progress={state.progress}
          analysisOptions={state.analysisOptions}
          citedClause={state.citedClause}
          onSetError={(message) => dispatch({ type: 'ANALYSIS_FAILURE', payload: message })}
          onClearError={() => dispatch({ type: 'CLEAR_ERROR' })}
        />;
      case 'chat':
        return state.isDocumentLoaded ?
          <ChatView
            chatHistory={state.chatHistory}
            onSendMessage={handleSendMessage}
            onRetryMessage={handleRetryMessage}
            isAiTyping={state.isAiTyping}
            onClauseClick={handleClauseCitationClick}
          /> : <HomeView onStartAnalysis={() => dispatch({ type: 'SET_TOOL', payload: 'analyze' })} />;
      case 'compare':
        return <CompareView initialDocument={state.contractText} />
      case 'draft':
        return <DraftView />;
      case 'history':
        return <HistoryView
          history={state.history}
          onLoad={(item) => dispatch({ type: 'LOAD_ANALYSIS', payload: item })}
          onDelete={handleDeleteAnalysis}
        />
      default:
        return <HomeView onStartAnalysis={() => dispatch({ type: 'SET_TOOL', payload: 'analyze' })} />;
    }
  }

  return (
    <div className="flex h-full font-sans text-foreground bg-background">
      <DisclaimerModal
        isOpen={state.showDisclaimer}
        onAccept={handleAcceptDisclaimer}
        onClose={() => dispatch({ type: 'CLOSE_DISCLAIMER' })}
      />
      <Sidebar
        activeTool={state.activeTool}
        setActiveTool={(tool) => dispatch({ type: 'SET_TOOL', payload: tool })}
        isDocumentLoaded={state.isDocumentLoaded}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.activeTool}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              {renderTool()}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="flex-shrink-0 p-2 text-center text-xs text-muted-foreground border-t border-border bg-background/50 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
                <LockIcon className="w-3 h-3 flex-shrink-0" />
                <span>BETA RELEASE. Documents are processed securely in-memory and are never stored.</span>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;