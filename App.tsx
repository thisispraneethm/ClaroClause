import React, { useLayoutEffect } from 'react';
import type { ContractAnalysis, ChatMessage, AnalysisOptions, DecodedClause, AnalysisPersona, RephrasedClause } from './types';
import { geminiService } from './services/geminiService';
import { getLatestAnalysis, saveAnalysis, getAllAnalyses, deleteAnalysis, PersistedAnalysis, updateChatHistory, clearAnalysisHistory, updateAnalysis } from './services/dbService';
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
  isRephrasing: boolean; // For persona re-analysis
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
  deletingId: number | null;
  prepopulatedChatMessage: string | null;
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
  | { type: 'DELETE_ANALYSIS_START'; payload: number }
  | { type: 'DELETE_ANALYSIS_FINISH'; payload: { error?: string } }
  | { type: 'HISTORY_CLEARED' }
  | { type: 'ANALYSIS_DELETED_EXTERNALLY' }
  | { type: 'SET_CITED_CLAUSE'; payload: { text: string; occurrence: number } | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'PREPOPULATE_CHAT_MESSAGE'; payload: string }
  | { type: 'CLEAR_PREPOPULATED_CHAT_MESSAGE' }
  | { type: 'REPHRASE_START' }
  | { type: 'REPHRASE_SUCCESS'; payload: { rephrasedClauses: RephrasedClause[]; newOptions: AnalysisOptions } }
  | { type: 'REPHRASE_FAILURE'; payload: string };

const initialState: AppState = {
  activeTool: 'home',
  contractText: '',
  analysis: null,
  chatHistory: [],
  analysisOptions: null,
  isLoading: false,
  isRephrasing: false,
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
  deletingId: null,
  prepopulatedChatMessage: null,
};


/**
 * Helper function to load a persisted analysis object into the application state.
 * This removes code duplication between hydration and manual loading actions.
 */
function loadAnalysisIntoState(state: AppState, persisted: PersistedAnalysis): AppState {
    return {
        ...state,
        contractText: persisted.contractText,
        analysis: persisted.analysis,
        analysisOptions: persisted.options,
        chatHistory: persisted.chatHistory || [],
        currentAnalysisId: persisted.id,
        isDocumentLoaded: true,
        isChatReady: false, // Will re-init
        error: null,
    };
}

/**
 * Helper function to reset all analysis-related state to its initial values.
 * This is used when starting a new analysis, clearing history, or when the
 * current analysis is deleted, ensuring a clean state and preventing bugs
 * from stale data.
 */
function resetAnalysisState(state: AppState): Omit<AppState, 'history' | 'activeTool'> {
    return {
        ...state,
        contractText: '',
        analysis: null,
        analysisOptions: null, // Ensures old options don't persist
        chatHistory: [],
        isDocumentLoaded: false,
        error: null,
        currentAnalysisId: undefined,
        isChatReady: false,
    };
}


