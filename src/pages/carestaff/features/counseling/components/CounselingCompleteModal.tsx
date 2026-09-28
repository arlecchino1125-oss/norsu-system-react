import React from 'react';
import { CheckCircle2, Lock, MessageSquare, XCircle } from 'lucide-react';
import { toTitleCase } from '../../../../../utils/formatters';

export interface CounselingCompleteModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    request: any;
    completionForm: { id: any; student_id: any; publicNotes: string; privateNotes: string };
    setCompletionForm: React.Dispatch<React.SetStateAction<any>>;
    isSubmitting: boolean;
}

export const CounselingCompleteModal: React.FC<CounselingCompleteModalProps> = ({
    open,
    onClose,
    onSubmit,
    request,
    completionForm,
    setCompletionForm,
    isSubmitting
}) => {
    if (!open || !request) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
                            <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Complete Counseling Session</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Record advice and confidential case notes</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Close completion dialog"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                    >
                        <XCircle size={22} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    <div className="bg-green-50/60 p-4 rounded-xl border border-green-100">
                        <p className="text-sm font-bold text-green-950">
                            {toTitleCase(request.student_name, 'Student')}
                        </p>
                        <p className="text-xs text-green-700 mt-0.5 font-medium">
                            {request.course_year || 'Course & Year not specified'} • {request.department || 'General'}
                        </p>
                        <p className="text-xs text-green-800/80 mt-1 line-clamp-2">
                            {request.reason_for_referral || request.description || 'No description provided.'}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="care-complete-public-notes" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1">
                            <MessageSquare size={14} className="text-green-600" />
                            Advice / Guidance Notes for Student <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="care-complete-public-notes"
                            value={completionForm.publicNotes}
                            onChange={(e) => setCompletionForm({ ...completionForm, publicNotes: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none"
                            placeholder="Advice, steps to take, or guidance visible to the student upon completion..."
                            required
                        />
                        <p className="text-[11px] text-gray-400 mt-1">This note is visible to the student in their portal.</p>
                    </div>

                    <div>
                        <label htmlFor="care-complete-private-notes" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1">
                            <Lock size={14} className="text-amber-600" />
                            Confidential Counselor Notes (Staff Only)
                        </label>
                        <textarea
                            id="care-complete-private-notes"
                            value={completionForm.privateNotes}
                            onChange={(e) => setCompletionForm({ ...completionForm, privateNotes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                            placeholder="Internal clinical impressions, observations, or private case notes..."
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Private to CARE counselors. Never visible to students.</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-md shadow-green-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Completing...' : 'Mark as Complete'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CounselingCompleteModal;
