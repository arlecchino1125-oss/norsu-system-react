import React, { useState } from 'react';
import { createPortal } from 'react-dom';

interface PublicIdentityModalProps {
    open: boolean;
    /** What the student was trying to do, so the prompt explains why it is asking. */
    actionName?: string | null;
    onClose: () => void;
    /** Must reject when the credentials are wrong -- the message lands in this form. */
    onSubmit: (studentId: string) => Promise<void>;
}

export default function PublicIdentityModal({ open, actionName, onClose, onSubmit }: PublicIdentityModalProps) {
    const [studentId, setStudentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!open || typeof document === 'undefined') return null;

    const handleSubmit = async (submitEvent: React.FormEvent) => {
        submitEvent.preventDefault();
        setError('');
        setLoading(true);
        try {
            await onSubmit(studentId);
            // Only cleared on success: a wrong ID should stay in the field so the
            // student can fix a typo instead of retyping it.
            setStudentId('');
        } catch (err: any) {
            setError(err?.message || 'We could not verify those details.');
        } finally {
            setLoading(false);
        }
    };

    const close = () => {
        setError('');
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-3 sm:items-center sm:p-4" onClick={close}>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div
                className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
            >
                <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Student Verification</p>
                    <h3 className="mt-1 text-lg font-black leading-tight text-white">Enter your Student ID</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
                        {actionName
                            ? `These must match your records before you can ${actionName.toLowerCase()}.`
                            : 'These must match the details on your student record.'}
                    </p>
                </div>

                <div className="p-5">
                    {error && (
                        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="public-student-id" className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Student ID</label>
                            <input
                                id="public-student-id"
                                autoFocus
                                type="text"
                                required
                                value={studentId}
                                onChange={(changeEvent) => setStudentId(changeEvent.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                placeholder="e.g. 420131234"
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={close}
                                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !studentId.trim()}
                                className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-200"
                            >
                                {loading ? 'Verifying...' : 'Continue'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
