import { RefreshCw, User, X } from 'lucide-react';
import { ResolvedProfileImage } from '../../../../../components/ResolvedProfileImage';

interface IdSwapModalProps {
    handleSwapIds: (e: React.FormEvent) => Promise<void>;
    isSwappingIds: boolean;
    setShowIdSwapModal: (show: boolean) => void;
    setSourceId: (id: string) => void;
    setSourceStudent: (student: any) => void;
    setTargetId: (id: string) => void;
    setTargetStudent: (student: any) => void;
    showIdSwapModal: boolean;
    sourceId: string;
    sourceLoading: boolean;
    sourceStudent: any;
    targetId: string;
    targetLoading: boolean;
    targetStudent: any;
}

const IdSwapModal = ({
    handleSwapIds,
    isSwappingIds,
    setShowIdSwapModal,
    setSourceId,
    setSourceStudent,
    setTargetId,
    setTargetStudent,
    showIdSwapModal,
    sourceId,
    sourceLoading,
    sourceStudent,
    targetId,
    targetLoading,
    targetStudent
}: IdSwapModalProps) => {
    if (!showIdSwapModal) return null;

    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
            {/* Click outside to close (transparent backdrop) */}
            <button
                type="button"
                aria-label="Close student ID dialog backdrop"
                onClick={() => {
                    setShowIdSwapModal(false);
                    setSourceId('');
                    setTargetId('');
                    setSourceStudent(null);
                    setTargetStudent(null);
                }}
                className="absolute inset-0 bg-transparent focus:outline-none cursor-default"
            />

            {/* Modal Dialog with comfortable spacing from ceiling and bottom */}
            <div className="relative z-10 bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.28)] w-full max-w-4xl max-h-[calc(100%-2.5rem)] overflow-hidden flex flex-col border border-slate-200/90 animate-scale-in">
                {/* Dark Purple Gradient Header Banner */}
                <div className="bg-gradient-to-r from-[#170529] via-[#2a0b4d] to-[#170529] p-5 px-6 flex justify-between items-center text-white border-b border-purple-900/40 shrink-0">
                    <div>
                        <h3 className="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-2.5 text-white">
                            <RefreshCw size={18} className="text-purple-300" />
                            Rename or Swap Student ID
                        </h3>
                        <p className="text-purple-200/80 text-xs mt-0.5 font-medium">
                            Safely update or exchange student IDs with automatic cascading updates.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close student ID dialog"
                        onClick={() => {
                            setShowIdSwapModal(false);
                            setSourceId('');
                            setTargetId('');
                            setSourceStudent(null);
                            setTargetStudent(null);
                        }}
                        className="text-purple-200 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSwapIds} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 custom-scrollbar">
                        <div className="max-w-2xl mx-auto space-y-5">
                            <p className="text-xs text-slate-500 leading-relaxed bg-purple-50/50 border border-purple-100 rounded-2xl p-4 text-purple-900">
                                <strong>How this works:</strong> If the Target ID is occupied by an active student, both students will safely swap their Student IDs. If the Target ID is vacant, the source student's ID will be updated. All referencing tables and records will automatically cascade and update.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="source-student-id" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source Student ID</label>
                                    <input
                                        id="source-student-id"
                                        required
                                        type="text"
                                        value={sourceId}
                                        onChange={(e) => setSourceId(e.target.value)}
                                        placeholder="e.g. 420133463"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="target-student-id" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Student ID</label>
                                    <input
                                        id="target-student-id"
                                        required
                                        type="text"
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        placeholder="e.g. 420133462"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Review Preview Comparison */}
                            {(sourceId || targetId) && (
                                <div className="border border-purple-100 rounded-2xl p-4.5 bg-purple-50/30 space-y-3.5">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <span>Operation Preview</span>
                                        {sourceStudent && targetStudent ? (
                                            <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[11px]">
                                                <RefreshCw size={11} className="animate-spin" /> Swap IDs
                                            </span>
                                        ) : sourceStudent && !targetStudent && targetId.trim() ? (
                                            <span className="text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full text-[11px]">
                                                Rename ID
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {/* Source Student Preview */}
                                        <div>
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source Student (From)</span>
                                            {sourceLoading ? (
                                                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 min-h-[90px] border-dashed font-medium">
                                                    Loading student details...
                                                </div>
                                            ) : sourceStudent ? (
                                                <div className="p-3.5 rounded-xl border border-purple-100 bg-white flex items-start gap-3 min-h-[90px] shadow-2xs">
                                                    {sourceStudent.profile_picture_url ? (
                                                        <ResolvedProfileImage
                                                            storedValue={sourceStudent.profile_picture_url}
                                                            studentId={sourceStudent.student_id}
                                                            alt="Profile"
                                                            className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-11 h-11 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
                                                            <User size={18} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-900 truncate">
                                                            {[sourceStudent.first_name, sourceStudent.middle_name, sourceStudent.last_name, sourceStudent.suffix].filter(Boolean).join(' ')}
                                                        </p>
                                                        <p className="text-[11px] font-mono text-purple-600 font-bold mt-0.5">{sourceStudent.student_id}</p>
                                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{sourceStudent.course || 'No course assigned'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sourceStudent.year_level || 'No year level'}</p>
                                                        {sourceStudent.is_archived && (
                                                            <span className="inline-block mt-1 px-2 py-0.5 text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                                                                Archived
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : sourceId.trim() ? (
                                                <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 flex items-center justify-center text-center text-xs text-rose-600 min-h-[90px] border-dashed font-semibold">
                                                    Student ID not found
                                                </div>
                                            ) : (
                                                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-center text-xs text-slate-400 min-h-[90px] border-dashed font-medium">
                                                    Enter a Source Student ID
                                                </div>
                                            )}
                                        </div>

                                        {/* Target Student Preview */}
                                        <div>
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Student (To)</span>
                                            {targetLoading ? (
                                                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 min-h-[90px] border-dashed font-medium">
                                                    Loading student details...
                                                </div>
                                            ) : targetStudent ? (
                                                <div className="p-3.5 rounded-xl border border-amber-100 bg-white flex items-start gap-3 min-h-[90px] shadow-2xs">
                                                    {targetStudent.profile_picture_url ? (
                                                        <ResolvedProfileImage
                                                            storedValue={targetStudent.profile_picture_url}
                                                            studentId={targetStudent.student_id}
                                                            alt="Profile"
                                                            className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-11 h-11 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0">
                                                            <User size={18} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-900 truncate">
                                                            {[targetStudent.first_name, targetStudent.middle_name, targetStudent.last_name, targetStudent.suffix].filter(Boolean).join(' ')}
                                                        </p>
                                                        <p className="text-[11px] font-mono text-amber-600 font-bold mt-0.5">{targetStudent.student_id}</p>
                                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{targetStudent.course || 'No course assigned'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{targetStudent.year_level || 'No year level'}</p>
                                                        {targetStudent.is_archived && (
                                                            <span className="inline-block mt-1 px-2 py-0.5 text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                                                                Archived
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : targetId.trim() ? (
                                                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-center items-center text-center min-h-[90px] border-dashed">
                                                    <p className="text-xs font-bold text-emerald-700">ID is Vacant</p>
                                                    <p className="text-[10.5px] text-emerald-600/80 mt-0.5">This will rename the source student's ID.</p>
                                                </div>
                                            ) : (
                                                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-center text-xs text-slate-400 min-h-[90px] border-dashed font-medium">
                                                    Enter a Target Student ID
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white">
                        <button
                            type="button"
                            disabled={isSwappingIds}
                            onClick={() => {
                                setShowIdSwapModal(false);
                                setSourceId('');
                                setTargetId('');
                                setSourceStudent(null);
                                setTargetStudent(null);
                            }}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSwappingIds || !sourceStudent}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                        >
                            {isSwappingIds ? 'Updating...' : (sourceStudent && targetStudent ? 'Swap Student IDs' : (sourceStudent && !targetStudent && targetId.trim() ? 'Rename Student ID' : 'Update / Swap'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default IdSwapModal;
