import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import type { StaffLoginConfig } from '../../pages/auth/staffLoginConfigs';

type ToastType = 'success' | 'error';

interface ToastState {
    msg: string;
    type: ToastType;
}

export function useRoleLogin(config: StaffLoginConfig) {
    const navigate = useNavigate();
    const { login, loading: authLoading } = useAuth() as any;

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimers = useCallback(() => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
        if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
            redirectTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => clearTimers();
    }, [clearTimers]);

    const showToast = useCallback((msg: string, type: ToastType = 'success') => {
        setToast({ msg, type });
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    }, []);

    const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const result = await login(username, password, config.authRole);

        if (result.success) {
            showToast(config.successMessage, 'success');
            redirectTimerRef.current = setTimeout(() => {
                navigate(config.successRedirect);
            }, config.redirectDelayMs ?? 800);
        } else {
            showToast(result.error || 'Login failed.', 'error');
        }

        setLoading(false);
    }, [config.authRole, config.redirectDelayMs, config.successMessage, config.successRedirect, login, navigate, password, showToast, username]);

    return {
        username,
        setUsername,
        password,
        setPassword,
        showPassword,
        setShowPassword,
        loading,
        authLoading,
        toast,
        handleSubmit
    };
}
