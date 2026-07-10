import {
    XCircle, CheckCircle, Trash2,
    Plus, Calendar, Send, BarChart2, FileText, Users, Info,
    MessageCircle, Rocket
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';

export function renderCareStaffModals(p: any) {
    const {
        showCommandHub, setShowCommandHub, commandHubTab, setCommandHubTab, staffNotes, setStaffNotes,
        setActiveTab,
    } = p;
    return (
        <>
            {/* COMMAND HUB FAB */}
            <button
                onClick={() => setShowCommandHub(true)}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full shadow-xl shadow-purple-300/40 hover:shadow-2xl hover:shadow-purple-400/50 hover:scale-110 transition-all duration-300 flex items-center justify-center animate-float"
                title="Command Hub"
            >
                <MessageCircle size={24} />
            </button>

            {/* COMMAND HUB PANEL */}
            <Modal
                open={showCommandHub}
                onClose={() => setShowCommandHub(false)}
                size="sm"
                showCloseButton={false}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 -mx-6 -mt-5 p-4 text-white rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-sm">Command Hub</h3>
                            <p className="text-purple-200 text-[11px]">Quick actions, tips & notes</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCommandHub(false)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-purple-200 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <XCircle size={16} />
                        </button>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex border-b border-gray-100 bg-gray-50/80 -mx-6">
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
                <div className="overflow-y-auto -mx-6 px-6 py-4">
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
                                { icon: '💬', title: 'Counseling Workflow', desc: 'Students submit requests → you Schedule → Conduct session → Mark Complete with notes. Confidential notes are private.' },
                                { icon: '📝', title: 'NAT Management', desc: 'Track applicants, manage test schedules, and view test takers (students who timed in & out on exam day).' },
                                { icon: '📊', title: 'Student Analytics', desc: 'Use form-based needs assessments to analyze student wellness trends across departments and year levels.' },
                                { icon: '⚡', title: 'Real-time Updates', desc: 'All data syncs in real-time. You\'ll see toast notifications when students submit feedback or new requests arrive.' },
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
            </Modal>
        </>
    );
}
