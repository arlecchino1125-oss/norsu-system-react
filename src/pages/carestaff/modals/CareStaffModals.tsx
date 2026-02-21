import React from 'react';
import {
    XCircle, CheckCircle, AlertTriangle, Download, MapPin, Trash2,
    Plus, Calendar, Send, BarChart2, FileText, Users, Info,
    MessageCircle, Rocket, Paperclip, User, GraduationCap
} from 'lucide-react';

// Re-use the same exportToExcel utility already defined in NATManagementPage
function exportToExcel(headers: string[], rows: any[][], filename: string) {
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export function renderCareStaffModals(p: any) {
    const {
        showApplicationModal, setShowApplicationModal, selectedApp,
        handleAppAction, handleDeleteApplication,
        showScheduleModal, setShowScheduleModal, scheduleData, setScheduleData, handleScheduleSubmit,
        showScholarshipModal, setShowScholarshipModal, scholarshipForm, setScholarshipForm, handleAddScholarship, loading,
        showApplicantModal, setShowApplicantModal, selectedScholarship, applicantsList, handleExportApplicants,
        showEventModal, setShowEventModal, editingEventId, setEditingEventId, newEvent, setNewEvent, createEvent, getCurrentLocation,
        showAttendeesModal, setShowAttendeesModal, attendees, selectedEventTitle,
        attendeeFilter, setAttendeeFilter, yearLevelFilter, setYearLevelFilter,
        attendeeCourseFilter, setAttendeeCourseFilter, attendeeSectionFilter, setAttendeeSectionFilter,
        showFeedbackModal, setShowFeedbackModal, feedbackList,

        showCompleteModal, setShowCompleteModal, completionForm, setCompletionForm, handleCompleteSession,
        showCommandHub, setShowCommandHub, commandHubTab, setCommandHubTab, staffNotes, setStaffNotes,
        setActiveTab, toast, setToast,
        showDeleteEventModal, setShowDeleteEventModal, setEventToDelete, confirmDeleteEvent,
        showResetModal, setShowResetModal, handleResetSystem,
        showEditModal, setShowEditModal, editForm, setEditForm, handleUpdateStudent, allCourses,
        showDeleteModal, setShowDeleteModal, studentToDelete, confirmDeleteStudent,
    } = p;
    return (
        <>
            {/* Application Details Modal */}
            {showApplicationModal && selectedApp && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Application Details</h3>
                            <button onClick={() => setShowApplicationModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="block text-xs font-bold text-gray-500">Name</label><p className="font-semibold">{selectedApp.first_name} {selectedApp.last_name}</p></div>
                                <div><label className="block text-xs font-bold text-gray-500">Status</label><p className="font-semibold">{selectedApp.status}</p></div>
                                <div><label className="block text-xs font-bold text-gray-500">Email</label><p>{selectedApp.email}</p></div>
                                <div><label className="block text-xs font-bold text-gray-500">Mobile</label><p>{selectedApp.mobile}</p></div>
                                <div><label className="block text-xs font-bold text-gray-500">1st Priority</label><p>{selectedApp.priority_course}</p></div>
                                <div><label className="block text-xs font-bold text-gray-500">2nd Priority</label><p>{selectedApp.alt_course_1 || '-'}</p></div>
                                <div><label className="block text-xs font-bold text-gray-500">3rd Priority</label><p>{selectedApp.alt_course_2 || '-'}</p></div>
                                <div><label className="block text-xs font-bold text-gray-500">Date Applied</label><p>{new Date(selectedApp.created_at).toLocaleDateString()}</p></div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            {selectedApp.status === 'Pending' && (<>
                                <button onClick={() => handleAppAction(selectedApp.id, 'Approved')} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">Approve</button>
                                <button onClick={() => handleAppAction(selectedApp.id, 'Rejected')} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700">Reject</button>
                            </>)}
                            <button onClick={() => handleDeleteApplication(selectedApp.id)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Counseling Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Schedule Session</h3>
                            <button onClick={() => setShowScheduleModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Date</label><input type="date" required className="w-full border rounded-lg p-2 text-sm" value={scheduleData.date} onChange={e => setScheduleData({ ...scheduleData, date: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Time</label><input type="time" required className="w-full border rounded-lg p-2 text-sm" value={scheduleData.time} onChange={e => setScheduleData({ ...scheduleData, time: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Location</label><input className="w-full border rounded-lg p-2 text-sm" value={scheduleData.location} onChange={e => setScheduleData({ ...scheduleData, location: e.target.value })} placeholder="e.g. Guidance Office" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Notes for Student</label><textarea rows={3} className="w-full border rounded-lg p-2 text-sm" value={scheduleData.notes} onChange={e => setScheduleData({ ...scheduleData, notes: e.target.value })} placeholder="Optional notes..." /></div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Confirm Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}





            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    <div className="text-xl">{toast.type === 'error' ? <XCircle /> : <CheckCircle />}</div>
                    <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                </div>
            )}


            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in">
                        <h3 className="font-bold text-lg mb-4 gradient-text">Complete Counseling Session</h3>
                        <form onSubmit={handleCompleteSession} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Public Resolution Notes</label>
                                <textarea rows={4} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Provide advice, recommendations, or next steps..." value={completionForm.publicNotes} onChange={e => setCompletionForm({ ...completionForm, publicNotes: e.target.value })}></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Confidential Notes</label>
                                <textarea className="w-full border rounded-lg p-2 text-sm bg-red-50" rows={3} placeholder="Private notes for staff only..." value={completionForm.privateNotes} onChange={e => setCompletionForm({ ...completionForm, privateNotes: e.target.value })}></textarea>
                                <p className="text-[10px] text-red-500 mt-1">* Only visible to Guidance Staff</p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowCompleteModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">Complete Session</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* COMMAND HUB FAB + PANEL */}
            <button
                onClick={() => setShowCommandHub(!showCommandHub)}
                className={`fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full shadow-xl shadow-purple-300/40 hover:shadow-2xl hover:shadow-purple-400/50 hover:scale-110 transition-all duration-300 flex items-center justify-center ${showCommandHub ? '' : 'animate-float'}`}
                title="Command Hub"
            >
                {showCommandHub ? <XCircle size={24} /> : <MessageCircle size={24} />}
            </button>

            {showCommandHub && (
                <div className="fixed bottom-24 right-6 z-40 w-[370px] max-h-[520px] bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-2xl shadow-purple-200/30 flex flex-col overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
                        <h3 className="font-bold text-sm">Command Hub</h3>
                        <p className="text-purple-200 text-[11px]">Quick actions, tips & notes</p>
                    </div>

                    {/* Tab bar */}
                    <div className="flex border-b border-gray-100 bg-gray-50/80">
                        {[
                            { key: 'actions', label: 'Actions', icon: <Rocket size={14} /> },
                            { key: 'help', label: 'Help', icon: <Info size={14} /> },
                            { key: 'notes', label: 'Notes', icon: <FileText size={14} /> },
                        ].map(t => (
                            <button key={t.key} onClick={() => setCommandHubTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${commandHubTab === t.key ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {commandHubTab === 'actions' && (
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'New Event', icon: <Calendar size={18} />, color: 'from-blue-400 to-indigo-500', action: () => { setActiveTab('events'); setShowCommandHub(false); } },
                                    { label: 'Announcement', icon: <Send size={18} />, color: 'from-purple-400 to-violet-500', action: () => { setActiveTab('events'); setShowCommandHub(false); } },
                                    { label: 'Counseling', icon: <Users size={18} />, color: 'from-teal-400 to-cyan-500', action: () => { setActiveTab('counseling'); setShowCommandHub(false); } },
                                    { label: 'Support', icon: <CheckCircle size={18} />, color: 'from-amber-400 to-orange-500', action: () => { setActiveTab('support'); setShowCommandHub(false); } },
                                    { label: 'Analytics', icon: <BarChart2 size={18} />, color: 'from-emerald-400 to-green-500', action: () => { setActiveTab('analytics'); setShowCommandHub(false); } },
                                    { label: 'NAT Mgmt', icon: <FileText size={18} />, color: 'from-rose-400 to-pink-500', action: () => { setActiveTab('nat'); setShowCommandHub(false); } },
                                ].map((item, idx) => (
                                    <button key={idx} onClick={item.action} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200 group">
                                        <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                                            {item.icon}
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-purple-700 transition-colors">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {commandHubTab === 'help' && (
                            <div className="space-y-3">
                                {[
                                    { icon: '📅', title: 'Events & Announcements', desc: 'Create events from the Events tab or use Quick Actions on Dashboard. Students receive real-time push notifications.' },
                                    { icon: '🧠', title: 'Counseling Workflow', desc: 'Students submit requests → you Schedule → Conduct session → Mark Complete with notes. Confidential notes are private.' },
                                    { icon: '📋', title: 'NAT Management', desc: 'Track applicants, manage test schedules, and view test takers (students who timed in & out on exam day).' },
                                    { icon: '📊', title: 'Student Analytics', desc: 'Use form-based needs assessments to analyze student wellness trends across departments and year levels.' },
                                    { icon: '🔔', title: 'Real-time Updates', desc: 'All data syncs in real-time. You\'ll see toast notifications when students submit feedback or new requests arrive.' },
                                ].map((tip, idx) => (
                                    <div key={idx} className="flex gap-3 p-3 rounded-xl bg-gray-50/80 hover:bg-purple-50/50 transition-colors">
                                        <span className="text-lg flex-shrink-0">{tip.icon}</span>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{tip.title}</p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{tip.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {commandHubTab === 'notes' && (
                            <div className="space-y-3">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const input = (e.currentTarget.elements as any).noteInput as HTMLInputElement;
                                    const text = input.value.trim();
                                    if (!text) return;
                                    const updated = [{ id: Date.now(), text, time: new Date().toLocaleString() }, ...staffNotes];
                                    setStaffNotes(updated);
                                    localStorage.setItem('care_staff_notes', JSON.stringify(updated));
                                    input.value = '';
                                }} className="flex gap-2">
                                    <input name="noteInput" placeholder="Quick note..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all" />
                                    <button type="submit" className="px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-200 transition-all">
                                        <Plus size={16} />
                                    </button>
                                </form>

                                {staffNotes.length === 0 ? (
                                    <p className="text-center text-gray-400 text-xs py-6">No notes yet. Jot down reminders, shift handover info, or quick memos.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                                        {staffNotes.map(note => (
                                            <div key={note.id} className="flex gap-2 p-3 rounded-xl bg-gray-50/80 group hover:bg-yellow-50/50 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-800 leading-relaxed">{note.text}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">{note.time}</p>
                                                </div>
                                                <button onClick={() => {
                                                    const updated = staffNotes.filter(n => n.id !== note.id);
                                                    setStaffNotes(updated);
                                                    localStorage.setItem('care_staff_notes', JSON.stringify(updated));
                                                }} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 self-start">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ENHANCED TOAST NOTIFICATION */}
            {toast && (
                <div className="fixed bottom-6 right-24 z-50 bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-2xl shadow-purple-100/30 rounded-2xl p-4 flex items-center gap-4 animate-slide-in-right overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${toast.type === 'success' ? 'bg-gradient-to-b from-green-400 to-emerald-500' :
                        toast.type === 'error' ? 'bg-gradient-to-b from-red-400 to-rose-500' :
                            'bg-gradient-to-b from-blue-400 to-indigo-500'
                        }`} />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md shadow-green-200/50' :
                        toast.type === 'error' ? 'bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-md shadow-red-200/50' :
                            'bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-md shadow-blue-200/50'
                        }`}>
                        {toast.type === 'success' ? <CheckCircle size={20} /> :
                            toast.type === 'error' ? <AlertTriangle size={20} /> :
                                <Info size={20} />}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">
                            {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Notification'}
                        </h4>
                        <p className="text-xs text-gray-500 max-w-[200px]">{toast.msg}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
                        <XCircle size={16} className="text-gray-400" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
                        <div className={`h-full animate-shrink ${toast.type === 'success' ? 'bg-green-400' :
                            toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                            }`} />
                    </div>
                </div>
            )}

            {/* Custom Delete Event Modal */}
            {showDeleteEventModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-scale-in">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Event?</h3>
                        <p className="text-gray-500 text-sm mb-6">Are you sure you want to delete this event? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowDeleteEventModal(false); setEventToDelete(null); }} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                            <button onClick={confirmDeleteEvent} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SYSTEM RESET CONFIRMATION MODAL */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-backdrop">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-in">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-rose-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-200/50">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">System Reset</h3>
                            <p className="text-gray-500 text-sm mb-6">âš ï¸ WARNING: This will DELETE ALL user-submitted data (Students, Applications, Logs, etc.). This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowResetModal(false)} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all duration-200">Cancel</button>
                                <button onClick={handleResetSystem} className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-red-200 transition-all duration-300 hover:scale-[1.01]">Yes, Wipe Data</button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
            {/* Lifted Edit Student Modal (Shared) */}
            {
                showEditModal && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                        <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-in-right">
                            <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900">Student Profile</h3>
                                    <p className="text-xs text-slate-500">View and edit full student details</p>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><XCircle size={24} className="text-slate-400" /></button>
                            </div>

                            <form onSubmit={handleUpdateStudent} className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Personal Information */}
                                <section>
                                    <h4 className="font-bold text-sm text-blue-600 mb-4 border-b border-blue-100 pb-2 flex items-center gap-2"><User size={16} /> Personal Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">First Name</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.first_name || ''} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Last Name</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.last_name || ''} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Middle Name</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.middle_name || ''} onChange={e => setEditForm({ ...editForm, middle_name: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Suffix</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.suffix || ''} onChange={e => setEditForm({ ...editForm, suffix: e.target.value })} /></div>

                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Date of Birth</label><input type="date" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.dob || ''} onChange={e => setEditForm({ ...editForm, dob: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Place of Birth</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.place_of_birth || ''} onChange={e => setEditForm({ ...editForm, place_of_birth: e.target.value })} /></div>

                                        <div>
                                            <label className="block text-xs font-bold mb-1 text-slate-700">Sex</label>
                                            <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white" value={editForm.sex || ''} onChange={e => setEditForm({ ...editForm, sex: e.target.value })}>
                                                <option value="">Select...</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold mb-1 text-slate-700">Gender Identity</label>
                                            <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.gender_identity || ''} onChange={e => setEditForm({ ...editForm, gender_identity: e.target.value })} placeholder="e.g. LGBTQ+" />
                                        </div>

                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Civil Status</label>
                                            <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white" value={editForm.civil_status || ''} onChange={e => setEditForm({ ...editForm, civil_status: e.target.value })}>
                                                <option value="">Select...</option>
                                                <option value="Single">Single</option>
                                                <option value="Married">Married</option>
                                                <option value="Separated">Separated</option>
                                                <option value="Widowed">Widowed</option>
                                            </select>
                                        </div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Nationality</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.nationality || ''} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} /></div>
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-bold text-sm text-green-600 mb-4 border-b border-green-100 pb-2 flex items-center gap-2"><MapPin size={16} /> Address & Contact</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-slate-700">Street / Info</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.street || ''} onChange={e => setEditForm({ ...editForm, street: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">City/Municipality</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.city || ''} onChange={e => setEditForm({ ...editForm, city: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Province</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.province || ''} onChange={e => setEditForm({ ...editForm, province: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Zip Code</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.zip_code || ''} onChange={e => setEditForm({ ...editForm, zip_code: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Mobile</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.mobile || ''} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Email</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Facebook</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.facebook_url || ''} onChange={e => setEditForm({ ...editForm, facebook_url: e.target.value })} /></div>
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-bold text-sm text-purple-600 mb-4 border-b border-purple-100 pb-2 flex items-center gap-2"><GraduationCap size={16} /> Academic Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Student ID</label><input disabled className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm text-slate-500 cursor-not-allowed" value={editForm.student_id || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Course</label>
                                            <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white" value={editForm.course || ''} onChange={e => setEditForm({ ...editForm, course: e.target.value })}>
                                                {allCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Year Level</label>
                                            <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white" value={editForm.year_level || ''} onChange={e => setEditForm({ ...editForm, year_level: e.target.value })}>
                                                <option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option>
                                            </select>
                                        </div>
                                        <div><label className="block text-xs font-bold mb-1 text-slate-700">Status</label>
                                            <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white" value={editForm.status || ''} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                                <option>Active</option><option>Inactive</option><option>Probation</option><option>Graduated</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                <div className="pt-6 flex justify-end gap-3 border-t border-slate-200 sticky bottom-0 bg-white/95 backdrop-blur-sm p-4 -mx-8 -mb-8 shadow-inner">
                                    <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition">Cancel</button>
                                    <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] transition-all">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            {/* Lifted Delete Student Modal (Shared) */}
            {showDeleteModal && studentToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2">Delete Student?</h3>
                        <p className="text-slate-500 text-sm mb-6">Are you sure you want to delete {studentToDelete.first_name}?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={confirmDeleteStudent} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
