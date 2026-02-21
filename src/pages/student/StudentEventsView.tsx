
// StudentEventsView — extracted from StudentPortal.tsx (events section)
// ZERO-BEHAVIOR-CHANGE refactor. All JSX is identical to the original inline block.
import { createPortal } from 'react-dom';

const StudentEventsView = ({
    eventsList,
    eventFilter,
    setEventFilter,
    attendanceMap,
    fetchHistory,
    handleTimeIn,
    handleTimeOut,
    handleRateEvent,
    ratedEvents,
    isTimingIn,
    setProofFile,
    selectedEvent,
    setSelectedEvent,
    showRatingModal,
    setShowRatingModal,
    ratingForm,
    setRatingForm,
    submitRating,
    showTimeInModal,
    setShowTimeInModal,
    visitReasons,
    selectedReason,
    setSelectedReason,
    submitTimeIn,
    personalInfo,
    toast,
    Icons,
    showCommandHub,
    setShowCommandHub,
    setActiveView,
    setShowCounselingForm,
    setShowSupportModal,
}: any) => (
    <>
        <div className="page-transition">
            <div className="flex justify-between items-start mb-8 animate-fade-in-up">
                <div><h2 className="text-2xl font-extrabold mb-1 text-gray-800">Events & Announcements</h2><p className="text-sm text-gray-400">Stay updated with campus activities and important news.</p></div>
                <button onClick={fetchHistory} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-bold transition-colors"><Icons.Clock /> Refresh</button>
                <div className="flex bg-white/80 backdrop-blur-sm p-1 rounded-xl gap-1 border border-purple-100/50 shadow-sm">{['All', 'Events', 'Announcements'].map((f: string) => (<button key={f} onClick={() => setEventFilter(f)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${eventFilter === f ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-900 hover:bg-purple-50'}`}>{f}</button>))}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {eventsList.map((item: any, idx: number) => {
                    if (eventFilter === 'Events' && item.type !== 'Event') return null;
                    if (eventFilter === 'Announcements' && item.type !== 'Announcement') return null;
                    const record = attendanceMap[item.id]; const isTimedIn = !!record?.time_in; const isTimedOut = !!record?.time_out;
                    const now = new Date(); const start = new Date(`${item.event_date}T${item.event_time}`); const end = item.end_time ? new Date(`${item.event_date}T${item.end_time}`) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
                    const canTimeIn = now >= start && !isTimedIn; const canTimeOut = isTimedIn && !isTimedOut && now >= end;
                    return (
                        <div key={item.id} onClick={() => setSelectedEvent(item)} className={`bg-white/80 backdrop-blur-sm rounded-2xl border-l-4 p-8 shadow-sm relative cursor-pointer card-hover animate-fade-in-up ${item.type === 'Event' ? 'border-l-purple-500' : 'border-l-indigo-400'}`} style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="flex justify-between items-start mb-6"><span className="bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">{item.type}</span>{item.type === 'Event' && isTimedIn && (<span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1"><Icons.CheckCircle /> Attended</span>)}</div>
                            <h3 className="text-xl font-bold mb-4 text-gray-800">{item.title}</h3><p className="text-sm text-gray-400 mb-8 leading-relaxed line-clamp-3">{item.description}</p>
                            <div className="space-y-3 mb-8"><p className="text-xs text-gray-400 flex items-center gap-3 font-medium"><Icons.Events /> {item.event_date}</p>{item.type === 'Event' && (<><p className="text-xs text-gray-400 flex items-center gap-3 font-medium"><Icons.Clock /> {item.event_time}</p><p className="text-xs text-gray-400 flex items-center gap-3 font-medium"><Icons.Support /> {item.location}</p></>)}</div>
                            {item.type === 'Event' && (<div className="flex flex-col gap-3" onClick={(e: any) => e.stopPropagation()}>{!isTimedIn && (<div className="space-y-2">{canTimeIn && <input type="file" accept="image/*" onChange={(e: any) => setProofFile(e.target.files[0])} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />}</div>)}
                                <div className="flex gap-2"><button disabled={!canTimeIn || isTimingIn || isTimedIn} onClick={() => handleTimeIn(item)} className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${isTimedIn ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default' : (!canTimeIn || isTimingIn ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-sky-400 text-white hover:from-blue-400 hover:to-sky-300 shadow-lg shadow-blue-500/20')}`}>{isTimedIn ? <span><Icons.CheckCircle /> Checked In</span> : (isTimingIn ? 'Processing...' : (now < start ? `Starts ${item.event_time}` : '→] Time In'))}</button>
                                    <button disabled={!canTimeOut} onClick={() => handleTimeOut(item)} className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${isTimedOut ? 'bg-gray-100 text-gray-400 cursor-default' : (!canTimeOut ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-400 hover:to-rose-500 shadow-lg shadow-red-500/20')}`}>{isTimedOut ? 'Completed' : (now < end ? `Ends ${item.end_time || 'Later'}` : '←[ Time Out')}</button></div>
                                {isTimedOut && !ratedEvents.includes(item.id) && (<button onClick={() => !ratedEvents.includes(item.id) && handleRateEvent(item)} disabled={ratedEvents.includes(item.id)} className={`w-full py-3 border rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 btn-press ${ratedEvents.includes(item.id) ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-default' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 shadow-sm'}`}><Icons.Star filled={true} /> {ratedEvents.includes(item.id) ? 'Rated' : 'Rate'}</button>)}</div>)}
                            <p className="text-[10px] text-purple-500 font-bold mt-4 text-right">Click for full details →</p>
                        </div>);
                })}
            </div>
            {/* Event/Announcement Detail Modal */}
            {selectedEvent && (() => {
                const record = attendanceMap[selectedEvent.id]; const isTimedIn = !!record?.time_in; const isTimedOut = !!record?.time_out;
                const now = new Date(); const start = new Date(`${selectedEvent.event_date}T${selectedEvent.event_time}`); const end = selectedEvent.end_time ? new Date(`${selectedEvent.event_date}T${selectedEvent.end_time}`) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
                const canTimeIn = now >= start && !isTimedIn; const canTimeOut = isTimedIn && !isTimedOut && now >= end;
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl shadow-2xl shadow-blue-500/20 max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e: any) => e.stopPropagation()}>
                            <div className="relative">
                                <div className={`h-3 w-full rounded-t-2xl ${selectedEvent.type === 'Event' ? 'bg-black' : 'bg-blue-500'}`}></div>
                                <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <div className="p-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="bg-gray-100 text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest">{selectedEvent.type}</span>
                                    {selectedEvent.type === 'Event' && isTimedIn && <span className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1"><Icons.CheckCircle /> Attended</span>}
                                </div>
                                <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>
                                <p className="text-sm text-gray-600 leading-relaxed mb-8">{selectedEvent.description}</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Date</p>
                                        <p className="text-sm font-bold flex items-center gap-2"><Icons.Events /> {selectedEvent.event_date}</p>
                                    </div>
                                    {selectedEvent.type === 'Event' && (<>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Time</p>
                                            <p className="text-sm font-bold flex items-center gap-2"><Icons.Clock /> {selectedEvent.event_time}{selectedEvent.end_time && ` - ${selectedEvent.end_time}`}</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Location</p>
                                            <p className="text-sm font-bold flex items-center gap-2"><Icons.Support /> {selectedEvent.location}</p>
                                        </div>
                                    </>)}
                                </div>
                                {selectedEvent.type === 'Event' && (
                                    <div className="border-t pt-6">
                                        <h4 className="font-bold text-sm mb-4">Attendance</h4>
                                        {isTimedIn && isTimedOut ? (
                                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                                                <Icons.CheckCircle />
                                                <p className="text-sm font-bold text-green-800 mt-1">Attendance completed!</p>
                                                <p className="text-xs text-green-600">You have successfully checked in and out of this event.</p>
                                            </div>
                                        ) : isTimedIn ? (
                                            <div className="space-y-3">
                                                <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-sm text-green-700 font-bold flex items-center gap-2"><Icons.CheckCircle /> Checked In</div>
                                                <button disabled={!canTimeOut} onClick={() => handleTimeOut(selectedEvent)} className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${!canTimeOut ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>{now < end ? `Time Out available after ${selectedEvent.end_time || 'event ends'}` : '←[ Time Out'}</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {canTimeIn && <input type="file" accept="image/*" onChange={(e: any) => setProofFile(e.target.files[0])} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />}
                                                <button disabled={!canTimeIn || isTimingIn} onClick={() => handleTimeIn(selectedEvent)} className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${!canTimeIn || isTimingIn ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}>{isTimingIn ? 'Processing...' : (now < start ? `Check-in opens at ${selectedEvent.event_time}` : '→] Time In')}</button>
                                            </div>
                                        )}
                                        {isTimedOut && !ratedEvents.includes(selectedEvent.id) && (
                                            <button onClick={() => { setSelectedEvent(null); handleRateEvent(selectedEvent); }} className="w-full mt-4 py-3 border border-yellow-100 bg-yellow-50 text-yellow-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-yellow-100"><Icons.Star filled={true} /> Rate this event</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>

        {/* PARTICIPANT'S EVALUATION FORM MODAL */}
        {showRatingModal && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop" onClick={() => setShowRatingModal(false)} />
                <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="px-8 py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white flex-shrink-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-blue-200 mb-1">Negros Oriental State University — CARE Center</p>
                                <h3 className="text-lg font-extrabold tracking-tight">PARTICIPANT'S EVALUATION FORM</h3>
                                <p className="text-xs text-blue-200 mt-1 font-medium">{ratingForm.title}</p>
                            </div>
                            <button onClick={() => setShowRatingModal(false)} className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all flex-shrink-0 text-lg">✕</button>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {/* Student Info Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Name</label><p className="text-sm font-bold text-gray-800">{personalInfo.firstName} {personalInfo.lastName}</p></div>
                            <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sex</label><p className="text-sm font-bold text-gray-800">{personalInfo.sex || personalInfo.gender || '—'}</p></div>
                            <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">College / Campus</label><p className="text-sm font-bold text-gray-800">{personalInfo.department || '—'}</p><p className="text-[10px] text-gray-500">{personalInfo.course} - {personalInfo.year}</p></div>
                            <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date of Activity</label><p className="text-sm font-bold text-gray-800">{ratingForm.date_of_activity ? new Date(ratingForm.date_of_activity).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p></div>
                        </div>
                        {/* Evaluation Criteria */}
                        <div>
                            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-4">Evaluation Criteria</h4>
                            <p className="text-[10px] text-gray-500 mb-4">Please rate each item: <span className="font-bold">1</span> = Poor, <span className="font-bold">2</span> = Below Average, <span className="font-bold">3</span> = Average, <span className="font-bold">4</span> = Above Average, <span className="font-bold">5</span> = Excellent</p>
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-[1fr_repeat(5,48px)] bg-gray-50 border-b border-gray-200">
                                    <div className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Criteria</div>
                                    {['1', '2', '3', '4', '5'].map((n: string) => <div key={n} className="flex items-center justify-center text-[10px] font-bold text-gray-500">{n}</div>)}
                                </div>
                                {/* Criteria Rows */}
                                {[
                                    { key: 'q1', label: 'Relevance of the activity to the needs/problems of the clientele' },
                                    { key: 'q2', label: 'Quality of the activity' },
                                    { key: 'q3', label: 'Timeliness' },
                                    { key: 'q4', label: 'Management of the activity' },
                                    { key: 'q5', label: 'Overall organization of the activity' },
                                    { key: 'q6', label: 'Overall assessment of the activity' },
                                    { key: 'q7', label: 'Skills/competence of the facilitator/s' }
                                ].map((item: any, idx: number) => (
                                    <div key={item.key} className={`grid grid-cols-[1fr_repeat(5,48px)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors`}>
                                        <div className="px-4 py-3 text-xs text-gray-700 flex items-center"><span className="font-bold text-gray-500 mr-2">{idx + 1}.</span>{item.label}</div>
                                        {[1, 2, 3, 4, 5].map((val: number) => (
                                            <div key={val} className="flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setRatingForm({ ...ratingForm, [item.key]: val })}
                                                    className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${ratingForm[item.key] === val ? 'border-blue-600 bg-blue-600 scale-110 shadow-lg shadow-blue-500/30' : 'border-gray-300 hover:border-blue-400 hover:scale-105'}`}
                                                >
                                                    {ratingForm[item.key] === val && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Open-ended Questions */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">What I like best about the activity:</label>
                                <textarea rows={3} value={ratingForm.open_best} onChange={(e: any) => setRatingForm({ ...ratingForm, open_best: e.target.value })} className="w-full bg-blue-50/40 border border-blue-100 rounded-xl p-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none" placeholder="Share what you enjoyed most..."></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">My suggestions to further improve the activity:</label>
                                <textarea rows={3} value={ratingForm.open_suggestions} onChange={(e: any) => setRatingForm({ ...ratingForm, open_suggestions: e.target.value })} className="w-full bg-blue-50/40 border border-blue-100 rounded-xl p-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none" placeholder="What could be improved..."></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">Other comments:</label>
                                <textarea rows={3} value={ratingForm.open_comments} onChange={(e: any) => setRatingForm({ ...ratingForm, open_comments: e.target.value })} className="w-full bg-blue-50/40 border border-blue-100 rounded-xl p-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none" placeholder="Any other feedback..."></textarea>
                            </div>
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 flex gap-3">
                        <button onClick={submitRating} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all">Submit Evaluation</button>
                        <button onClick={() => setShowRatingModal(false)} className="px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                    </div>
                </div>
            </div>
            , document.body)}
        {/* TIME IN MODAL */}
        {showTimeInModal && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Office Visit</h3><button onClick={() => setShowTimeInModal(false)} className="text-gray-400 text-xl">✕</button></div><p className="text-sm text-gray-500 mb-4">Please select the reason for your visit:</p><div className="space-y-2 mb-6 max-h-60 overflow-y-auto">{visitReasons.map((r: any) => (<label key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedReason === r.reason ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}><input type="radio" name="reason" value={r.reason} onChange={(e: any) => setSelectedReason(e.target.value)} className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium text-gray-700">{r.reason}</span></label>))}</div><button onClick={submitTimeIn} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700">Confirm Time In</button></div></div>)}
        {/* TOAST */}
        {toast && (<div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-right z-50 backdrop-blur-sm ${toast.type === 'error' ? 'bg-red-600/90' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}><div className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</div><div><p className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</p><p className="text-xs opacity-90">{toast.message}</p></div></div>)}
        {/* STUDENT COMMAND HUB */}
        {showCommandHub && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-backdrop" onClick={() => setShowCommandHub(false)}>
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-white/20" onClick={(e: any) => e.stopPropagation()}>
                    <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/20 rounded-full -mr-10 -mt-10 blur-2xl animate-float"></div>
                        <h3 className="text-xl font-extrabold relative z-10">Student Hub</h3>
                        <p className="text-blue-200 text-xs relative z-10">Quick access to student services</p>
                        <button onClick={() => setShowCommandHub(false)} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors bg-white/10 p-1 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                        <button onClick={() => { setShowCommandHub(false); setActiveView('counseling'); setShowCounselingForm(true); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-all group">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform"><Icons.Counseling /></div>
                            <span className="text-xs font-bold text-gray-700">Counseling</span>
                        </button>
                        <button onClick={() => { setShowCommandHub(false); setActiveView('support'); setShowSupportModal(true); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all group">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><Icons.Support /></div>
                            <span className="text-xs font-bold text-gray-700">Support</span>
                        </button>
                        <button onClick={() => { setShowCommandHub(false); setActiveView('feedback'); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-pink-50 hover:bg-pink-100 border border-pink-100 transition-all group">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform"><Icons.Feedback /></div>
                            <span className="text-xs font-bold text-gray-700">Feedback</span>
                        </button>
                        <button onClick={() => { setShowCommandHub(false); setActiveView('scholarship'); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all group">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><Icons.Scholarship /></div>
                            <span className="text-xs font-bold text-gray-700">Scholarships</span>
                        </button>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                        <button onClick={() => { setShowCommandHub(false); setActiveView('profile'); }} className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                            <Icons.Profile /> View My Profile
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
);

export default StudentEventsView;
