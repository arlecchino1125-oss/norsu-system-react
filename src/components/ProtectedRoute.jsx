import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/**
 * ProtectedRoute Component
 * @param {object} props
 * @param {React.ReactNode} props.children - The child component to render if authenticated.
 * @param {string[]} [props.allowedRoles] - List of roles allowed to access this route. If empty, any authenticated user can access.
 * @param {string} [props.redirectPath] - Path to redirect to if unauthorized. Defaults to '/' or specific login pages based on intended role.
 */
export default function ProtectedRoute({ children, allowedRoles = [], redirectPath }) {
    const { session, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // Optional: Render a loading spinner here
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading...</div>;
    }

    if (!isAuthenticated) {
        // Determine redirect path if not provided
        let target = redirectPath || '/';
        // Basic heuristic for redirection based on path
        if (location.pathname.startsWith('/admin')) target = '/admin';
        else if (location.pathname.startsWith('/care-staff')) target = '/care-staff';
        else if (location.pathname.startsWith('/department')) target = '/department/login';
        else if (location.pathname.startsWith('/student')) target = '/student/login'; // Changed from /student to /student/login to avoid loop if /student is protected

        return <Navigate to={target} replace state={{ from: location }} />;
    }

    // Role Check
    if (allowedRoles.length > 0) {
        // Clean role comparison (case-insensitive)
        const userRole = (session.role || '').toLowerCase();
        const hasrole = allowedRoles.some(r => r.toLowerCase() === userRole);

        if (!hasrole) {
            // User is logged in but doesn't have permission
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50">
                    <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
                        <p className="text-gray-600 mb-4">You do not have permission to view this page.</p>
                        <p className="text-xs text-gray-400">Required: {allowedRoles.join(', ')}</p>
                        <button onClick={() => window.history.back()} className="mt-6 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition-all">Go Back</button>
                    </div>
                </div>
            );
        }
    }

    return children;
}
