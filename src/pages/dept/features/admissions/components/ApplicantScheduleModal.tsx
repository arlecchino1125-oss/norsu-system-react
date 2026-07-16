import React from 'react';
import { Mail, CalendarDays, X, Check, Clock, User, MapPin } from 'lucide-react';

export function ApplicantScheduleModal({
    showApplicantScheduleModal,
    closeApplicantScheduleModal,
    applicantScheduleMode,
    applicantScheduleData,
    setApplicantScheduleData,
    confirmApplicantSchedule,
    isSchedulingApplicant,
    selectedApplicants
}: any) {
    if (!showApplicantScheduleModal) return null;

    const isReschedule = applicantScheduleMode === 'reschedule';
    const isBulk = selectedApplicants?.length > 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" aria-label="Close interview scheduling dialog" className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400" onClick={closeApplicantScheduleModal} />
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                <div className="flex px-6 py-5 border-b border-slate-100 items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md rounded-t-3xl z-10">
                    <h3 className="text-xl font-bold text-slate-800">
                        {isReschedule ? 'Reschedule Interview' : isBulk ? 'Bulk Schedule Interviews' : 'Schedule Interview'}
                    </h3>
                    <button type="button"
                        onClick={closeApplicantScheduleModal}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {!isBulk && selectedApplicants?.length === 1 && (
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {(selectedApplicants[0].first_name?.[0] || 'A')}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">
                                        {selectedApplicants[0].first_name} {selectedApplicants[0].last_name}
                                    </p>
                                    <p className="text-sm text-slate-500">{selectedApplicants[0].reference_id}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {isBulk && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 text-blue-800">
                            <User size={20} className="text-blue-500" />
                            <span className="font-semibold">Scheduling {selectedApplicants.length} applicants</span>
                        </div>
                    )}

                    <form id="schedule-form" onSubmit={confirmApplicantSchedule} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                                <div className="relative">
                                    <CalendarDays size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="date"
                                        required
                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                        value={applicantScheduleData.date}
                                        onChange={(e) => setApplicantScheduleData({ ...applicantScheduleData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Time</label>
                                <div className="relative">
                                    <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="time"
                                        required
                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                        value={applicantScheduleData.time}
                                        onChange={(e) => setApplicantScheduleData({ ...applicantScheduleData, time: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Venue / Zoom Link</label>
                            <div className="relative">
                                <MapPin size={18} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Room 101 or Zoom URL"
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    value={applicantScheduleData.venue || ''}
                                    onChange={(e) => setApplicantScheduleData({ ...applicantScheduleData, venue: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Interview Panel</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="e.g. Dr. Smith (Optional)"
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    value={applicantScheduleData.panel || ''}
                                    onChange={(e) => setApplicantScheduleData({ ...applicantScheduleData, panel: e.target.value })}
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3 sticky bottom-0">
                    <button
                        type="button"
                        onClick={closeApplicantScheduleModal}
                        className="px-5 py-2.5 rounded-xl font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                        disabled={isSchedulingApplicant}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="schedule-form"
                        disabled={isSchedulingApplicant || !applicantScheduleData.date || !applicantScheduleData.time}
                        className="px-5 py-2.5 rounded-xl font-medium text-white shadow-md shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isSchedulingApplicant ? (
                            <>
                                <Clock size={18} className="animate-spin" />
                                <span>Previewing Email...</span>
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                <span>{isReschedule ? 'Reschedule' : 'Schedule'} & Preview Email</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
