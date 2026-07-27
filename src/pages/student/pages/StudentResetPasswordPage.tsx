import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useAsyncHandler } from '../../../components/ui/Button';
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction';

const GENERIC_FAILURE = 'We could not reset your password. Please request a new link and try again.';

// Landing page for the reset link emailed to students. Opening the link only renders this form —
// the token is spent by the submit below — so Gmail's link prefetching and mail scanners cannot
// burn a student's reset before they get here.
export default function StudentResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = String(searchParams.get('token') || '').trim();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);

    const submitReset = async () => {
        setError(null);

        if (newPassword.length < 8) {
            setError('For your security, please choose a password that is at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('The passwords you entered do not match. Please check and try again.');
            return;
        }

        try {
            await invokeEdgeFunction('manage-student-accounts', {
                body: {
                    mode: 'confirm-forgot-password-link',
                    token,
                    password: newPassword
                },
                fallbackMessage: GENERIC_FAILURE
            });

            setIsDone(true);
            window.setTimeout(() => navigate('/student/login', { replace: true }), 2500);
        } catch (submitError: any) {
            setError(submitError?.message || GENERIC_FAILURE);
        }
    };

    const [handleSubmit, isSubmitting] = useAsyncHandler<FormEvent<HTMLFormElement>>((event) => {
        event.preventDefault();
        return submitReset();
    });

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0f1c] px-4 py-10 font-inter">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
                {!token ? (
                    <div className="space-y-4 text-center">
                        <AlertCircle className="mx-auto text-amber-500" size={40} />
                        <h1 className="text-xl font-bold text-slate-800">This link is incomplete</h1>
                        <p className="text-sm text-slate-500">
                            The reset link looks broken or was cut short by your email app. Request a new one from
                            the sign-in page and open it directly from the email.
                        </p>
                        <Link
                            to="/student/login"
                            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                        >
                            Back to sign in
                        </Link>
                    </div>
                ) : isDone ? (
                    <div className="space-y-4 text-center">
                        <CheckCircle className="mx-auto text-emerald-500" size={40} />
                        <h1 className="text-xl font-bold text-slate-800">Password updated</h1>
                        <p className="text-sm text-slate-500">
                            Sign in with your new password. Taking you to the sign-in page now.
                        </p>
                        <Link
                            to="/student/login"
                            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                        >
                            Go to sign in
                        </Link>
                    </div>
                ) : (
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-2 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <Lock size={22} />
                            </div>
                            <h1 className="text-xl font-bold text-slate-800">Choose a new password</h1>
                            <p className="text-sm text-slate-500">
                                This link can only be used once. Requesting another one cancels it.
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="reset-new-password"
                                className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
                            >
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    id="reset-new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-400/20"
                                    placeholder="At least 8 characters"
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    onClick={() => setShowPassword((current) => !current)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-indigo-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="reset-confirm-password"
                                className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
                            >
                                Confirm Password
                            </label>
                            <input
                                id="reset-confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-400/20"
                                placeholder="Re-enter your new password"
                            />
                        </div>

                        {error && (
                            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={!newPassword || !confirmPassword || isSubmitting}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                            {isSubmitting ? 'Updating...' : 'Update password'}
                        </button>

                        <Link
                            to="/student/login"
                            className="block text-center text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
                        >
                            Back to sign in
                        </Link>
                    </form>
                )}
            </div>
        </div>
    );
}