function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TOOL':
      // It's crucial to cancel any ongoing AI streams or requests when the user switches
      // tools to prevent resource leaks, race conditions, and unexpected state updates.
      geminiService.cancelOngoingOperations();
      return { 
        ...state, 
        activeTool: action.payload, 
        error: null, 
        citedClause: null,
        // Clear pre-populated chat message when navigating away from the chat tool.
        prepopulatedChatMessage: action.payload === 'chat' ? state.prepopulatedChatMessage : null
      };
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    case 'HYDRATE_STATE': {
      return loadAnalysisIntoState(state, action.payload);
    }
    case 'START_NEW':
      geminiService.cancelOngoingOperations();
      return {
        ...state,
        ...resetAnalysisState(state),
        activeTool: 'analyze',
      };
    case 'LOAD_ANALYSIS': {
      geminiService.cancelOngoingOperations();
      return {
        ...loadAnalysisIntoState(state, action.payload),
        activeTool: 'analyze',
      };
    }
    case 'SHOW_DISCLAIMER':
      return { ...state, analysisPending: action.payload, showDisclaimer: true };
    case 'ACCEPT_DISCLAIMER':
      return { ...state, showDisclaimer: false, analysisPending: null };
    case 'CLOSE_DISCLAIMER':
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
    case 'SET_CONTRACT_TEXT': {
        const isModifyingLoadedDoc = state.isDocumentLoaded;
        return {
            ...state,
            contractText: action.payload,
            error: null,
            analysis: isModifyingLoadedDoc ? null : state.analysis,
            chatHistory: isModifyingLoadedDoc ? [] : state.chatHistory,
            isDocumentLoaded: isModifyingLoadedDoc ? false : state.isDocumentLoaded,
            currentAnalysisId: isModifyingLoadedDoc ? undefined : state.currentAnalysisId,
            isChatReady: isModifyingLoadedDoc ? false : state.isChatReady,
        };
    }
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
        geminiService.cancelOngoingOperations();
        return {
            ...state,
            ...resetAnalysisState(state),
            activeTool: 'history',
        };
    case 'DELETE_ANALYSIS_START':
      return { ...state, deletingId: action.payload };
    case 'DELETE_ANALYSIS_FINISH':
      return { ...state, deletingId: null, error: action.payload.error || null };
    case 'HISTORY_CLEARED':
      return {
        ...state,
        ...resetAnalysisState(state),
        history: [],
        activeTool: 'history',
      };
    case 'ANALYSIS_DELETED_EXTERNALLY':
        return {
            ...state,
            ...resetAnalysisState(state),
            error: 'The current analysis was deleted, possibly in another tab. Please load or start a new analysis.',
            activeTool: 'history',
        };
    case 'SET_CITED_CLAUSE':
      return { ...state, citedClause: action.payload, activeTool: 'analyze' };
    case 'PREPOPULATE_CHAT_MESSAGE':
        return { ...state, prepopulatedChatMessage: action.payload, activeTool: 'chat' };
    case 'CLEAR_PREPOPULATED_CHAT_MESSAGE':
        return { ...state, prepopulatedChatMessage: null };
    case 'REPHRASE_START':
      return { ...state, isRephrasing: true, error: null };
    case 'REPHRASE_SUCCESS':
      if (!state.analysis) return state;
      const { rephrasedClauses, newOptions } = action.payload;
      const updatedClauses = state.analysis.clauses.map(originalClause => {
          const updated = rephrasedClauses.find(rc => rc.id === originalClause.id);
          return updated ? { ...originalClause, explanation: updated.newExplanation } : originalClause;
      });
      return {
          ...state,
          isRephrasing: false,
          analysisOptions: newOptions,
          analysis: {
              ...state.analysis,
              clauses: updatedClauses,
          },
      };
    case 'REPHRASE_FAILURE':
        return { ...state, isRephrasing: false, error: action.payload };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = React.useReducer(appReducer, initialState);
  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const historyScrollPos = React.useRef(0);
  const prevIsAiTyping = React.useRef(state.isAiTyping);

  useLayoutEffect(() => {
    const mainEl = mainContentRef.current;
    if (state.activeTool === 'history' && mainEl) {
        mainEl.scrollTop = historyScrollPos.current;
    }
    return () => {
        if (state.activeTool === 'history' && mainEl) {
            historyScrollPos.current = mainEl.scrollTop;
        }
    }
  }, [state.activeTool]);

  // --- Memoized Handlers ---
  const loadHistory = React.useCallback(async () => {
    const allAnalyses = await getAllAnalyses();
    dispatch({ type: 'SET_HISTORY', payload: allAnalyses });
  }, []);

  const handleInitializeChat = React.useCallback(async () => {
    if (state.isDocumentLoaded && state.analysis) {
        try {
            await geminiService.initializeChat(state.analysis);
            dispatch({ type: 'CHAT_INIT_SUCCESS' });
        } catch (err) {
            console.error("Failed to initialize chat:", err);
            dispatch({ type: 'CHAT_INIT_FAILURE', payload: "Could not initialize the chat assistant." });
        }
    }
  }, [state.isDocumentLoaded, state.analysis]);

  const handleAnalyzeContract = React.useCallback(async (text: string, options: AnalysisOptions) => {
    let disclaimerAccepted = false;
    try {
      disclaimerAccepted = localStorage.getItem('disclaimerAccepted') === 'true';
    } catch (e) {
      console.warn("Could not read from localStorage:", e);
    }

    if (!disclaimerAccepted) {
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

      if (tempAnalysis.clauses.length === 0) {
        throw new Error("No clauses could be identified in the provided document. Please check the document's formatting or try analyzing a different text.");
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
  }, [loadHistory]);

  const handleAcceptDisclaimer = React.useCallback(() => {
    try {
      localStorage.setItem('disclaimerAccepted', 'true');
    } catch (e) {
      console.warn("Could not save disclaimer acceptance to localStorage:", e);
    }
    const pending = state.analysisPending;
    dispatch({ type: 'ACCEPT_DISCLAIMER' });
    if (pending && pending.text.trim()) {
      handleAnalyzeContract(pending.text, pending.options);
    }
  }, [state.analysisPending, handleAnalyzeContract]);

  const _streamAiResponse = React.useCallback(async (message: string, aiMessageId: string) => {
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
          return;
        }
        const errorText = e instanceof Error ? e.message : 'The AI failed to respond. Please try again.';
        dispatch({ type: 'CHAT_RESPONSE_FAILURE', payload: { id: aiMessageId, error: errorText, originalMessage: message } });
      } finally {
        dispatch({ type: 'FINISH_CHAT_STREAM' });
      }
  }, []);

  const handleSendMessage = React.useCallback(async (message: string) => {
    const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: message };
    const aiMessageId = (Date.now() + 1).toString();
    const aiTypingMessage: ChatMessage = { id: aiMessageId, sender: 'ai', text: '' };

    dispatch({ type: 'SEND_CHAT_MESSAGE', payload: { userMessage, aiMessage: aiTypingMessage } });
    await _streamAiResponse(message, aiMessageId);
  }, [_streamAiResponse]);

  const handleRetryMessage = React.useCallback(async (originalMessage: string) => {
    const aiMessageId = (Date.now() + 1).toString();
    const aiTypingMessage: ChatMessage = { id: aiMessageId, sender: 'ai', text: '' };

    dispatch({ type: 'RETRY_CHAT_MESSAGE', payload: { aiMessage: aiTypingMessage } });
    await _streamAiResponse(originalMessage, aiMessageId);
  }, [_streamAiResponse]);

  const handleDeleteAnalysis = React.useCallback(async (id: number) => {
    if (state.deletingId !== null) return;

    dispatch({ type: 'DELETE_ANALYSIS_START', payload: id });
    try {
        const isDeletingCurrent = state.currentAnalysisId === id;
        await deleteAnalysis(id);
        await loadHistory();

        if (isDeletingCurrent) {
            dispatch({ type: 'RESET_ACTIVE_ANALYSIS' });
        }
    } catch (err) {
        console.error("Failed to delete analysis:", err);
        dispatch({ type: 'DELETE_ANALYSIS_FINISH', payload: { error: "Failed to delete the analysis from the database." } });
        return;
    }
    dispatch({ type: 'DELETE_ANALYSIS_FINISH', payload: {} });
  }, [state.deletingId, state.currentAnalysisId, loadHistory]);

  const handleClearAllHistory = React.useCallback(async () => {
    await clearAnalysisHistory();
    dispatch({ type: 'HISTORY_CLEARED' });
  }, []);

  const handleClauseCitationClick = React.useCallback((clauseId: string) => {
    if (!state.analysis) return;
    const clauseToCite = state.analysis.clauses.find(c => c.id === clauseId);
    if (clauseToCite) {
      dispatch({ type: 'SET_CITED_CLAUSE', payload: { text: clauseToCite.originalClause, occurrence: clauseToCite.occurrenceIndex } });
    }
  }, [state.analysis]);

  const handleAskAboutClause = React.useCallback((clauseText: string) => {
    const snippet = clauseText.length > 150 ? clauseText.substring(0, 150) + '...' : clauseText;
    const prompt = `Can you explain this clause in more detail: "${snippet}"?`;
    dispatch({ type: 'PREPOPULATE_CHAT_MESSAGE', payload: prompt });
  }, []);

  const handleRephrase = React.useCallback(async (newPersona: AnalysisPersona) => {
    if (!state.analysis || !state.analysisOptions || !state.currentAnalysisId) return;

    dispatch({ type: 'REPHRASE_START' });
    const newOptions: AnalysisOptions = { ...state.analysisOptions, persona: newPersona };
    try {
        const rephrasedClauses = await geminiService.rephraseAnalysis(state.analysis.clauses, newOptions);
        
        const currentAnalysis = state.analysis;
        const updatedClauses = currentAnalysis.clauses.map(originalClause => {
            const updated = rephrasedClauses.find(rc => rc.id === originalClause.id);
            return updated ? { ...originalClause, explanation: updated.newExplanation } : originalClause;
        });
        const updatedAnalysis: ContractAnalysis = { ...currentAnalysis, clauses: updatedClauses };

        const isUpdated = await updateAnalysis(state.currentAnalysisId, updatedAnalysis, newOptions);

        if (!isUpdated) {
            dispatch({ type: 'ANALYSIS_DELETED_EXTERNALLY' });
            return;
        }

        dispatch({ type: 'REPHRASE_SUCCESS', payload: { rephrasedClauses, newOptions }});

        await loadHistory();

    } catch(e) {
        if (e instanceof Error && e.name === 'AbortError') {
            console.log("Rephrase was cancelled.");
            // Reset state gracefully without showing an error to the user for cancellation.
            dispatch({ type: 'REPHRASE_FAILURE', payload: '' });
            return;
        }
        const message = e instanceof Error ? e.message : 'An unknown error occurred while re-analyzing.';
        dispatch({ type: 'REPHRASE_FAILURE', payload: message });
    }
  }, [state.analysis, state.analysisOptions, state.currentAnalysisId, loadHistory]);

  // HARDENING: Memoize dispatch-based props to prevent unnecessary child re-renders.
  const handleSetTool = React.useCallback((tool: Tool) => dispatch({ type: 'SET_TOOL', payload: tool }), []);
  const handleCloseDisclaimer = React.useCallback(() => dispatch({ type: 'CLOSE_DISCLAIMER' }), []);
  const handleSetContractText = React.useCallback((text: string) => dispatch({ type: 'SET_CONTRACT_TEXT', payload: text }), []);
  const handleSetError = React.useCallback((message: string) => dispatch({ type: 'ANALYSIS_FAILURE', payload: message }), []);
  const handleClearError = React.useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const handleStartNew = React.useCallback(() => dispatch({ type: 'START_NEW' }), []);
  const handleClearPrepopulatedMessage = React.useCallback(() => dispatch({ type: 'CLEAR_PREPOPULATED_CHAT_MESSAGE' }), []);
  const handleLoadAnalysis = React.useCallback((item: PersistedAnalysis) => dispatch({ type: 'LOAD_ANALYSIS', payload: item }), []);


  // --- Effects ---
  React.useEffect(() => {
    const hydrateState = async () => {
      const persisted = await getLatestAnalysis();
      if (persisted) {
        dispatch({ type: 'HYDRATE_STATE', payload: persisted });
      }
    };
    hydrateState();
    loadHistory();
  }, [loadHistory]);

  React.useEffect(() => {
    if (state.isDocumentLoaded && state.analysis) {
        handleInitializeChat();
    }
  }, [state.isDocumentLoaded, state.analysis, handleInitializeChat]);
  
  React.useEffect(() => {
    // HARDENING: Only persist history when the AI has just finished typing.
    // This is a major performance optimization that prevents excessive DB writes
    // for every single token received during the streaming response.
    if (prevIsAiTyping.current && !state.isAiTyping && state.currentAnalysisId && state.chatHistory.length > 0) {
        const persistHistory = async () => {
            const success = await updateChatHistory(state.currentAnalysisId!, state.chatHistory);
            if (!success) {
                console.warn(`Analysis ID ${state.currentAnalysisId} could not be updated. It may have been deleted.`);
                dispatch({ type: 'ANALYSIS_DELETED_EXTERNALLY' });
            }
        };
        persistHistory();
    }
    // Update the ref for the next render to track the previous state.
    prevIsAiTyping.current = state.isAiTyping;
  }, [state.isAiTyping, state.currentAnalysisId, state.chatHistory]);


  const renderTool = () => {
    switch (state.activeTool) {
      case 'home':
        return <HomeView onStartAnalysis={() => handleSetTool('analyze')} />;
      case 'analyze':
        return <AnalyzeView
          onAnalyze={handleAnalyzeContract}
          analysis={state.analysis}
          contractText={state.contractText}
          setContractText={handleSetContractText}
          isLoading={state.isLoading}
          isRephrasing={state.isRephrasing}
          error={state.error}
          onStartNew={handleStartNew}
          progress={state.progress}
          analysisOptions={state.analysisOptions}
          citedClause={state.citedClause}
          onSetError={handleSetError}
          onClearError={handleClearError}
          onAskAboutClause={handleAskAboutClause}
          onRephrase={handleRephrase}
        />;
      case 'chat':
        return state.isDocumentLoaded ?
          <ChatView
            chatHistory={state.chatHistory}
            onSendMessage={handleSendMessage}
            onRetryMessage={handleRetryMessage}
            isAiTyping={state.isAiTyping}
            onClauseClick={handleClauseCitationClick}
            isChatReady={state.isChatReady}
            onRetryInit={handleInitializeChat}
            prepopulatedMessage={state.prepopulatedChatMessage}
            onClearPrepopulatedMessage={handleClearPrepopulatedMessage}
          /> : <HomeView onStartAnalysis={() => handleSetTool('analyze')} />;
      case 'compare':
        return <CompareView initialDocument={state.contractText} />
      case 'draft':
        return <DraftView />;
      case 'history':
        return <HistoryView
          history={state.history}
          onLoad={handleLoadAnalysis}
          onDelete={handleDeleteAnalysis}
          onClearAll={handleClearAllHistory}
          deletingId={state.deletingId}
        />
      default:
        return <HomeView onStartAnalysis={() => handleSetTool('analyze')} />;
    }
  }

  return (
    <div className="flex h-full font-sans text-foreground bg-background">
      <DisclaimerModal
        isOpen={state.showDisclaimer}
        onAccept={handleAcceptDisclaimer}
        onClose={handleCloseDisclaimer}
      />
      <Sidebar
        activeTool={state.activeTool}
        setActiveTool={handleSetTool}
        isDocumentLoaded={state.isDocumentLoaded}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.activeTool}
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              {renderTool()}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="flex-shrink-0 p-3 text-center text-xs text-muted-foreground border-t border-border bg-background/50">
            <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
                <LockIcon className="w-3 h-3 flex-shrink-0" />
                <span>BETA RELEASE. Your documents are processed and stored locally. They are never uploaded.</span>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
