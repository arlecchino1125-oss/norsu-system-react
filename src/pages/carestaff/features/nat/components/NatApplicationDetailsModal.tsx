import React from 'react';
import { XCircle } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { formatDate, formatDateTime, formatTime } from '../../../../../utils/formatters';
import StatusBadge from '../../../../../components/StatusBadge';

import { PASS_STATUS, FAIL_STATUS } from '../constants';
import { canMarkNatPassed, isNatFinalizedStatus } from '../utils';

const NatApplicationDetailsModal = ({
    closeSelectedAppModal,
    formatAssignedSlot,
    isLoadingSelectedApp,
    selectedApp,
    showModal,
    supportsAttendance,
    updateStatus
}: any) => (
    <AnimatePresence>
        {showModal && selectedApp && (
            <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 md:p-6 backdrop-blur-sm overflow-y-auto"
            >
                <m.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }}
                    className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="px-8 py-6 bg-gradient-to-br from-purple-900 via-purple-950 to-slate-950 text-white flex-shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.15),transparent)] pointer-events-none" />
                        <div className="flex justify-between items-start relative z-10 gap-4">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300/80 mb-1">Negros Oriental State University — CARE Center</p>
                                <h3 className="font-black text-2xl tracking-tight text-white leading-tight">NAT APPLICATION FORM</h3>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-purple-200/70 font-medium">
                                    <span>Submitted: {formatDateTime(selectedApp.created_at)}</span>
                                    {selectedApp.isArchivedRecord && (
                                        <span className="text-amber-300 font-semibold">
                                            Finalized: {formatDateTime(selectedApp.archived_at || selectedApp.completed_at)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <StatusBadge status={selectedApp.status} />
                                <button type="button"
                                    onClick={closeSelectedAppModal}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-white/40"
                                >
                                    <XCircle size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {isLoadingSelectedApp ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-semibold text-slate-500">Loading applicant details...</p>
                            </div>
                        ) : (
                            <>
                                {/* Reference ID Bento */}
                                <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-extrabold text-purple-800 uppercase tracking-wider">Reference ID</span>
                                        <span className="font-mono font-black text-purple-950 text-base">{selectedApp.reference_id}</span>
                                    </div>
                                    {!isNatFinalizedStatus(selectedApp.status) && (
                                        <span className="text-xs text-purple-600 font-semibold animate-pulse">Pending Decision</span>
                                    )}
                                </div>

                                {/* Personal Info Bento */}
                                <div className="bg-slate-50/50 rounded-2xl border border-slate-100/80 p-5">
                                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Personal Information</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">First Name</label><p className="text-sm font-extrabold text-slate-800">{selectedApp.first_name || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Last Name</label><p className="text-sm font-extrabold text-slate-800">{selectedApp.last_name || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Middle Name</label><p className="text-sm font-semibold text-slate-700">{selectedApp.middle_name || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Suffix</label><p className="text-sm font-semibold text-slate-700">{selectedApp.suffix || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Date of Birth</label><p className="text-sm font-semibold text-slate-700">{selectedApp.dob || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Age</label><p className="text-sm font-semibold text-slate-700">{selectedApp.age || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Place of Birth</label><p className="text-sm font-semibold text-slate-700">{selectedApp.place_of_birth || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Nationality</label><p className="text-sm font-semibold text-slate-700">{selectedApp.nationality || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Sex</label><p className="text-sm font-semibold text-slate-700">{selectedApp.sex || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Gender Identity</label><p className="text-sm font-semibold text-slate-700">{selectedApp.gender_identity || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Civil Status</label><p className="text-sm font-semibold text-slate-700">{selectedApp.civil_status || '—'}</p></div>
                                    </div>
                                </div>

                                {/* Address Bento */}
                                <div className="bg-slate-50/50 rounded-2xl border border-slate-100/80 p-5">
                                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Address</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Street</label><p className="text-sm font-semibold text-slate-700">{selectedApp.street || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">City/Municipality</label><p className="text-sm font-semibold text-slate-700">{selectedApp.city || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Province</label><p className="text-sm font-semibold text-slate-700">{selectedApp.province || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Zip Code</label><p className="text-sm font-semibold text-slate-700">{selectedApp.zip_code || '—'}</p></div>
                                    </div>
                                </div>

                                {/* Contact Bento */}
                                <div className="bg-slate-50/50 rounded-2xl border border-slate-100/80 p-5">
                                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Contact Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Mobile</label><p className="text-sm font-semibold text-slate-700">{selectedApp.mobile || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Email</label><p className="text-sm font-semibold text-slate-700 break-all">{selectedApp.email || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Facebook URL</label><p className="text-sm font-semibold text-slate-700 break-all">{selectedApp.facebook_url || '—'}</p></div>
                                    </div>
                                </div>

                                {/* Education Bento */}
                                <div className="bg-slate-50/50 rounded-2xl border border-slate-100/80 p-5">
                                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Educational Background</h4>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Reason for Applying</label>
                                        <p className="text-sm font-semibold text-slate-700 leading-relaxed">{selectedApp.reason || '—'}</p>
                                    </div>
                                </div>

                                {/* Course Preferences Bento */}
                                <div className="bg-purple-50/30 rounded-2xl border border-purple-100/60 p-5">
                                    <h4 className="text-xs font-extrabold text-purple-700 uppercase tracking-widest mb-4 border-b border-purple-100/40 pb-2">Course Preferences</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Priority Course</label>
                                            <span className="text-sm font-black text-purple-900 bg-purple-100/40 px-3 py-2 rounded-xl inline-block">{selectedApp.priority_course || '—'}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Alternative Course 1</label>
                                            <p className="text-sm font-bold text-slate-700">{selectedApp.alt_course_1 || '—'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Alternative Course 2</label>
                                            <p className="text-sm font-bold text-slate-700">{selectedApp.alt_course_2 || '—'}</p>
                                        </div>
                                        {selectedApp.isArchivedRecord && (
                                            <div className="md:col-span-2 mt-2">
                                                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Activated Course</label>
                                                <span className="text-sm font-black text-emerald-950 bg-emerald-100/40 px-3 py-2 rounded-xl inline-block">{selectedApp.activated_course || '—'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Test Schedule Bento */}
                                <div className="bg-blue-50/20 rounded-2xl border border-blue-100/50 p-5">
                                    <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-widest mb-4 border-b border-blue-100/30 pb-2">Test Schedule</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Test Date</label>
                                            <p className="text-sm font-extrabold text-blue-900">{formatDate(selectedApp.test_date)}</p>
                                        </div>
                                        {supportsAttendance ? (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Time In</label>
                                                    <p className="text-sm font-bold text-emerald-600 font-mono">{formatTime(selectedApp.time_in, '-')}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Time Out</label>
                                                    <p className="text-sm font-bold text-rose-500 font-mono">{formatTime(selectedApp.time_out, '-')}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Test Slot</label>
                                                    <p className="text-sm font-bold text-slate-800">{formatAssignedSlot(selectedApp.test_time)}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Current Status</label>
                                                    <p className="text-sm font-bold text-slate-800">{selectedApp.status || 'Submitted'}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 flex flex-col sm:flex-row gap-3">
                        {!isNatFinalizedStatus(selectedApp.status) && !isLoadingSelectedApp && (
                            <div className="flex-1 flex gap-3">
                                <button
                                    type="button"
                                    disabled={!canMarkNatPassed(selectedApp)}
                                    onClick={() => updateStatus(selectedApp, PASS_STATUS)}
                                    className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all focus:outline-none focus:ring-2 ${canMarkNatPassed(selectedApp) ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-green-700 active:scale-[0.98] focus:ring-emerald-500/50' : 'cursor-not-allowed bg-slate-200 text-slate-400 focus:ring-slate-300'}`}
                                    title={canMarkNatPassed(selectedApp) ? 'Mark as passed' : 'Time In and Time Out are required before passing'}
                                >
                                    Pass
                                </button>
                                <button type="button"
                                    onClick={() => updateStatus(selectedApp, FAIL_STATUS)}
                                    className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-red-650 hover:from-rose-600 hover:to-red-750 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                                >
                                    Fail
                                </button>
                            </div>
                        )}
                        <button type="button"
                            onClick={closeSelectedAppModal}
                            className={`${(!isNatFinalizedStatus(selectedApp.status) && !isLoadingSelectedApp) ? 'sm:w-32' : 'w-full'} py-3 bg-slate-200 hover:bg-slate-350/80 text-slate-700 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300`}
                        >
                            Close
                        </button>
                    </div>
                </m.div>
            </m.div>
        )}
    </AnimatePresence>
);

export default NatApplicationDetailsModal;
