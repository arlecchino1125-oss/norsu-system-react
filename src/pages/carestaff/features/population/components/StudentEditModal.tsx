import { Edit, X } from 'lucide-react';
import { useAsyncHandler } from '../../../../../components/ui/Button';
import { YEAR_LEVEL_OPTIONS } from '../constants';

interface StudentEditModalProps {
    allCourses: any[];
    editForm: any;
    handleUpdateStudent: (e: React.FormEvent) => Promise<void>;
    setEditForm: (form: any) => void;
    setShowEditModal: (show: boolean) => void;
    showEditModal: boolean;
}

const StudentEditModal = ({
    allCourses,
    editForm,
    handleUpdateStudent,
    setEditForm,
    setShowEditModal,
    showEditModal
}: StudentEditModalProps) => {
    const [onUpdateStudent, isUpdatingStudent] = useAsyncHandler(handleUpdateStudent);

    if (!showEditModal) return null;

    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
            {/* Click outside to close (transparent backdrop) */}
            <button
                type="button"
                aria-label="Close edit student backdrop"
                onClick={() => setShowEditModal(false)}
                className="absolute inset-0 bg-transparent focus:outline-none cursor-default"
            />

            {/* Modal Dialog with comfortable spacing from ceiling and bottom */}
            <div className="relative z-10 bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.28)] w-full max-w-4xl max-h-[calc(100%-2.5rem)] overflow-hidden flex flex-col border border-slate-200/90 animate-scale-in">
                {/* Dark Purple Gradient Header Banner */}
                <div className="bg-gradient-to-r from-[#170529] via-[#2a0b4d] to-[#170529] p-5 px-6 flex justify-between items-center text-white border-b border-purple-900/40 shrink-0">
                    <div>
                        <h3 className="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-2.5 text-white">
                            <Edit size={18} className="text-purple-300" />
                            Edit Student Profile
                        </h3>
                        <p className="text-purple-200/80 text-xs mt-0.5 font-medium">
                            Update student academic information and confirmation window settings.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close student editor"
                        onClick={() => setShowEditModal(false)}
                        className="text-purple-200 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={onUpdateStudent} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 custom-scrollbar">
                        <div className="max-w-2xl mx-auto space-y-5">
                            {/* First & Last Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="student-first-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">First Name</label>
                                    <input
                                        id="student-first-name"
                                        required
                                        value={editForm.first_name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="student-last-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Last Name</label>
                                    <input
                                        id="student-last-name"
                                        required
                                        value={editForm.last_name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Course */}
                            <div className="space-y-1.5">
                                <label htmlFor="student-course" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Course</label>
                                <select
                                    id="student-course"
                                    required
                                    value={editForm.course || ''}
                                    onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                >
                                    <option value="">Select course...</option>
                                    {allCourses.map((course: any) => (
                                        <option key={course.id} value={course.name}>{course.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Year Level & Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="student-year-level" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Year Level</label>
                                    <select
                                        id="student-year-level"
                                        value={editForm.year_level || '1st Year'}
                                        onChange={(e) => setEditForm({ ...editForm, year_level: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                    >
                                        {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="student-status" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                                    <select
                                        id="student-status"
                                        value={editForm.status || 'Active'}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Probation">Probation</option>
                                    </select>
                                </div>
                            </div>

                            {/* Confirmation Window Settings */}
                            <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 sm:p-5 space-y-3">
                                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(editForm.course_year_update_required)}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            course_year_update_required: e.target.checked,
                                            course_year_window_start: e.target.checked ? editForm.course_year_window_start || '' : '',
                                            course_year_window_end: e.target.checked ? editForm.course_year_window_end || '' : '',
                                        })}
                                        className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <div>
                                        <span className="font-bold text-slate-800">Require course &amp; year confirmation</span>
                                        <span className="block text-[11px] text-slate-500 mt-0.5">Student must confirm course and year level during the window.</span>
                                    </div>
                                </label>

                                {Boolean(editForm.course_year_update_required) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        <div className="space-y-1">
                                            <label htmlFor="student-window-start" className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Window Start</label>
                                            <input
                                                id="student-window-start"
                                                type="datetime-local"
                                                value={editForm.course_year_window_start || ''}
                                                onChange={(e) => setEditForm({ ...editForm, course_year_window_start: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:border-purple-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="student-window-end" className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Window End</label>
                                            <input
                                                id="student-window-end"
                                                type="datetime-local"
                                                value={editForm.course_year_window_end || ''}
                                                onChange={(e) => setEditForm({ ...editForm, course_year_window_end: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:border-purple-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white">
                        <button
                            type="button"
                            onClick={() => setShowEditModal(false)}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdatingStudent}
                            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                        >
                            {isUpdatingStudent ? 'Updating...' : 'Update Student'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentEditModal;
