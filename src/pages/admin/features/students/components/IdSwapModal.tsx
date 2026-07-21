import React, { useState, useEffect } from 'react';
import { RefreshCw, X, User } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { ResolvedProfileImage } from '../../../../../components/ResolvedProfileImage';

interface IdSwapModalProps {
    showToast: (msg: string, type?: string) => void;
    handleRefreshData: () => Promise<void>;
    invokeManagedStudentFunction: (body: any) => Promise<any>;
    setShowIdSwapModal: (show: boolean) => void;
}

export function IdSwapModal({ showToast, handleRefreshData, invokeManagedStudentFunction, setShowIdSwapModal }: IdSwapModalProps) {
    const [sourceId, setSourceId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [isSwappingIds, setIsSwappingIds] = useState<boolean>(false);
    const [sourceStudent, setSourceStudent] = useState<any | null>(null);
    const [targetStudent, setTargetStudent] = useState<any | null>(null);
    const [sourceLoading, setSourceLoading] = useState<boolean>(false);
    const [targetLoading, setTargetLoading] = useState<boolean>(false);

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
                    .select('student_id, first_name, middle_name, last_name, suffix, course, year_level, profile_picture_url, is_archived')
                    .eq('student_id', trimmed)
                    .maybeSingle();
                if (error) throw error;
                setSourceStudent(data);
            } catch (err) {
                console.error(err);
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
                    .select('student_id, first_name, middle_name, last_name, suffix, course, year_level, profile_picture_url, is_archived')
                    .eq('student_id', trimmed)
                    .maybeSingle();
                if (error) throw error;
                setTargetStudent(data);
            } catch (err) {
                console.error(err);
                setTargetStudent(null);
            } finally {
                setTargetLoading(false);
            }
        };

        const timer = setTimeout(fetchTarget, 250);
        return () => clearTimeout(timer);
    }, [targetId]);

    const handleSwapIds = async (e: React.FormEvent) => {
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

        const isSwap = Boolean(sourceStudent && targetStudent);
        const confirmMessage = isSwap
            ? `Swap student IDs ${src} and ${dest}? This updates both auth accounts and every table referencing these students.`
            : `Rename student ID ${src} to ${dest}? This updates the auth account and every table referencing this student.`;
        if (!confirm(confirmMessage)) return;

        setIsSwappingIds(true);
        try {
            const result = await invokeManagedStudentFunction({
                mode: 'swap-student-ids',
                sourceStudentId: src,
                targetStudentId: dest
            });
            showToast(result?.message || 'Student IDs updated successfully.');
            setShowIdSwapModal(false);
            setSourceId('');
            setTargetId('');
            setSourceStudent(null);
            setTargetStudent(null);
            void handleRefreshData();
        } catch (error: any) {
            showToast('Failed to update student IDs.', 'error');
        } finally {
            setIsSwappingIds(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-slide-in-up border border-slate-200/80">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-teal-600" />
                        Rename or Swap Student ID
                    </h3>
                            <button type="button" aria-label="Close student ID dialog" onClick={() => setShowIdSwapModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                    This will safely update or swap student IDs. If the Target ID is occupied, their IDs will be swapped. All referencing tables and auth metadata will cascade and update.
                </p>
                <form onSubmit={handleSwapIds} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                                    <label htmlFor="admin-source-student-id" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Source Student ID</label>
                                    <input
                                        id="admin-source-student-id"
                                required
                                type="text"
                                value={sourceId}
                                onChange={(e) => setSourceId(e.target.value)}
                                placeholder="e.g. 420133463"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                            />
                        </div>
                        <div>
                                    <label htmlFor="admin-target-student-id" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target Student ID</label>
                                    <input
                                        id="admin-target-student-id"
                                required
                                type="text"
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                placeholder="e.g. 420133462"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                            />
                        </div>
                    </div>

                    {(sourceId || targetId) && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <span>Review Operation Preview</span>
                                {sourceStudent && targetStudent ? (
                                    <span className="text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <RefreshCw size={10} className="animate-spin" /> Swap IDs
                                    </span>
                                ) : sourceStudent && !targetStudent && targetId.trim() ? (
                                    <span className="text-teal-600 font-semibold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                        Rename ID
                                    </span>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source Student (From)</span>
                                    {sourceLoading ? (
                                        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                            Loading student details...
                                        </div>
                                    ) : sourceStudent ? (
                                        <div className="p-3 rounded-xl border border-teal-100 bg-teal-50/30 flex items-start gap-3 min-h-[100px]">
                                            {sourceStudent.profile_picture_url ? (
                                                <ResolvedProfileImage
                                                    storedValue={sourceStudent.profile_picture_url}
                                                    studentId={sourceStudent.student_id}
                                                    alt="Profile"
                                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-teal-100/80 flex items-center justify-center text-teal-700 font-bold shrink-0">
                                                    <User size={20} />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-800 truncate">
                                                    {[sourceStudent.first_name, sourceStudent.middle_name, sourceStudent.last_name, sourceStudent.suffix].filter(Boolean).join(' ')}
                                                </p>
                                                <p className="text-[11px] font-mono text-teal-600 font-semibold mt-0.5">{sourceStudent.student_id}</p>
                                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{sourceStudent.course || 'No course assigned'}</p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sourceStudent.year_level || 'No year level'}</p>
                                                {sourceStudent.is_archived && (
                                                    <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded">
                                                        Archived
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : sourceId.trim() ? (
                                        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 flex items-center justify-center text-center text-xs text-rose-600 min-h-[100px] border-dashed">
                                            Student ID not found
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                            Enter a Source Student ID
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Student (To)</span>
                                    {targetLoading ? (
                                        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                            Loading student details...
                                        </div>
                                    ) : targetStudent ? (
                                        <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 flex items-start gap-3 min-h-[100px]">
                                            {targetStudent.profile_picture_url ? (
                                                <ResolvedProfileImage
                                                    storedValue={targetStudent.profile_picture_url}
                                                    studentId={targetStudent.student_id}
                                                    alt="Profile"
                                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-700 font-bold shrink-0">
                                                    <User size={20} />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-800 truncate">
                                                    {[targetStudent.first_name, targetStudent.middle_name, targetStudent.last_name, targetStudent.suffix].filter(Boolean).join(' ')}
                                                </p>
                                                <p className="text-[11px] font-mono text-amber-600 font-semibold mt-0.5">{targetStudent.student_id}</p>
                                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{targetStudent.course || 'No course assigned'}</p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{targetStudent.year_level || 'No year level'}</p>
                                                {targetStudent.is_archived && (
                                                    <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded">
                                                        Archived
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : targetId.trim() ? (
                                        <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 flex flex-col justify-center items-center text-center min-h-[100px] border-dashed">
                                            <p className="text-xs font-bold text-emerald-700">ID is Vacant</p>
                                            <p className="text-[10px] text-emerald-600/80 mt-1">This will rename the source student's ID.</p>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                            Enter a Target Student ID
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            disabled={isSwappingIds}
                            onClick={() => setShowIdSwapModal(false)}
                            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSwappingIds || !sourceStudent}
                            className="flex-1 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 shadow-lg disabled:opacity-60"
                        >
                            {isSwappingIds ? 'Updating...' : (sourceStudent && targetStudent ? 'Swap Student IDs' : (sourceStudent && !targetStudent && targetId.trim() ? 'Rename Student ID' : 'Update / Swap'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
