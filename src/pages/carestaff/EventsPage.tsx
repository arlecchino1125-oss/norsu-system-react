import React, { useState, useEffect } from 'react';
import {
    Plus, Calendar, Clock, MapPin, Users, Star, XCircle, Download, CheckCircle, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/dashboardUtils';
import { useEventsData } from '../../hooks/useEventsData';
import { SystemEvent } from '../../types/models';
import type { CareStaffDashboardFunctions } from './types';

interface EventsPageProps {
    functions?: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

const EventsPage = ({ functions }: EventsPageProps) => {
    const { showToast } = functions || {};

    // Filter States
    const [eventFilter, setEventFilter] = useState('All Items');

    // Data States from Custom Hook
    const { events, loading, refetchEvents: fetchEvents } = useEventsData();

    // UI/Modal States
    const [showEventModal, setShowEventModal] = useState(false);
    const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
    const [showAttendeesModal, setShowAttendeesModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    // Target Item States
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    const [newEvent, setNewEvent] = useState<Partial<SystemEvent>>({
        title: '', description: '', event_date: '', event_time: '',
        end_time: '', location: '', latitude: '', longitude: '', type: 'Event'
    });

    // Associated Data States (Attendees, Feedback)
    const [attendees, setAttendees] = useState<any[]>([]);
    const [feedbackList, setFeedbackList] = useState<any[]>([]);
    const [selectedEventTitle, setSelectedEventTitle] = useState<string>('');

    // Attendee Filters
    const [attendeeFilter, setAttendeeFilter] = useState('All');
    const [yearLevelFilter, setYearLevelFilter] = useState('All');
    const [attendeeCourseFilter, setAttendeeCourseFilter] = useState('All');
    const [attendeeSectionFilter, setAttendeeSectionFilter] = useState('All');

    // Handlers
    const createEvent = async (e: any) => {
        e.preventDefault();
        try {
            const payload = {
                title: newEvent.title,
                type: newEvent.type,
                description: newEvent.description,
                location: newEvent.type === 'Event' ? newEvent.location : 'Online/General',
                event_date: newEvent.event_date,
                event_time: newEvent.type === 'Event' ? (newEvent.event_time || null) : null,
                end_time: newEvent.type === 'Event' ? (newEvent.end_time || null) : null,
                latitude: newEvent.latitude || null,
                longitude: newEvent.longitude || null
            };

            if (editingEventId) {
                await supabase.from('events').update(payload).eq('id', editingEventId);
                if (showToast) showToast('Item updated successfully!');
            } else {
                await supabase.from('events').insert([payload]);
                if (showToast) showToast('Item created successfully!');
            }
            setShowEventModal(false);
            setEditingEventId(null);
            setNewEvent({ title: '', description: '', event_date: '', event_time: '', end_time: '', location: '', latitude: '', longitude: '', type: 'Event' });
            fetchEvents();
        } catch (err: any) {
            if (showToast) showToast(err.message, 'error');
        }
    };

    const handleEditEvent = (item: SystemEvent) => {
        setNewEvent({
            title: item.title,
            type: item.type,
            description: item.description,
            location: item.location || '',
            event_date: item.event_date || '',
            event_time: item.event_time || '',
            end_time: item.end_time || '',
            latitude: item.latitude || '',
            longitude: item.longitude || ''
        });
        setEditingEventId(item.id || null);
        setShowEventModal(true);
    };

    const handleDeleteEvent = async (id: string) => {
        setEventToDelete(id);
        setShowDeleteEventModal(true);
    };

    const confirmDeleteEvent = async () => {
        if (!eventToDelete) return;
        try {
            await supabase.from('events').delete().eq('id', eventToDelete);
            if (showToast) showToast('Item deleted.');
            setShowDeleteEventModal(false);
            setEventToDelete(null);
            fetchEvents();
        } catch (err: any) {
            if (showToast) showToast(err.message, 'error');
            setShowDeleteEventModal(false);
            setEventToDelete(null);
        }
    };

    const handleViewAttendees = async (item: SystemEvent) => {
        setSelectedEventTitle(item.title);
        try {
            const { data, error } = await supabase.from('event_attendance').select('*').eq('event_id', item.id).order('time_in', { ascending: false });
            if (error) throw error;

            // Enrich with year_level, section, course, department from students table
            let enriched = data || [];
            if (enriched.length > 0) {
                const studentIds = [...new Set(enriched.map((a: any) => a.student_id).filter(Boolean))];
                if (studentIds.length > 0) {
                    const { data: studs } = await supabase.from('students').select('student_id, year_level, section, course, department').in('student_id', studentIds);
                    const stuMap: any = {};
                    (studs || []).forEach((s: any) => { stuMap[s.student_id] = s; });
                    enriched = enriched.map((a: any) => ({
                        ...a,
                        year_level: stuMap[a.student_id]?.year_level || '',
                        section: stuMap[a.student_id]?.section || '',
                        course: a.course || stuMap[a.student_id]?.course || '',
                        department: stuMap[a.student_id]?.department || ''
                    }));
                }
            }
            setAttendees(enriched);
            setShowAttendeesModal(true);
            setYearLevelFilter('All');
            setAttendeeCourseFilter('All');
            setAttendeeSectionFilter('All');
        } catch (err: any) {
            if (showToast) showToast(err.message, 'error');
        }
    };

    const handleViewFeedback = async (item: SystemEvent) => {
        setSelectedEventTitle(item.title);
        try {
            const { data, error } = await supabase.from('event_feedback').select('*').eq('event_id', item.id).order('submitted_at', { ascending: false });
            if (error) throw error;
            setFeedbackList(data || []);
            setShowFeedbackModal(true);
        } catch (err: any) {
            if (showToast) showToast(err.message, 'error');
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            if (showToast) showToast("Geolocation is not supported.", 'error');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewEvent((prev: any) => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                if (showToast) showToast("Location retrieved!");
            },
            (err) => {
                if (showToast) showToast("Unable to retrieve location: " + err.message, 'error');
            }
        );
    };

    return (
        <>
            <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Events & Announcements</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage campus activities and broadcast official notices.</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingEventId(null);
                            setNewEvent({ title: '', description: '', event_date: '', event_time: '', end_time: '', location: '', latitude: '', longitude: '', type: 'Event' });
                            setShowEventModal(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-purple-200 hover:scale-[1.02] transition-all duration-300">
                        <Plus size={14} /> Create New
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        {['All Items', 'Events', 'Announcements'].map(tab => (
                            <button key={tab} onClick={() => setEventFilter(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${eventFilter === tab ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-700'}`}>{tab}</button>
                        ))}
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-md border border-gray-200">Total: {events.length}</span>
                </div>

                <div className="space-y-4">
                    {events
                        .filter(i => eventFilter === 'All Items' || (eventFilter === 'Events' && i.type === 'Event') || (eventFilter === 'Announcements' && i.type === 'Announcement'))
                        .map(item => (
                            <div key={item.id} className="card-hover bg-white/80 backdrop-blur-sm border border-gray-100/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.type === 'Event' ? 'bg-blue-100 text-blue-700' : item.type === 'Priority' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>{item.type}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                                        {item.location && <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>}
                                        {item.event_date && <span className="flex items-center gap-1"><Calendar size={12} />{item.event_date}</span>}
                                        {item.event_time && <span className="flex items-center gap-1"><Clock size={12} />{item.event_time}</span>}
                                        {item.end_time && <span className="text-gray-400 text-[10px] ml-1">- {item.end_time}</span>}
                                        {item.type === 'Event' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.attendees || 0} Attendees</span>}
                                        {item.type === 'Event' && item.avgRating && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Star size={12} />{item.avgRating} <span className="font-normal opacity-75">({item.feedbackCount})</span></span>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {item.type === 'Event' && (
                                        <>
                                            <button onClick={() => item.id && handleViewFeedback(item)} className="p-2 border rounded text-xs flex items-center gap-1 hover:bg-gray-50 flex-1 justify-center"><Star size={14} className="text-yellow-500" /> Reviews ({item.feedbackCount || 0})</button>
                                            <button onClick={() => item.id && handleViewAttendees(item)} className="p-2 border rounded text-xs flex items-center gap-1 hover:bg-gray-50 flex-1 justify-center"><Users size={14} className="text-blue-500" /> Attendees ({item.attendees || 0})</button>
                                        </>
                                    )}
                                    <button onClick={() => handleEditEvent(item)} className="p-2 border rounded text-xs text-blue-600 hover:bg-blue-50"><CheckCircle size={14} /></button>
                                    <button onClick={() => item.id && handleDeleteEvent(item.id)} className="p-2 border rounded text-xs text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    {events.length === 0 && <div className="text-center py-8 text-gray-400">No events or announcements found.</div>}
                </div>
            </div>

            {/* Event Modal - Enhanced for Create/Edit */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-purple-50/30 flex justify-between items-center">
                            <h3 className="font-bold text-lg gradient-text">{editingEventId ? 'Edit Item' : 'Create New Item'}</h3>
                            <button onClick={() => { setShowEventModal(false); setEditingEventId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={createEvent} className="space-y-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                                    <select className="w-full border rounded-lg p-2 text-sm" value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value as SystemEvent['type'] })}>
                                        <option value="Event">Event</option>
                                        <option value="Announcement">Announcement</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Title</label><input required className="w-full border rounded-lg p-2 text-sm" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="e.g., Campus Fair 2026" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Description</label><textarea required className="w-full border rounded-lg p-2 text-sm" rows={3} value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Details..." /></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Date</label><input type="date" required className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_date} onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })} /></div>
                                    {newEvent.type === 'Event' && (
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label><input type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_time} onChange={e => setNewEvent({ ...newEvent, event_time: e.target.value })} /></div>
                                    )}
                                </div>

                                {newEvent.type === 'Event' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">End Time</label><input type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.end_time} onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })} /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Location</label><input className="w-full border rounded-lg p-2 text-sm" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="e.g., Main Gym" /></div>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-bold text-blue-700">Geolocation</label>
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={getCurrentLocation} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><MapPin size={12} /> Get My Location</button>
                                                    <button type="button" onClick={() => setNewEvent({ ...newEvent, latitude: '9.306', longitude: '123.306' })} className="text-xs text-gray-500 hover:underline flex items-center gap-1"><MapPin size={12} /> Reset to Campus</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input type="number" step="any" placeholder="Lat" className="w-full border rounded-lg p-2 text-xs" value={newEvent.latitude} onChange={e => setNewEvent({ ...newEvent, latitude: e.target.value })} />
                                                <input type="number" step="any" placeholder="Long" className="w-full border rounded-lg p-2 text-xs" value={newEvent.longitude} onChange={e => setNewEvent({ ...newEvent, longitude: e.target.value })} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => { setShowEventModal(false); setEditingEventId(null); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md">{editingEventId ? 'Update' : 'Create'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendees Modal */}
            {showAttendeesModal && (() => {
                const depts = [...new Set(attendees.map((a: any) => a.department).filter(Boolean))].sort() as string[];
                const yearLevels = [...new Set(attendees.map((a: any) => a.year_level).filter(Boolean))].sort() as string[];
                const courses = [...new Set(attendees.map((a: any) => a.course).filter(Boolean))].sort() as string[];
                const sections = [...new Set(attendees.map((a: any) => a.section).filter(Boolean))].sort() as string[];
                let filtered = attendeeFilter === 'All' ? attendees : attendees.filter(a => a.department === attendeeFilter);
                if (attendeeCourseFilter !== 'All') filtered = filtered.filter(a => a.course === attendeeCourseFilter);
                if (yearLevelFilter !== 'All') filtered = filtered.filter(a => a.year_level === yearLevelFilter);
                if (attendeeSectionFilter !== 'All') filtered = filtered.filter(a => a.section === attendeeSectionFilter);
                const completedCount = attendees.filter(a => a.time_out).length;
                return (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b bg-gray-50 rounded-t-2xl">
                                <div className="flex justify-between items-center mb-3">
                                    <div><h3 className="font-bold text-lg">Attendees List</h3><p className="text-xs text-gray-500">{selectedEventTitle}</p></div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => {
                                            if (filtered.length === 0) return;
                                            const headers = ['Student Name', 'Department', 'Course', 'Year Level', 'Section', 'Time In', 'Time Out', 'Status'];
                                            const rows = filtered.map(a => [a.student_name, a.department || '', a.course || '', a.year_level || '', a.section || '', new Date(a.time_in).toLocaleString(), a.time_out ? new Date(a.time_out).toLocaleString() : '-', a.time_out ? 'Completed' : 'Still In']);
                                            exportToExcel(headers, rows, `${selectedEventTitle || 'event'}_attendees`);
                                        }} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50">
                                            <Download size={14} /> Export Excel
                                        </button>
                                        <button onClick={() => { setShowAttendeesModal(false); setAttendeeFilter('All'); setYearLevelFilter('All'); setAttendeeCourseFilter('All'); setAttendeeSectionFilter('All'); }}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs mb-3">
                                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">{attendees.length} Total</span>
                                    <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold">{completedCount} Completed</span>
                                    <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-bold">{attendees.length - completedCount} Still In</span>
                                </div>
                                {depts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Dept:</span>
                                        <button onClick={() => setAttendeeFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeFilter === 'All' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All ({attendees.length})</button>
                                        {depts.map(dept => {
                                            const count = attendees.filter(a => a.department === dept).length;
                                            return <button key={dept} onClick={() => setAttendeeFilter(dept)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeFilter === dept ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{dept} ({count})</button>;
                                        })}
                                    </div>
                                )}
                                {yearLevels.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Year:</span>
                                        <button onClick={() => setYearLevelFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                        {yearLevels.map(yl => {
                                            const count = attendees.filter(a => a.year_level === yl).length;
                                            return <button key={yl} onClick={() => setYearLevelFilter(yl)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === yl ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{yl} ({count})</button>;
                                        })}
                                    </div>
                                )}
                                {courses.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Course:</span>
                                        <button onClick={() => setAttendeeCourseFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeCourseFilter === 'All' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                        {courses.map(c => {
                                            const count = attendees.filter(a => a.course === c).length;
                                            return <button key={c} onClick={() => setAttendeeCourseFilter(c)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeCourseFilter === c ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{c} ({count})</button>;
                                        })}
                                    </div>
                                )}
                                {sections.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Section:</span>
                                        <button onClick={() => setAttendeeSectionFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeSectionFilter === 'All' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                        {sections.map(s => {
                                            const count = attendees.filter(a => a.section === s).length;
                                            return <button key={s} onClick={() => setAttendeeSectionFilter(s)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeSectionFilter === s ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>Sec {s} ({count})</button>;
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="p-0 overflow-y-auto flex-1">
                                {filtered.length === 0 ? <p className="text-center py-8 text-gray-500">No attendees yet.</p> : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0"><tr><th className="px-6 py-3">Student</th><th className="px-6 py-3">Course</th><th className="px-6 py-3">Year / Sec</th><th className="px-6 py-3">Time In</th><th className="px-6 py-3">Time Out</th><th className="px-6 py-3">Location</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filtered.map((att, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-6 py-3"><p className="font-bold text-gray-900">{att.student_name}</p><p className="text-xs text-gray-500">{att.department}</p></td>
                                                    <td className="px-6 py-3 text-gray-600 text-xs font-medium">{att.course || '-'}</td>
                                                    <td className="px-6 py-3 text-gray-600 text-xs font-medium">{att.year_level || '-'}{att.section ? ` — ${att.section}` : ''}</td>
                                                    <td className="px-6 py-3 text-gray-600">{new Date(att.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-6 py-3">{att.time_out ? <span className="text-green-600 font-medium">{new Date(att.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : <span className="text-yellow-600 text-xs font-bold">Still In</span>}</td>
                                                    <td className="px-6 py-3 text-xs">
                                                        {att.latitude ? <a href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1"><MapPin size={12} />Map</a> : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div><h3 className="font-bold text-lg">Event Feedback</h3><p className="text-xs text-gray-500">{selectedEventTitle}</p></div>
                            <button onClick={() => setShowFeedbackModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {feedbackList.length === 0 ? <p className="text-center text-gray-500">No feedback submitted yet.</p> : feedbackList.map((fb, i) => {
                                const criteriaScores = [fb.q1_score, fb.q2_score, fb.q3_score, fb.q4_score, fb.q5_score, fb.q6_score, fb.q7_score]
                                    .map((value) => Number(value))
                                    .filter((score) => Number.isFinite(score) && score >= 1 && score <= 5);
                                const numericRating = Number(fb.rating);
                                const displayRating = Number.isFinite(numericRating) && numericRating > 0
                                    ? numericRating
                                    : (criteriaScores.length > 0 ? Number((criteriaScores.reduce((sum, score) => sum + score, 0) / criteriaScores.length).toFixed(1)) : 0);
                                const roundedRating = Math.round(displayRating);
                                const mainComment = fb.open_comments || fb.feedback || fb.comments || '';
                                return (
                                    <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-1 text-yellow-500 mb-2">
                                            {[1, 2, 3, 4, 5].map((idx) => (
                                                <Star key={idx} size={14} fill={idx <= roundedRating ? 'currentColor' : 'none'} className={idx <= roundedRating ? 'text-yellow-500' : 'text-gray-300'} />
                                            ))}
                                            <span className="text-xs font-bold text-gray-600 ml-2">{displayRating ? `${displayRating}/5` : 'No rating'}</span>
                                        </div>
                                        {mainComment ? <p className="text-sm text-gray-700 italic mb-2">"{mainComment}"</p> : <p className="text-xs text-gray-400 mb-2">No comment provided.</p>}
                                        {fb.open_best && <p className="text-xs text-gray-600"><span className="font-bold text-gray-700">Liked best:</span> {fb.open_best}</p>}
                                        {fb.open_suggestions && <p className="text-xs text-gray-600 mt-1"><span className="font-bold text-gray-700">Suggestion:</span> {fb.open_suggestions}</p>}
                                        <p className="text-xs text-gray-400 mt-2 text-right">{new Date(fb.submitted_at || fb.created_at || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteEventModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center animate-scale-in">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Item</h3>
                        <p className="text-gray-500 mb-6">Are you sure you want to delete this event/announcement? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteEventModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition">Cancel</button>
                            <button onClick={confirmDeleteEvent} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-md">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EventsPage;
