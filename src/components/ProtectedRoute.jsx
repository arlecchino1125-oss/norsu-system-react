import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Loader2, ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { session, loading, isAuthenticated, logout } = useAuth();

    if (loading) {
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
                    <div className="mb-6">
                        <p className="text-gray-500 mb-2">
                            You do not have permission to view this page.
                        </p>
                        <div className="flex flex-col gap-2 text-sm">
                            <p className="bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-100">
                                <span className="font-bold">Required Role:</span> {allowedRoles.join(' or ')}
                            </p>
                            <p className="bg-slate-50 text-slate-700 px-3 py-2 rounded-lg border border-slate-200">
                                <span className="font-bold">Current Role:</span> {session?.role || 'None'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => window.history.back()}
                            className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="flex-1 py-3 px-4 bg-white text-gray-700 border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            Home
                        </button>
                        <button
                            onClick={() => { logout(); window.location.href = '/'; }}
                            className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
