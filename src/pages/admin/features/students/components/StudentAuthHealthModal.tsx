import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, RefreshCw, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';

interface StudentAuthHealthModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentsData: any[];
    applicationsCount: number;
    linkedStudentCount: number;
    authPendingStudentCount: number;
    showToast: (msg: string, type?: string) => void;
    handleRefreshData: () => Promise<void>;
    invokeManagedStudentFunction: (body: any) => Promise<any>;
}

export function StudentAuthHealthModal({
    isOpen,
    onClose,
    studentsData,
    applicationsCount,
    linkedStudentCount,
    authPendingStudentCount,
    showToast,
    handleRefreshData,
    invokeManagedStudentFunction
}: StudentAuthHealthModalProps) {
    const [toolMode, setToolMode] = useState<'rename' | 'swap'>('rename');
    const [sourceId, setSourceId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [isExecuting, setIsExecuting] = useState<boolean>(false);
    const [isRunningCleanup, setIsRunningCleanup] = useState<boolean>(false);
    const [sourceStudent, setSourceStudent] = useState<any | null>(null);
    const [targetStudent, setTargetStudent] = useState<any | null>(null);
    const [sourceLoading, setSourceLoading] = useState<boolean>(false);
    const [targetLoading, setTargetLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        const fetchSource = async () => {
            const trimmed = sourceId.trim();
            if (!trimmed) {
                setSourceStudent(null);
                return;
            }
            setSourceLoading(true);
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('student_id, first_name, middle_name, last_name, suffix, course, year_level, status')
                    .eq('student_id', trimmed)
                    .maybeSingle();
                if (error) throw error;
                setSourceStudent(data);
            } catch (err) {
                setSourceStudent(null);
            } finally {
                setSourceLoading(false);
            }
        };

        const timer = setTimeout(fetchSource, 250);
        return () => clearTimeout(timer);
    }, [sourceId]);

    useEffect(() => {
        const fetchTarget = async () => {
            const trimmed = targetId.trim();
            if (!trimmed) {
                setTargetStudent(null);
                return;
            }
            setTargetLoading(true);
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('student_id, first_name, middle_name, last_name, suffix, course, year_level, status')
                    .eq('student_id', trimmed)
                    .maybeSingle();
                if (error) throw error;
                setTargetStudent(data);
            } catch (err) {
                setTargetStudent(null);
            } finally {
                setTargetLoading(false);
            }
        };

        const timer = setTimeout(fetchTarget, 250);
        return () => clearTimeout(timer);
    }, [targetId]);

    const activeStudentCount = studentsData.filter(s => String(s.status || '').trim() === 'Active').length;
    const probationStudentCount = studentsData.filter(s => String(s.status || '').trim() === 'Probation').length;
    const inactiveStudentCount = Math.max(0, studentsData.length - activeStudentCount - probationStudentCount);
    const linkedPercent = studentsData.length > 0 ? Math.round((linkedStudentCount / studentsData.length) * 100) : 100;
    const cleanupRequired = authPendingStudentCount > 0;

    const handleRunCleanup = async () => {
        setIsRunningCleanup(true);
        try {
            await invokeManagedStudentFunction({ mode: 'sync-all-auth-emails' });
            showToast('Linked student auth records verified and synced.');
            await handleRefreshData();
        } catch (err: any) {
            showToast(err?.message || 'Unable to run auth cleanup at this time.', 'error');
        } finally {
            setIsRunningCleanup(false);
        }
    };

    const handleExecute = async (e: React.FormEvent) => {
        e.preventDefault();
        const src = sourceId.trim();
        const dest = targetId.trim();
        if (!src || !dest) {
            showToast('Both Source and Target Student IDs are required.', 'error');
            return;
        }
        if (src === dest) {
            showToast('Source and Target Student IDs must be different.', 'error');
            return;
        }

        const isSwap = toolMode === 'swap' || Boolean(sourceStudent && targetStudent);
        const confirmMessage = isSwap
            ? `Swap student IDs ${src} and ${dest}? This updates both auth accounts and all referencing student tables.`
            : `Rename student ID ${src} to ${dest}? This updates the auth account and all referencing student tables.`;

        if (!window.confirm(confirmMessage)) return;

        setIsExecuting(true);
        try {
            const result = await invokeManagedStudentFunction({
                mode: 'swap-student-ids',
                sourceStudentId: src,
                targetStudentId: dest
            });
            showToast(result?.message || `Student ID ${isSwap ? 'swap' : 'rename'} completed successfully.`);
            setSourceId('');
            setTargetId('');
            setSourceStudent(null);
            setTargetStudent(null);
            await handleRefreshData();
        } catch (error: any) {
            showToast(error?.message || 'Failed to update student IDs.', 'error');
        } finally {
            setIsExecuting(false);
        }
    };

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Outfit',sans-serif]">
            <div
                className="absolute inset-0"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="student-auth-health-title"
                className="relative bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] z-10"
            >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 id="student-auth-health-title" className="font-extrabold text-base text-slate-900 leading-tight">
                                Student Auth Health &amp; ID Maintenance
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Global authentication health checks and Student ID rename/swap utility. Row-level student work stays with CARE Staff.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer shrink-0"
                        aria-label="Close dialog"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
                    {/* Top 3 KPI Status Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Auth Sync Coverage */}
                        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4">
                            <p className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
                                Auth Sync Coverage
                            </p>
                            <p className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">
                                {linkedPercent}% Linked
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                                {authPendingStudentCount} unlinked · {applicationsCount} pending applications
                            </p>
                        </div>

                        {/* Academic Standing Split */}
                        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4">
                            <p className="text-[10px] font-extrabold uppercase text-sky-800 tracking-wider">
                                Academic Standing Split
                            </p>
                            <p className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">
                                {activeStudentCount.toLocaleString()} Active
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                                {inactiveStudentCount} on leave/inactive · {probationStudentCount} probation
                            </p>
                        </div>

                        {/* Linked Auth Cleanup */}
                        <div className={`rounded-2xl border p-4 ${cleanupRequired ? 'border-amber-200/80 bg-amber-50/40' : 'border-emerald-200/80 bg-emerald-50/40'}`}>
                            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${cleanupRequired ? 'text-amber-800' : 'text-emerald-800'}`}>
                                Linked Auth Cleanup
                            </p>
                            <p className="mt-1.5 text-2xl font-extrabold text-slate-900">
                                {cleanupRequired ? 'Required' : 'Clean'}
                            </p>
                            {cleanupRequired ? (
                                <button
                                    type="button"
                                    onClick={handleRunCleanup}
                                    disabled={isRunningCleanup}
                                    className="mt-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-900 underline flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                                >
                                    {isRunningCleanup ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" />
                                            <span>Running Cleanup...</span>
                                        </>
                                    ) : (
                                        <span>Run Auth Cleanup Now &rarr;</span>
                                    )}
                                </button>
                            ) : (
                                <p className="mt-1 text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    <span>All accounts synced</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Rename / Swap Student IDs Utility */}
                    <div className="rounded-2xl border border-slate-200/80 p-5 space-y-4 bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h4 className="font-extrabold text-sm text-slate-900">
                                    Rename / Swap Student IDs
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Safely migrate a student's primary ID or swap two accidentally cross-assigned IDs across Auth and foreign keys.
                                </p>
                            </div>

                            {/* Segmented Toggle */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setToolMode('rename')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${toolMode === 'rename' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Rename ID
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setToolMode('swap')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${toolMode === 'swap' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Swap Two IDs
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleExecute} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label
                                        htmlFor="source-student-id-input"
                                        className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5"
                                    >
                                        {toolMode === 'rename' ? 'Current Student ID' : 'Student ID 1'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="source-student-id-input"
                                            required
                                            type="text"
                                            value={sourceId}
                                            onChange={e => setSourceId(e.target.value)}
                                            placeholder="e.g. 420134648"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                                        />
                                        {sourceLoading && (
                                            <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-slate-400" />
                                        )}
                                    </div>
                                    {sourceStudent && (
                                        <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                                            &check; {sourceStudent.last_name}, {sourceStudent.first_name} &middot; {sourceStudent.course}
                                        </p>
                                    )}
                                    {!sourceStudent && sourceId.trim() && !sourceLoading && (
                                        <p className="mt-1 text-[11px] font-medium text-amber-600 flex items-center gap-1">
                                            <AlertTriangle size={11} /> No student found with this ID
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="target-student-id-input"
                                        className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5"
                                    >
                                        {toolMode === 'rename' ? 'New Target Student ID' : 'Student ID 2'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="target-student-id-input"
                                            required
                                            type="text"
                                            value={targetId}
                                            onChange={e => setTargetId(e.target.value)}
                                            placeholder="e.g. 420134699"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                                        />
                                        {targetLoading && (
                                            <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-slate-400" />
                                        )}
                                    </div>
                                    {targetStudent && (
                                        <p className="mt-1 text-[11px] font-semibold text-sky-700">
                                            &bull; Belongs to: {targetStudent.last_name}, {targetStudent.first_name} ({toolMode === 'rename' ? 'Will execute as SWAP' : 'Ready to swap'})
                                        </p>
                                    )}
                                    {!targetStudent && targetId.trim() && !targetLoading && toolMode === 'rename' && (
                                        <p className="mt-1 text-[11px] font-medium text-emerald-600">
                                            &check; ID is vacant &mdash; student will be renamed to this ID
                                        </p>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isExecuting || !sourceId.trim() || !targetId.trim()}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={14} className={isExecuting ? 'animate-spin' : ''} />
                                <span>
                                    {isExecuting
                                        ? 'Executing Operation...'
                                        : `Execute Student ID ${toolMode === 'rename' && !targetStudent ? 'Rename' : 'Swap'}`}
                                </span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

