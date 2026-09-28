import React from 'react';
import { Calendar, Clock, FileText, XCircle } from 'lucide-react';
import { toTitleCase } from '../../../../../utils/formatters';

export interface CounselingScheduleModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    request: any;
    scheduleData: { date: string; time: string; notes: string };
    setScheduleData: React.Dispatch<React.SetStateAction<any>>;
    isSubmitting: boolean;
    title?: string;
}

export const CounselingScheduleModal: React.FC<CounselingScheduleModalProps> = ({
    open,
    onClose,
    onSubmit,
    request,
    scheduleData,
    setScheduleData,
    isSubmitting,
    title = 'Schedule Counseling Session'
}) => {
    if (!open || !request) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">{title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Set date and time for CARE counseling</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close scheduling dialog"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                    >
                        <XCircle size={22} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
                        <p className="text-sm font-bold text-indigo-950">
                            {toTitleCase(request.student_name, 'Student')}
                        </p>
                        <p className="text-xs text-indigo-700 mt-0.5 font-medium">
                            {request.course_year || 'Course & Year not specified'} • {request.department || 'General'}
                        </p>
                        <p className="text-xs text-indigo-800/80 mt-1.5 line-clamp-2">
                            {request.reason_for_referral || request.description || 'No description provided.'}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="care-session-date" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1">
                            <Calendar size={14} className="text-indigo-600" />
                            Session Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="care-session-date"
                            type="date"
                            value={scheduleData.date}
                            onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="care-session-time" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1">
                            <Clock size={14} className="text-indigo-600" />
                            Session Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="care-session-time"
                            type="time"
                            value={scheduleData.time}
                            onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="care-session-notes" className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1">
                            <FileText size={14} className="text-indigo-600" />
                            Instructions / Notes (Optional)
                        </label>
                        <textarea
                            id="care-session-notes"
                            value={scheduleData.notes}
                            onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                            placeholder="Location, what to prepare, or notes for the student..."
                        />
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
                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CounselingScheduleModal;
