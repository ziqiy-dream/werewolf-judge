
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
        error: error,
        errorInfo: errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-8 font-mono">
            <div className="max-w-4xl w-full bg-gray-900 p-6 rounded-lg border-2 border-red-500 shadow-2xl">
                <h1 className="text-3xl font-bold text-red-500 mb-4">CRITICAL SYSTEM FAILURE</h1>
                <div className="mb-6">
                    <p className="text-xl mb-2">Error: {this.state.error?.toString()}</p>
                </div>
                <div className="bg-black p-4 rounded border border-gray-700 overflow-auto max-h-[60vh]">
                    <pre className="text-xs text-green-400 whitespace-pre-wrap">
                        {this.state.errorInfo?.componentStack}
                    </pre>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors uppercase tracking-widest"
                >
                    System Reboot
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
