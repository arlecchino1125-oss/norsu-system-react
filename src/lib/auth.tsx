import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }: any) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    const persistSession = useCallback((nextSession: any) => {
        setSession(nextSession);
        if (nextSession) {
            localStorage.setItem('norsu_session', JSON.stringify(nextSession));
            return;
        }
        localStorage.removeItem('norsu_session');
    }, []);

    const updateSession = useCallback((updates: any) => {
        setSession((prev: any) => {
            const nextSession = typeof updates === 'function'
                ? updates(prev)
                : { ...(prev || {}), ...(updates || {}) };

            if (prev && nextSession) {
                const prevKeys = Object.keys(prev);
                const nextKeys = Object.keys(nextSession);
                const unchanged = prevKeys.length === nextKeys.length
                    && nextKeys.every((key) => Object.is(prev[key], nextSession[key]));

                if (unchanged) {
                    return prev;
                }
            }

            if (nextSession) {
                localStorage.setItem('norsu_session', JSON.stringify(nextSession));
            } else {
                localStorage.removeItem('norsu_session');
            }

            return nextSession;
        });
    }, []);

    /**
     * Login against staff_accounts table.
     * @param {string} username
     * @param {string} password
     * @param {string} requiredRole - e.g. 'Admin', 'Department Head', 'Care Staff'
     * @returns {{ success: boolean, error?: string, data?: object }}
     */
    /**
     * Login for Staff (Admin, Department Head, Care Staff)
     */
    const loginStaff = useCallback(async (username: any, password: any, requiredRole: any) => {
        setLoading(true);
        try {
            const { data: userCheck, error: userError } = await supabase
                .from('staff_accounts')
                .select('role, password')
                .eq('username', username.trim())
                .maybeSingle();

            if (userError) throw userError;

            if (!userCheck) {
                setLoading(false);
                return { success: false, error: 'Username not found.' };
            }

            if (userCheck.password !== password) {
                setLoading(false);
                return { success: false, error: 'Incorrect password.' };
            }

            if (userCheck.role !== requiredRole) {
                setLoading(false);
                return { success: false, error: `Access denied: This account is not a ${requiredRole}.` };
            }

            const { data: staff, error: staffError } = await supabase
                .from('staff_accounts')
                .select('*')
                .eq('username', username.trim())
                .single();

            if (staffError) throw staffError;

            const sessionData = { ...staff, userType: 'staff' };
            persistSession(sessionData);
            setLoading(false);

            return { success: true, data: sessionData };

        } catch (err) {
            setLoading(false);
            return { success: false, error: 'Connection error: ' + err.message };
        }
    }, []);

    /**
     * Login for Students
     */
    const loginStudent = useCallback(async (studentId: any, password: any) => {
        setLoading(true);
        try {
            const { data: student, error } = await supabase
                .from('students')
                .select('*')
                .eq('student_id', studentId.trim())
                .maybeSingle();

            if (error) throw error;

            if (!student) {
                setLoading(false);
                return { success: false, error: 'Student ID not found.' };
            }

            // Simple password check (plaintext as per current system design)
            if (student.password !== password) {
                setLoading(false);
                return { success: false, error: 'Incorrect password.' };
            }

            if (student.status !== 'Active' && student.status !== 'Probation') { // Allow Active/Probation
                // Optional: Check status if needed
                // return { success: false, error: 'Account is not active.' };
            }

            const sessionData = { ...student, role: 'Student', userType: 'student' };
            persistSession(sessionData);
            setLoading(false);

            return { success: true, data: sessionData };
        } catch (err) {
            setLoading(false);
            return { success: false, error: 'Login error: ' + err.message };
        }
    }, []);

    // Alias for backward compatibility with existing staff login pages
    const login = loginStaff;

    // Load session from localStorage on mount
    React.useEffect(() => {
        const stored = localStorage.getItem('norsu_session');
        if (stored) {
            try {
                setSession(JSON.parse(stored));
            } catch (e) {
                localStorage.removeItem('norsu_session');
            }
        }
        setLoading(false);
    }, []);

    const logout = useCallback(() => {
        persistSession(null);
    }, [persistSession]);

    const value = React.useMemo(() => ({
        session,
        loading,
        login,      // Alias for loginStaff
        loginStaff,
        loginStudent, // New student login
        updateSession,
        logout,
        isAuthenticated: !!session,
    }), [session, loading, login, loginStaff, loginStudent, updateSession, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
