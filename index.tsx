import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SparklesIcon } from './components/icons/SparklesIcon';

// Catches application-wide errors (e.g., missing API key) 
// to prevent the entire application from crashing to a blank screen.
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
            <h1 className="mt-4 text-2xl font-bold">Application Error</h1>
            <p className="mt-2 max-w-md mx-auto">
              A critical error occurred that prevented the application from starting. This can be caused by a configuration issue (like a missing API key) or a script error.
            </p>
            <p className="mt-4 text-xs font-mono bg-red-200/50 p-2 rounded">
              <code>Error: {this.state.error?.message || 'Unknown Error'}</code>
            </p>
            <p className="mt-4 text-sm">Please check the developer console for more details, ensure your environment is configured correctly, and then reload the page.</p>
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
