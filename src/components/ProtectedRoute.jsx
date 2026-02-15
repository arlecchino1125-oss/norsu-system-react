import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Loader2, ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { session, loading, isAuthenticated } = useAuth();
    const [isVendorReady, setIsVendorReady] = useState(false);

    // Artificial delay to prevent flash of content (optional)
    useEffect(() => {
        const timer = setTimeout(() => setIsVendorReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (loading || !isVendorReady) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Verifying access...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-red-50 p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-500 mb-6">
                        You do not have permission to view this page. Required role: <span className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded text-sm">{allowedRoles.join(' or ')}</span>
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
