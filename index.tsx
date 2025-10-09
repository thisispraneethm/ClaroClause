import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { ThemeProvider } from './contexts/ThemeContext';

// Catches application-wide errors (e.g., missing API key) 
// to prevent the entire application from crashing to a blank screen.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  // FIX: Added a constructor to explicitly handle props and initialize state.
  // The previous implementation using a class property for state was causing a type error where `this.props` was not recognized.
  // This change ensures the component's props and state are correctly typed and initialized.
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
        <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-background text-foreground">
           <div className="glass-panel bg-destructive/10 p-8 rounded-2xl border border-destructive/20 text-destructive">
            <SparklesIcon className="w-12 h-12 mx-auto" />
            <h1 className="mt-4 text-2xl font-bold">Application Error</h1>
            <p className="mt-2 max-w-md mx-auto">
              A critical error occurred that prevented the application from starting. This can be caused by a configuration issue (like a missing API key) or a script error.
            </p>
            <p className="mt-4 text-xs font-mono bg-destructive/20 p-2 rounded">
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
    <ThemeProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);