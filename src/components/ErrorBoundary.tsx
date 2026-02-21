import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can also log the error to an error reporting service here
        console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
                    <div className="bg-white rounded-3xl shadow-2xl border border-red-50 p-8 md:p-12 max-w-xl w-full text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-rose-400"></div>
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Something went wrong</h1>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            We apologize, but an unexpected error occurred while loading this interface.
                            Please try refreshing the page to see if that resolves the issue.
                        </p>
                        {this.state.error && (
                            <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left overflow-x-auto text-[11px] md:text-xs font-mono text-gray-600 border border-gray-200/60 shadow-inner">
                                <span className="font-bold text-red-400 block mb-1">Error Details:</span>
                                {this.state.error.toString()}
                            </div>
                        )}
                        <button
                            onClick={this.handleReload}
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
