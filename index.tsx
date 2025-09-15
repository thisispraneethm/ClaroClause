import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SparklesIcon } from './components/icons/SparklesIcon';

// FIX: An Error Boundary to catch initialization errors (e.g., missing API key)
// and prevent the entire application from crashing to a blank screen.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Application crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-red-50 text-red-900">
           <div className="glass-panel bg-red-100/50 p-8 rounded-2xl border border-red-200">
            <SparklesIcon className="w-12 h-12 mx-auto text-red-500" />
            <h1 className="mt-4 text-2xl font-bold">Application Configuration Error</h1>
            <p className="mt-2 max-w-md mx-auto">
              The application could not start. This is likely due to a missing API key for the AI service.
            </p>
            <p className="mt-4 text-xs font-mono bg-red-200/50 p-2 rounded">
              <code>Error: {this.state.error?.message || 'Unknown Error'}</code>
            </p>
            <p className="mt-4 text-sm">Please ensure your environment variables are set correctly and reload the page.</p>
           </div>
        </div>
      );
    }

    return this.props.children;
  }
}


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);