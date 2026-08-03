import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';
import {
    Plus, Calendar, Clock, MapPin, Users, UserX, Star, XCircle, Download, CheckCircle, Archive, RefreshCw, ClipboardList, ChevronLeft, ChevronRight
} from 'lucide-react';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { supabase } from '../../../../../lib/supabase';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { formatDate } from '../../../../../utils/formatters';
import { Button } from '../../../../../components/ui/Button';
import Modal from '../../../../../components/ui/Modal';
import { Card, CardContent, CardHeader } from '../../../../../components/ui/Card';
import { AttendanceProofButton } from '../../../../../components/AttendanceProofButton';
import { useEventsData } from '../../../../../hooks/useEventsData';
import { SystemEvent } from '../../../../../types/models';
import { getCoursesWithDepartments, getDepartments } from '../../../../../services/careStaffService';
import {
    EVENT_ACTIVITY_TYPES,
    SECTION_OPTIONS,
    YEAR_LEVEL_OPTIONS,
    applyEventAudienceQuery,
    cleanAudienceValues,
    getAudienceValues,
    getAudienceLabel,
    getEventAudienceType,
    isAttendanceActivityType
} from '../../../../../utils/eventAudience';
import type { CareStaffDashboardFunctions } from '../../../types';
import EventEvaluationBuilderModal from './EventEvaluationBuilderModal';
import EventEvaluationResultsModal from './EventEvaluationResultsModal';
import EventEvaluationTemplatesModal from './EventEvaluationTemplatesModal';
import { getEvaluationsForEvents, type EvaluationForm } from '../eventEvaluationService';
import { useCareStaffEvents, createEmptyEvent, suggestCloseDate, getEventTypeBadgeClass, getArchivedEventTypeBadgeClass, isVisibleForStaffFilter, getAudienceModeLabel, getAudienceBulletItems, isRegistrationEvent, formatRegistrationDeadline, getRegistrationStatusClass } from '../hooks/useCareStaffEvents';
import type { CareStaffEventsPageProps } from '../hooks/useCareStaffEvents';

const REGISTRANT_STATUS_OPTIONS = ['All', 'Registered', 'Attended', 'Absent', 'Cancelled'];
const ITEMS_PER_PAGE = 20;

const ListPager = ({ page, totalPages, totalItems, onPageChange, itemLabel = 'students' }: { page: number; totalPages: number; totalItems: number; onPageChange: (page: number) => void; itemLabel?: string }) => (
    totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-4 py-2 text-xs text-gray-500">
            <span>{totalItems} {itemLabel} · Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"><ChevronLeft size={14} /></button>
                <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"><ChevronRight size={14} /></button>
            </div>
        </div>
    ) : null
);
const getStudentName = (student: any) => [student.first_name, student.middle_name, student.last_name, student.suffix]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');

const EventFormModal = ({
    newEvent, setNewEvent, editingEventId, setEditingEventId, createEvent, departmentOptions, courseOptions, getCurrentLocation, setShowEventModal, renderAudienceCheckboxGroup
}: any) => (
    <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50/30">
                <h3 className="font-bold text-lg gradient-text">{editingEventId ? 'Edit Item' : 'Create New Item'}</h3>
                <Button variant="ghost" size="sm" aria-label="Close event form" onClick={() => { setShowEventModal(false); setEditingEventId(null); }}><XCircle className="text-gray-400 hover:text-gray-600" /></Button>
            </CardHeader>
            <CardContent className="overflow-y-auto sm:p-8">
                <form onSubmit={createEvent} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <div><label htmlFor="event-category" className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                            <select
                                id="event-category"
                                className="w-full border rounded-lg p-2 text-sm"
                                value={newEvent.type}
                                onChange={e => {
                                    const nextType = e.target.value as SystemEvent['type'];
                                    const nextIsActivity = isAttendanceActivityType(nextType);
                                    setNewEvent({
                                        ...newEvent,
                                        type: nextType,
                                        participation_mode: nextIsActivity ? (newEvent.participation_mode || 'general_attendance') : 'general_attendance',
                                        audience_type: nextIsActivity ? (newEvent.audience_type || 'all_students') : 'all_students',
                                        attendance_required: nextIsActivity ? Boolean(newEvent.attendance_required) : false,
                                        capacity: nextIsActivity ? (newEvent.capacity || null) : null,
                                        registration_deadline: nextIsActivity ? (newEvent.registration_deadline || '') : ''
                                    });
                                }}
                            >
                                {EVENT_ACTIVITY_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="lg:col-span-2"><label htmlFor="event-title" className="block text-xs font-bold text-gray-500 mb-1">Title</label><input id="event-title" required className="w-full border rounded-lg p-2 text-sm" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="e.g., Campus Fair 2026" /></div>
                    </div>
                    <div><label htmlFor="event-description" className="block text-xs font-bold text-gray-500 mb-1">Description</label><textarea id="event-description" required className="w-full resize-y rounded-xl border border-gray-200 bg-slate-50/60 p-4 text-sm leading-6 text-gray-700 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100" rows={5} value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Details..." /></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div><label htmlFor="event-date" className="block text-xs font-bold text-gray-500 mb-1">Date</label><input id="event-date" type="date" required className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_date} onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })} /></div>
                        {isAttendanceActivityType(newEvent.type) && (
                            <div><label htmlFor="event-start-time" className="block text-xs font-bold text-gray-500 mb-1">Start Time</label><input id="event-start-time" type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_time} onChange={e => setNewEvent({ ...newEvent, event_time: e.target.value })} /></div>
                        )}
                    </div>

                    {isAttendanceActivityType(newEvent.type) && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label htmlFor="event-end-time" className="block text-xs font-bold text-gray-500 mb-1">End Time</label><input id="event-end-time" type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.end_time} onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })} /></div>
                                <div><label htmlFor="event-location" className="block text-xs font-bold text-gray-500 mb-1">Location</label><input id="event-location" className="w-full border rounded-lg p-2 text-sm" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="e.g., Main Gym" /></div>
                            </div>

                            <div>
                                <label htmlFor="event-attendance-closes" className="block text-xs font-bold text-gray-500 mb-1">Attendance closes</label>
                                <input
                                    id="event-attendance-closes"
                                    type="datetime-local"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={newEvent.attendance_closes_at}
                                    onChange={e => setNewEvent({ ...newEvent, attendance_closes_at: e.target.value })}
                                    placeholder={suggestCloseDate(newEvent.event_date, newEvent.end_time)}
                                />
                                <p className="mt-1 text-[11px] text-gray-400">
                                    Time in, time out, rating and the evaluation form all stay open until this date, then the card archives.
                                    Leave blank for 3 days after the event ends{suggestCloseDate(newEvent.event_date, newEvent.end_time) ? ` (${suggestCloseDate(newEvent.event_date, newEvent.end_time).replace('T', ' ')})` : ''}.
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                    <div>
                                        <label htmlFor="event-mode" className="block text-xs font-bold text-gray-500 mb-1">Mode</label>
                                        <select
                                            id="event-mode"
                                            className="w-full border rounded-lg p-2 text-sm bg-white"
                                            value={newEvent.participation_mode || 'general_attendance'}
                                            onChange={e => {
                                                const nextMode = e.target.value as SystemEvent['participation_mode'];
                                                setNewEvent({
                                                    ...newEvent,
                                                    participation_mode: nextMode,
                                                    attendance_required: nextMode === 'registration_required' ? true : Boolean(newEvent.attendance_required),
                                                    allow_walk_ins: nextMode === 'registration_required' ? Boolean(newEvent.allow_walk_ins) : true
                                                });
                                            }}
                                        >
                                            <option value="general_attendance">General attendance</option>
                                            <option value="registration_required">Student registration</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="event-audience" className="block text-xs font-bold text-gray-500 mb-1">Audience</label>
                                        <select
                                            id="event-audience"
                                            className="w-full border rounded-lg p-2 text-sm bg-white"
                                            value={newEvent.audience_type || 'all_students'}
                                            onChange={e => setNewEvent({
                                                ...newEvent,
                                                audience_type: e.target.value as SystemEvent['audience_type']
                                            })}
                                        >
                                            <option value="all_students">All students</option>
                                            <option value="filtered_students">Selected students</option>
                                            <option value="graduating_students">Graduating students</option>
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs font-bold text-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(newEvent.attendance_required)}
                                            onChange={e => setNewEvent({ ...newEvent, attendance_required: e.target.checked })}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        Required attendance
                                    </label>
                                </div>

                                {isRegistrationEvent(newEvent) && (
                                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 lg:grid-cols-3">
                                        <div>
                                            <label htmlFor="event-capacity" className="block text-xs font-bold text-emerald-700 mb-1">Capacity</label>
                                            <input
                                                id="event-capacity"
                                                type="number"
                                                min="1"
                                                className="w-full border rounded-lg p-2 text-sm bg-white"
                                                value={newEvent.capacity ?? ''}
                                                onChange={e => {
                                                    const nextValue = e.target.value;
                                                    setNewEvent({ ...newEvent, capacity: nextValue ? Number(nextValue) : null });
                                                }}
                                                placeholder="Unlimited"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="event-registration-deadline" className="block text-xs font-bold text-emerald-700 mb-1">Registration Deadline</label>
                                            <input
                                                id="event-registration-deadline"
                                                type="datetime-local"
                                                className="w-full border rounded-lg p-2 text-sm bg-white"
                                                value={newEvent.registration_deadline || ''}
                                                onChange={e => setNewEvent({ ...newEvent, registration_deadline: e.target.value })}
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white p-3 text-xs font-bold text-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(newEvent.allow_walk_ins)}
                                                onChange={e => setNewEvent({ ...newEvent, allow_walk_ins: e.target.checked })}
                                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            Allow walk-ins during event
                                        </label>
                                    </div>
                                )}

                                {newEvent.audience_type !== 'all_students' && (
                                    <div className="space-y-3">
                                        {renderAudienceCheckboxGroup('Departments', 'audience_departments', departmentOptions)}
                                        {renderAudienceCheckboxGroup('Courses', 'audience_courses', courseOptions)}
                                        {renderAudienceCheckboxGroup('Year Levels', 'audience_year_levels', YEAR_LEVEL_OPTIONS)}
                                        {renderAudienceCheckboxGroup('Sections', 'audience_sections', SECTION_OPTIONS, value => `Section ${value}`)}
                                    </div>
                                )}
                            </div>

                            <details className="rounded-xl border border-slate-200 bg-slate-50">
                                <summary className="cursor-pointer select-none px-4 py-3 text-xs font-bold text-gray-500">Advanced</summary>
                                <div className="space-y-3 border-t border-slate-200 p-4">
                                    <p className="text-[11px] text-gray-400">
                                        Proof-of-presence checks. Both apply only while the event is running &mdash; a student timing in after it ends is never asked for either.
                                    </p>
                                    <label htmlFor="event-require-photo" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs font-bold text-gray-600">
                                        <input
                                            id="event-require-photo"
                                            type="checkbox"
                                            checked={Boolean(newEvent.require_photo)}
                                            onChange={e => setNewEvent({ ...newEvent, require_photo: e.target.checked })}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        Require photo on time in
                                    </label>
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <label htmlFor="event-require-geolocation" className="flex items-center gap-2 text-xs font-bold text-blue-700">
                                                <input
                                                    id="event-require-geolocation"
                                                    type="checkbox"
                                                    checked={Boolean(newEvent.require_geolocation)}
                                                    onChange={e => setNewEvent({ ...newEvent, require_geolocation: e.target.checked })}
                                                    className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                Require geolocation (200m of venue)
                                            </label>
                                            <div className="flex gap-3">
                                                <button type="button" onClick={getCurrentLocation} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><MapPin size={12} /> Get My Location</button>
                                                <button type="button" onClick={() => setNewEvent({ ...newEvent, latitude: '9.306', longitude: '123.306' })} className="text-xs text-gray-500 hover:underline flex items-center gap-1"><MapPin size={12} /> Reset to Campus</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="number" step="any" aria-label="Latitude" placeholder="Lat" className="w-full border rounded-lg p-2 text-xs" value={newEvent.latitude} onChange={e => setNewEvent({ ...newEvent, latitude: e.target.value })} />
                                            <input type="number" step="any" aria-label="Longitude" placeholder="Long" className="w-full border rounded-lg p-2 text-xs" value={newEvent.longitude} onChange={e => setNewEvent({ ...newEvent, longitude: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </details>
                        </>
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowEventModal(false); setEditingEventId(null); }}>Cancel</Button>
                        <Button type="submit" variant="primary" className="flex-1">{editingEventId ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
);

const AttendeesModal = ({
    showToast, isLoading, attendees, expectedStudents, selectedAttendanceEvent, attendeeFilter, setAttendeeFilter, yearLevelFilter, setYearLevelFilter, attendeeCourseFilter, setAttendeeCourseFilter, attendeeSectionFilter, setAttendeeSectionFilter, setShowAttendeesModal, selectedEventTitle, setExpectedStudents, setSelectedAttendanceEvent
}: any) => {
    const [attendeeSearch, setAttendeeSearch] = useState('');
    const [page, setPage] = useState(1);
    const depts = [...new Set(attendees.flatMap((a: any) => a.department ? [a.department] : []))].sort() as string[];
    const yearLevels = [...new Set(attendees.flatMap((a: any) => a.year_level ? [a.year_level] : []))].sort() as string[];
    const courses = [...new Set(attendees.flatMap((a: any) => a.course ? [a.course] : []))].sort() as string[];
    const sections = [...new Set(attendees.flatMap((a: any) => a.section ? [a.section] : []))].sort() as string[];
    let filtered = attendeeFilter === 'All' ? attendees : attendees.filter(a => a.department === attendeeFilter);
    if (attendeeCourseFilter !== 'All') filtered = filtered.filter(a => a.course === attendeeCourseFilter);
    if (yearLevelFilter !== 'All') filtered = filtered.filter(a => a.year_level === yearLevelFilter);
    if (attendeeSectionFilter !== 'All') filtered = filtered.filter(a => a.section === attendeeSectionFilter);
    const attendeeQuery = attendeeSearch.trim().toLowerCase();
    if (attendeeQuery) filtered = filtered.filter(a => String(a.student_name || '').toLowerCase().includes(attendeeQuery));
    const completedCount = attendees.filter(a => a.time_out).length;
    const attendeeByStudentId = new Map<string, any>(attendees.map((att: any) => [String(att.student_id || ''), att]));
    const absentStudents = expectedStudents.filter((student: any) => !attendeeByStudentId.has(String(student.student_id || '')));
    const attendanceRate = expectedStudents.length > 0
        ? Math.round((attendees.length / expectedStudents.length) * 100)
        : null;
    const resetFilters = () => { setAttendeeFilter('All'); setYearLevelFilter('All'); setAttendeeCourseFilter('All'); setAttendeeSectionFilter('All'); setAttendeeSearch(''); setPage(1); };
    const hasActiveFilters = attendeeFilter !== 'All' || yearLevelFilter !== 'All' || attendeeCourseFilter !== 'All' || attendeeSectionFilter !== 'All' || Boolean(attendeeQuery);
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
    const selectClass = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200';
    return createPortal((
        // Anchored to the content region (#staff-content-region) so it fills only the
        // page area — right of the sidebar, below the header — and follows the sidebar
        // when it collapses. z stays below the sidebar (z-30) so its toggle stays usable.
        <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-black/30 p-2 backdrop-blur-sm sm:p-3">
            <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-4 sm:px-6">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900">Attendees List</h3>
                        <p className="truncate text-xs text-gray-500">
                            {selectedEventTitle}
                            {selectedAttendanceEvent ? ` · Audience: ${getAudienceLabel(selectedAttendanceEvent)}` : ''}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => {
                            if (filtered.length === 0 && expectedStudents.length === 0) return;
                            const headers = ['Student Name', 'Department', 'Course', 'Year Level', 'Section', 'Time In', 'Time Out', 'Status'];
                            // When filters are active export only what's visible; otherwise use the
                            // full expected-students roster (includes absent rows).
                            const rows = !hasActiveFilters && expectedStudents.length > 0
                                ? expectedStudents.map((student: any) => {
                                    const attendance = attendeeByStudentId.get(String(student.student_id || ''));
                                    return [
                                        attendance?.student_name || getStudentName(student),
                                        student.department || attendance?.department || '',
                                        student.course || attendance?.course || '',
                                        student.year_level || attendance?.year_level || '',
                                        student.section || attendance?.section || '',
                                        attendance?.time_in ? new Date(attendance.time_in).toLocaleString() : '-',
                                        attendance?.time_out ? new Date(attendance.time_out).toLocaleString() : '-',
                                        attendance ? (attendance.time_out ? 'Completed' : 'Still In') : (selectedAttendanceEvent?.attendance_required ? 'Absent' : 'Not attended')
                                    ];
                                })
                                : filtered.map(a => [a.student_name, a.department || '', a.course || '', a.year_level || '', a.section || '', new Date(a.time_in).toLocaleString(), a.time_out ? new Date(a.time_out).toLocaleString() : '-', a.time_out ? 'Completed' : 'Still In']);
                            exportToExcel(headers, rows, `${selectedEventTitle || 'event'}_attendees`);
                        }} disabled={filtered.length === 0 && expectedStudents.length === 0} leftIcon={<Download size={14} />}>
                            Export {hasActiveFilters ? `${filtered.length} filtered` : 'Excel'}
                        </Button>
                        <button type="button" aria-label="Close attendees" onClick={() => { setShowAttendeesModal(false); resetFilters(); setExpectedStudents([]); setSelectedAttendanceEvent(null); }}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                    </div>
                </div>

                {isLoading ? (
                    <div role="status" aria-label="Loading attendees" className="flex flex-1 flex-col animate-pulse">
                        <div aria-hidden="true" className="space-y-3 border-b border-gray-100 bg-gray-50/70 p-4 sm:px-6">
                            <div className="flex gap-2">
                                <div className="h-6 w-16 rounded-full bg-slate-200" />
                                <div className="h-6 w-24 rounded-full bg-slate-200" />
                                <div className="h-6 w-20 rounded-full bg-slate-200" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-9 rounded-lg bg-slate-200" />)}
                            </div>
                        </div>
                        <div aria-hidden="true" className="flex-1">
                            <div className="grid grid-cols-7 gap-4 bg-green-50 px-4 py-3">
                                {Array.from({ length: 7 }, (_, index) => <div key={index} className="h-3 rounded bg-green-100" />)}
                            </div>
                            {Array.from({ length: 8 }, (_, row) => (
                                <div key={row} className="grid grid-cols-7 gap-4 border-b border-gray-100 px-4 py-3">
                                    {Array.from({ length: 7 }, (_, column) => <div key={column} className="h-3 rounded bg-slate-100" />)}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stats + filters */}
                        <div className="space-y-3 border-b border-gray-100 bg-gray-50/70 p-4 sm:px-6">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 font-bold text-blue-700">{attendees.length} Total</span>
                                <span className="rounded-full bg-green-100 px-2.5 py-1 font-bold text-green-700">{completedCount} Completed</span>
                                <span className="rounded-full bg-yellow-100 px-2.5 py-1 font-bold text-yellow-700">{attendees.length - completedCount} Still In</span>
                                {expectedStudents.length > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-700">{expectedStudents.length} Expected</span>}
                                {expectedStudents.length > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 font-bold text-red-700">{absentStudents.length} {selectedAttendanceEvent?.attendance_required ? 'Absent' : 'Not attended'}</span>}
                                {attendanceRate !== null && <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-bold text-indigo-700">{attendanceRate}% Attendance</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                <input
                                    value={attendeeSearch}
                                    onChange={(e) => { setAttendeeSearch(e.target.value); setPage(1); }}
                                    placeholder="Search name…"
                                    className="col-span-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200 sm:col-span-1"
                                />
                                {depts.length > 0 && (
                                    <select value={attendeeFilter} onChange={(e) => { setAttendeeFilter(e.target.value); setPage(1); }} className={selectClass}>
                                        <option value="All">All Depts ({attendees.length})</option>
                                        {depts.map((dept) => <option key={dept} value={dept}>{dept} ({attendees.filter(a => a.department === dept).length})</option>)}
                                    </select>
                                )}
                                {yearLevels.length > 0 && (
                                    <select value={yearLevelFilter} onChange={(e) => { setYearLevelFilter(e.target.value); setPage(1); }} className={selectClass}>
                                        <option value="All">All Years</option>
                                        {yearLevels.map((yl) => <option key={yl} value={yl}>{yl} ({attendees.filter(a => a.year_level === yl).length})</option>)}
                                    </select>
                                )}
                                {courses.length > 0 && (
                                    <select value={attendeeCourseFilter} onChange={(e) => { setAttendeeCourseFilter(e.target.value); setPage(1); }} className={selectClass}>
                                        <option value="All">All Courses</option>
                                        {courses.map((c) => <option key={c} value={c}>{c} ({attendees.filter(a => a.course === c).length})</option>)}
                                    </select>
                                )}
                                {sections.length > 0 && (
                                    <select value={attendeeSectionFilter} onChange={(e) => { setAttendeeSectionFilter(e.target.value); setPage(1); }} className={selectClass}>
                                        <option value="All">All Sections</option>
                                        {sections.map((s) => <option key={s} value={s}>Sec {s} ({attendees.filter(a => a.section === s).length})</option>)}
                                    </select>
                                )}
                            </div>
                            {hasActiveFilters && (
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>Showing {filtered.length} of {attendees.length}</span>
                                    <button type="button" onClick={resetFilters} className="font-bold text-purple-600 hover:text-purple-700">Clear filters</button>
                                </div>
                            )}
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            {filtered.length === 0 ? <p className="text-center py-8 text-gray-500">{hasActiveFilters ? 'No attendees match the filters.' : 'No attendees yet.'}</p> : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-green-50 text-green-700 sticky top-0"><tr><th className="px-4 py-2">Student</th><th className="px-4 py-2">Course</th><th className="px-4 py-2">Year / Sec</th><th className="px-4 py-2">Time In</th><th className="px-4 py-2">Time Out</th><th className="px-4 py-2">Location</th><th className="px-4 py-2">Proof</th></tr></thead>
                                    <tbody className="divide-y divide-green-50">
                                        {pageItems.map((att) => (
                                            <tr key={att.id} className="bg-green-50/20 hover:bg-green-50/60">
                                                <td className="px-4 py-2"><p className="font-bold text-gray-900">{att.student_name}</p><p className="text-[10px] text-gray-500">{att.department}</p></td>
                                                <td className="px-4 py-2 text-gray-600 font-medium">{att.course || '-'}</td>
                                                <td className="px-4 py-2 text-gray-600 font-medium">{att.year_level || '-'}{att.section ? ` — ${att.section}` : ''}</td>
                                                <td className="px-4 py-2 text-gray-600">{new Date(att.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="px-4 py-2">{att.time_out ? <span className="text-green-600 font-medium">{new Date(att.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : <span className="text-yellow-600 font-bold">Still In</span>}</td>
                                                <td className="px-4 py-2">
                                                    {att.latitude ? <a href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1"><MapPin size={12} />Map</a> : '-'}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <AttendanceProofButton
                                                        storedReference={att.proof_url}
                                                        attendanceId={Number(att.id)}
                                                        onError={(message) => showToast?.(message, 'error')}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <ListPager page={safePage} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
                    </>
                )}
            </div>
        </div>
    ), document.getElementById('staff-content-region') || document.body);
};

const AbsentModal = ({
    isLoading, attendees, expectedStudents, selectedAttendanceEvent, selectedEventTitle, setShowAbsentModal, setExpectedStudents, setSelectedAttendanceEvent
}: any) => {
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [page, setPage] = useState(1);
    const attendedIds = new Set(attendees.map((att: any) => String(att.student_id || '')));
    const absentStudents = expectedStudents.filter((student: any) => !attendedIds.has(String(student.student_id || '')));
    const depts = [...new Set(absentStudents.flatMap((s: any) => s.department ? [s.department] : []))].sort() as string[];
    const courses = [...new Set(absentStudents.flatMap((s: any) => s.course ? [s.course] : []))].sort() as string[];
    const years = [...new Set(absentStudents.flatMap((s: any) => s.year_level ? [s.year_level] : []))].sort() as string[];
    let filtered = deptFilter === 'All' ? absentStudents : absentStudents.filter((s: any) => s.department === deptFilter);
    if (courseFilter !== 'All') filtered = filtered.filter((s: any) => s.course === courseFilter);
    if (yearFilter !== 'All') filtered = filtered.filter((s: any) => s.year_level === yearFilter);
    const query = search.trim().toLowerCase();
    if (query) filtered = filtered.filter((s: any) => getStudentName(s).toLowerCase().includes(query));
    const attendanceRate = expectedStudents.length > 0 ? Math.round((attendees.length / expectedStudents.length) * 100) : null;
    const absentLabel = selectedAttendanceEvent?.attendance_required ? 'Absent' : 'Not attended';
    const resetFilters = () => { setSearch(''); setDeptFilter('All'); setCourseFilter('All'); setYearFilter('All'); setPage(1); };
    const hasActiveFilters = deptFilter !== 'All' || courseFilter !== 'All' || yearFilter !== 'All' || Boolean(query);
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
    const selectClass = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200';
    return createPortal((
        <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-black/30 p-2 backdrop-blur-sm sm:p-3">
            <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-4 sm:px-6">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900">{absentLabel === 'Absent' ? 'Absent Students' : 'Expected Students Not Yet Attended'}</h3>
                        <p className="truncate text-xs text-gray-500">
                            {selectedEventTitle}
                            {selectedAttendanceEvent ? ` · Audience: ${getAudienceLabel(selectedAttendanceEvent)}` : ''}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => {
                            const headers = ['Student Name', 'Student ID', 'Department', 'Course', 'Year Level'];
                            const rows = filtered.map((s: any) => [getStudentName(s), s.student_id || '', s.department || '', s.course || '', s.year_level || '']);
                            exportToExcel(headers, rows, `${selectedEventTitle || 'event'}_absent`);
                        }} disabled={filtered.length === 0} leftIcon={<Download size={14} />}>
                            Export Excel
                        </Button>
                        <button type="button" aria-label="Close absent list" onClick={() => { setShowAbsentModal(false); setExpectedStudents([]); setSelectedAttendanceEvent(null); }}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                    </div>
                </div>
                {isLoading ? (
                    <div role="status" aria-label="Loading absent students" className="flex flex-1 flex-col animate-pulse">
                        <div aria-hidden="true" className="space-y-3 border-b border-gray-100 bg-gray-50/70 p-4 sm:px-6">
                            <div className="flex gap-2">
                                <div className="h-6 w-20 rounded-full bg-slate-200" />
                                <div className="h-6 w-16 rounded-full bg-slate-200" />
                                <div className="h-6 w-20 rounded-full bg-slate-200" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-9 rounded-lg bg-slate-200" />)}
                            </div>
                        </div>
                        <div aria-hidden="true" className="flex-1">
                            <div className="grid grid-cols-3 gap-4 bg-red-50 px-4 py-3">
                                {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-3 rounded bg-red-100" />)}
                            </div>
                            {Array.from({ length: 8 }, (_, row) => (
                                <div key={row} className="grid grid-cols-3 gap-4 border-b border-gray-100 px-4 py-3">
                                    {Array.from({ length: 3 }, (_, column) => <div key={column} className="h-3 rounded bg-slate-100" />)}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 border-b border-gray-100 bg-gray-50/70 p-4 sm:px-6">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-700">{expectedStudents.length} Expected</span>
                                <span className="rounded-full bg-green-100 px-2.5 py-1 font-bold text-green-700">{attendees.length} Present</span>
                                <span className="rounded-full bg-red-100 px-2.5 py-1 font-bold text-red-700">{absentStudents.length} {absentLabel}</span>
                                {attendanceRate !== null && <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-bold text-indigo-700">{attendanceRate}% Attendance</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <input
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Search name…"
                                    className="col-span-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200 sm:col-span-1"
                                />
                                {depts.length > 0 && (
                                    <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} className={selectClass}>
                                        <option value="All">All Depts ({absentStudents.length})</option>
                                        {depts.map((dept) => <option key={dept} value={dept}>{dept} ({absentStudents.filter((s: any) => s.department === dept).length})</option>)}
                                    </select>
                                )}
                                {years.length > 0 && (
                                    <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1); }} className={selectClass}>
                                        <option value="All">All Years</option>
                                        {years.map((yl) => <option key={yl} value={yl}>{yl} ({absentStudents.filter((s: any) => s.year_level === yl).length})</option>)}
                                    </select>
                                )}
                                {courses.length > 0 && (
                                    <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }} className={selectClass}>
                                        <option value="All">All Courses</option>
                                        {courses.map((c) => <option key={c} value={c}>{c} ({absentStudents.filter((s: any) => s.course === c).length})</option>)}
                                    </select>
                                )}
                            </div>
                            {hasActiveFilters && (
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>Showing {filtered.length} of {absentStudents.length}</span>
                                    <button type="button" onClick={resetFilters} className="font-bold text-red-600 hover:text-red-700">Clear filters</button>
                                </div>
                            )}
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            {filtered.length === 0 ? <p className="text-center py-8 text-gray-500">{hasActiveFilters ? 'No absent students match the filters.' : `No ${absentLabel.toLowerCase()} students.`}</p> : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-red-50 text-red-700 sticky top-0"><tr><th className="px-4 py-2">Student</th><th className="px-4 py-2">Course</th><th className="px-4 py-2">Year</th></tr></thead>
                                    <tbody className="divide-y divide-red-50">
                                        {pageItems.map((student: any) => (
                                            <tr key={student.student_id} className="hover:bg-red-50/40">
                                                <td className="px-4 py-2"><p className="font-bold text-gray-800">{getStudentName(student)}</p><p className="text-[10px] text-gray-500">{student.student_id} | {student.department || '-'}</p></td>
                                                <td className="px-4 py-2 text-gray-600">{student.course || '-'}</td>
                                                <td className="px-4 py-2 text-gray-600">{student.year_level || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <ListPager page={safePage} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
                    </>
                )}
            </div>
        </div>
    ), document.getElementById('staff-content-region') || document.body);
};

const RegistrantsModal = ({
    selectedEventTitle, registrations, selectedRegistrationEvent, registrantStatusFilter, setRegistrantStatusFilter, setShowRegistrantsModal, setRegistrations, setSelectedRegistrationEvent
}: any) => {
    const statusCounts = registrations.reduce((counts: Record<string, number>, registration: any) => {
        const status = registration.attendance_status || 'Registered';
        counts[status] = (counts[status] || 0) + 1;
        return counts;
    }, {});
    const filteredRegistrations = registrantStatusFilter === 'All'
        ? registrations
        : registrations.filter((registration: any) => registration.attendance_status === registrantStatusFilter);
    const activeRegisteredCount = registrations.filter((registration: any) => registration.attendance_status !== 'Cancelled').length;
    const attendedCount = statusCounts.Attended || 0;
    const absentCount = statusCounts.Absent || 0;
    const attendanceRate = activeRegisteredCount > 0
        ? Math.round((attendedCount / activeRegisteredCount) * 100)
        : 0;
    const capacity = Number(selectedRegistrationEvent?.capacity || 0);
    const remainingSlots = capacity > 0 ? Math.max(capacity - activeRegisteredCount, 0) : null;
    return (
        <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[84vh]">
                <div className="p-6 border-b bg-gray-50 rounded-t-2xl">
                    <div className="flex justify-between items-center gap-4 mb-4">
                        <div>
                            <h3 className="font-bold text-lg">Registered Students</h3>
                            <p className="text-xs text-gray-500">{selectedEventTitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    const headers = ['Student Name', 'Student ID', 'Department', 'Course', 'Year Level', 'Section', 'Registration Status', 'Registered At', 'Time In', 'Time Out'];
                                    const rows = filteredRegistrations.map((registration: any) => [
                                        registration.student_name || '',
                                        registration.student_id || '',
                                        registration.department || '',
                                        registration.course || '',
                                        registration.year_level || '',
                                        registration.section || '',
                                        registration.attendance_status || registration.status || '',
                                        registration.registered_at ? new Date(registration.registered_at).toLocaleString() : '',
                                        registration.attendance?.time_in ? new Date(registration.attendance.time_in).toLocaleString() : '-',
                                        registration.attendance?.time_out ? new Date(registration.attendance.time_out).toLocaleString() : '-'
                                    ]);
                                    exportToExcel(headers, rows, `${selectedEventTitle || 'event'}_registrants`);
                                }}
                                disabled={filteredRegistrations.length === 0}
                                leftIcon={<Download size={14} />}
                            >
                                Export Excel
                            </Button>
                            <button type="button" aria-label="Close registrants" onClick={() => { setShowRegistrantsModal(false); setRegistrations([]); setSelectedRegistrationEvent(null); setRegistrantStatusFilter('All'); }}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
                        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">{activeRegisteredCount} Registered</span>
                        <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold">{attendedCount} Attended</span>
                        <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold">{absentCount} Absent</span>
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">{statusCounts.Cancelled || 0} Cancelled</span>
                        <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">{attendanceRate}% Attendance</span>
                        {remainingSlots !== null && <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-bold">{remainingSlots} Slots Left</span>}
                    </div>
                    {selectedRegistrationEvent && (
                        <p className="mb-3 text-xs font-semibold text-gray-500">
                            Deadline: {formatRegistrationDeadline(selectedRegistrationEvent.registration_deadline)} | Walk-ins: {selectedRegistrationEvent.allow_walk_ins ? 'Allowed' : 'Not allowed'}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {REGISTRANT_STATUS_OPTIONS.map((status) => (
                            <button type="button"
                                key={status}
                                onClick={() => setRegistrantStatusFilter(status)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${registrantStatusFilter === status ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                            >
                                {status}{status !== 'All' ? ` (${statusCounts[status] || 0})` : ''}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-0 overflow-y-auto flex-1">
                    {filteredRegistrations.length === 0 ? <p className="text-center py-8 text-gray-500">No registered students yet.</p> : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Student</th>
                                    <th className="px-6 py-3">Course</th>
                                    <th className="px-6 py-3">Year / Sec</th>
                                    <th className="px-6 py-3">Registered</th>
                                    <th className="px-6 py-3">Attendance Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRegistrations.map((registration: any) => (
                                    <tr key={registration.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3">
                                            <p className="font-bold text-gray-900">{registration.student_name || '-'}</p>
                                            <p className="text-xs text-gray-500">{registration.student_id} | {registration.department || '-'}</p>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 text-xs font-medium">{registration.course || '-'}</td>
                                        <td className="px-6 py-3 text-gray-600 text-xs font-medium">{registration.year_level || '-'}{registration.section ? ` - ${registration.section}` : ''}</td>
                                        <td className="px-6 py-3 text-gray-600 text-xs">{registration.registered_at ? new Date(registration.registered_at).toLocaleString() : '-'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getRegistrationStatusClass(registration.attendance_status)}`}>
                                                {registration.attendance_status}
                                            </span>
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
};

const FeedbackModal = ({
    selectedEventTitle, eventDate, evaluationCreatedAt, feedbackList, setShowFeedbackModal
}: any) => {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(feedbackList.length / ITEMS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageItems = feedbackList.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    return (
        <Modal
            open
            onClose={() => setShowFeedbackModal(false)}
            size="full"
            anchorId="staff-content-region"
            title="Event Feedback"
            subtitle={selectedEventTitle}
            headerMeta={
                <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs sm:justify-end sm:text-right">
                    <div>
                        <dt className="font-semibold text-slate-500">Event date</dt>
                        <dd className="font-bold text-slate-900">{formatDate(eventDate)}</dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-slate-500">Evaluation created</dt>
                        <dd className="font-bold text-slate-900">{formatDate(evaluationCreatedAt)}</dd>
                    </div>
                </dl>
            }
        >
            {feedbackList.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">No feedback submitted yet.</p>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                    <ul className="divide-y divide-gray-100">
                        {pageItems.map((fb: any) => {
                            const criteriaScores = [fb.q1_score, fb.q2_score, fb.q3_score, fb.q4_score, fb.q5_score, fb.q6_score, fb.q7_score]
                                .map((value) => Number(value))
                                .filter((score) => Number.isFinite(score) && score >= 1 && score <= 5);
                            const numericRating = Number(fb.rating);
                            const displayRating = Number.isFinite(numericRating) && numericRating > 0
                                ? numericRating
                                : (criteriaScores.length > 0 ? Number((criteriaScores.reduce((sum, score) => sum + score, 0) / criteriaScores.length).toFixed(1)) : 0);
                            const roundedRating = Math.round(displayRating);
                            const mainComment = fb.open_comments || fb.feedback || fb.comments || '';
                            const submittedAt = fb.submitted_at || fb.created_at;
                            return (
                                <li key={fb.id} className="px-3 py-2 sm:px-4">
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1 text-yellow-500">
                                            {[1, 2, 3, 4, 5].map((idx) => (
                                                <Star key={idx} size={12} fill={idx <= roundedRating ? 'currentColor' : 'none'} className={idx <= roundedRating ? 'text-yellow-500' : 'text-gray-300'} />
                                            ))}
                                            <span className="ml-1 text-[11px] font-bold text-gray-600">{displayRating ? `${displayRating}/5` : 'No rating'}</span>
                                        </div>
                                        <time className="text-[11px] text-gray-400">{submittedAt ? new Date(submittedAt).toLocaleDateString() : '—'}</time>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-0.5 text-[11px] leading-4 text-gray-600">
                                        {mainComment
                                            ? <p className="min-w-48 flex-1 text-xs italic text-gray-700">"{mainComment}"</p>
                                            : <p className="min-w-48 flex-1 text-gray-400">No comment provided.</p>}
                                        {fb.open_best && <p><span className="font-bold text-gray-700">Liked best:</span> {fb.open_best}</p>}
                                        {fb.open_suggestions && <p><span className="font-bold text-gray-700">Suggestion:</span> {fb.open_suggestions}</p>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <ListPager page={safePage} totalPages={totalPages} totalItems={feedbackList.length} onPageChange={setPage} itemLabel="reviews" />
                </div>
            )}
        </Modal>
    );
};

const EventDetailModal = ({ detailEvent, setDetailEvent }: any) => createPortal((
    <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-black/30 p-2 backdrop-blur-sm sm:p-3" onClick={() => setDetailEvent(null)}>
        <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="px-6 py-5 sm:px-8 border-b bg-gray-50 rounded-t-2xl flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getEventTypeBadgeClass(detailEvent.type)}`}>
                        {detailEvent.type}
                    </span>
                    {isAttendanceActivityType(detailEvent.type) && detailEvent.attendance_required && (
                        <span className="ml-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">Required</span>
                    )}
                    {isRegistrationEvent(detailEvent) && (
                        <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Student registration</span>
                    )}
                    <h3 className="mt-3 break-words text-2xl font-bold text-gray-900">{detailEvent.title}</h3>
                </div>
                <button type="button" aria-label="Close event details" onClick={() => setDetailEvent(null)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="flex-1 p-6 sm:p-8 space-y-5 overflow-y-auto">
                <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Description</h4>
                    <div className="max-h-72 overflow-y-auto pr-1">
                        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">{detailEvent.description || 'No description provided.'}</p>
                    </div>
                </section>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    {detailEvent.location && <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Location</p><p className="text-gray-700">{detailEvent.location}</p></div>}
                    {detailEvent.event_date && <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Date</p><p className="text-gray-700">{detailEvent.event_date}</p></div>}
                    {detailEvent.event_time && <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Time</p><p className="text-gray-700">{detailEvent.event_time}{detailEvent.end_time ? ` - ${detailEvent.end_time}` : ''}</p></div>}
                    {isAttendanceActivityType(detailEvent.type) && <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Attendance</p><p className="text-gray-700">{detailEvent.attendees || 0} attendees</p></div>}
                    {isRegistrationEvent(detailEvent) && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700 uppercase mb-1">Registrants</p><p className="text-gray-700">{detailEvent.registeredCount || 0}{detailEvent.capacity ? ` / ${detailEvent.capacity}` : ''}</p></div>}
                    {isRegistrationEvent(detailEvent) && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700 uppercase mb-1">Deadline</p><p className="text-gray-700">{formatRegistrationDeadline(detailEvent.registration_deadline)}</p></div>}
                    {isRegistrationEvent(detailEvent) && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700 uppercase mb-1">Walk-ins</p><p className="text-gray-700">{detailEvent.allow_walk_ins ? 'Allowed' : 'Not allowed'}</p></div>}
                    {isAttendanceActivityType(detailEvent.type) && (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:col-span-2 lg:col-span-4">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Audience</p>
                            <ul className="space-y-2 text-sm leading-6 text-gray-700">
                                {getAudienceBulletItems(detailEvent).map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                                        <span className="min-w-0 break-words">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 border-t bg-white text-right shrink-0">
                <Button variant="secondary" onClick={() => setDetailEvent(null)}>Close</Button>
            </div>
        </div>
    </div>
), document.getElementById('staff-content-region') || document.body);

const EventListSection = ({
    eventFilter, events, archivedEvents, canArchiveRecords, handleEditEvent, onOpenExtend, handleViewAttendees, handleViewAbsent, handleViewRegistrants, handleViewFeedback, setDetailEvent, handleDeleteEvent, evaluations, handleBuildEvaluation, handleViewEvaluationResults
}: any) => (
    <div className="space-y-4">
        {/* Active Events */}
        {eventFilter !== 'Archived' && events.flatMap(item => (
            eventFilter === 'All Items' || isVisibleForStaffFilter(item, eventFilter) ? [(
                <div key={item.id} className="card-hover bg-white/80 backdrop-blur-sm border border-gray-100/80 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start gap-4 relative overflow-hidden group">
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <button type="button" aria-label={`View details for ${item.title}`} className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500" onClick={() => setDetailEvent(item)} />
                    <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${getEventTypeBadgeClass(item.type)}`}>{item.type}</span>
                            {isAttendanceActivityType(item.type) && item.attendance_required && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Required</span>}
                            {isRegistrationEvent(item) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Registration</span>}
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                        <p className="mt-1 max-w-5xl whitespace-pre-wrap break-words text-sm leading-6 text-gray-600 line-clamp-2">
                            {item.description || 'No description provided.'}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                            {item.location && <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>}
                            {item.event_date && <span className="flex items-center gap-1"><Calendar size={12} />{item.event_date}</span>}
                            {item.event_time && <span className="flex items-center gap-1"><Clock size={12} />{item.event_time}</span>}
                            {item.end_time && <span className="text-gray-400 text-[10px] ml-1">- {item.end_time}</span>}
                            {isAttendanceActivityType(item.type) && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.attendees || 0} Attendees</span>}
                            {isRegistrationEvent(item) && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.registeredCount || 0}{item.capacity ? `/${item.capacity}` : ''} Registered</span>}
                            {isAttendanceActivityType(item.type) && item.avgRating && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Star size={12} />{item.avgRating} <span className="font-normal opacity-75">({item.feedbackCount})</span></span>}
                        </div>
                        {isAttendanceActivityType(item.type) && (
                            <div className="mt-2 max-w-5xl rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold leading-5 text-slate-700">
                                <div className="flex items-start gap-2">
                                    <Users size={13} className="mt-0.5 shrink-0 text-slate-500" />
                                    <span className="min-w-0 break-words">{getAudienceModeLabel(item)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative z-20 flex shrink-0 flex-wrap gap-2">
                        {isAttendanceActivityType(item.type) && (
                            <>
                                <Button variant="secondary" size="sm" onClick={() => item.id && handleViewFeedback(item)} leftIcon={<Star size={14} className="text-yellow-500" />}>Reviews ({item.feedbackCount || 0})</Button>
                                {isRegistrationEvent(item) && <Button variant="secondary" size="sm" onClick={() => item.id && handleViewRegistrants(item)} leftIcon={<Users size={14} className="text-emerald-500" />}>Registrants ({item.registeredCount || 0})</Button>}
                                <Button variant="secondary" size="sm" onClick={() => item.id && handleViewAttendees(item)} leftIcon={<Users size={14} className="text-blue-500" />}>Attendees ({item.attendees || 0})</Button>
                                <Button variant="secondary" size="sm" onClick={() => item.id && handleViewAbsent(item)} leftIcon={<UserX size={14} className="text-red-500" />}>Absent</Button>
                                {evaluations?.get(item.id)
                                    ? (
                                        <Button variant="secondary" size="sm" onClick={() => item.id && handleViewEvaluationResults(item)} leftIcon={<ClipboardList size={14} className="text-purple-500" />}>
                                            Evaluation ({evaluations.get(item.id).responseCount})
                                        </Button>
                                    )
                                    : (
                                        <Button variant="secondary" size="sm" onClick={() => item.id && handleBuildEvaluation(item)} leftIcon={<Plus size={14} className="text-purple-500" />}>
                                            Create Evaluation
                                        </Button>
                                    )}
                            </>
                        )}
                        {isAttendanceActivityType(item.type) && (
                            <Button variant="secondary" size="sm" onClick={() => onOpenExtend(item)} leftIcon={<Clock size={14} />}>Extend</Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => handleEditEvent(item)} leftIcon={<CheckCircle size={14} />} />
                        {canArchiveRecords && (
                            <Button variant="danger" size="sm" onClick={() => item.id && handleDeleteEvent(item.id)} leftIcon={<Archive size={14} />} />
                        )}
                    </div>
                </div>
            )] : []
        ))}

        {/* Archived Events */}
        {eventFilter === 'Archived' && archivedEvents.map(item => (
            <div key={item.id} className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start gap-4 relative overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-300 to-gray-400" />
                <button type="button" aria-label={`View details for ${item.title}`} className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-500" onClick={() => setDetailEvent(item)} />
                <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getArchivedEventTypeBadgeClass(item.type)}`}>{item.type}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 flex items-center gap-1"><Archive size={10} /> Archived</span>
                        {isRegistrationEvent(item) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Registration</span>}
                    </div>
                    <h3 className="font-bold text-gray-600 text-lg">{item.title}</h3>
                    <p className="mt-2 max-w-5xl whitespace-pre-wrap break-words text-sm leading-6 text-gray-500 line-clamp-2">
                        {item.description || 'No description provided.'}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                        {item.location && <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>}
                        {item.event_date && <span className="flex items-center gap-1"><Calendar size={12} />{item.event_date}</span>}
                        {item.event_time && <span className="flex items-center gap-1"><Clock size={12} />{item.event_time}</span>}
                        {item.end_time && <span className="text-gray-300 text-[10px] ml-1">- {item.end_time}</span>}
                        {isAttendanceActivityType(item.type) && <span className="bg-blue-50 text-blue-500 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.attendees || 0} Attendees</span>}
                        {isRegistrationEvent(item) && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.registeredCount || 0}{item.capacity ? `/${item.capacity}` : ''} Registered</span>}
                        {isAttendanceActivityType(item.type) && item.avgRating && <span className="bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Star size={12} />{item.avgRating} <span className="font-normal opacity-75">({item.feedbackCount})</span></span>}
                    </div>
                    {isAttendanceActivityType(item.type) && (
                        <div className="mt-3 max-w-5xl rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
                            <div className="flex items-start gap-2">
                                <Users size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                <span className="min-w-0 break-words">{getAudienceModeLabel(item)}</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative z-20 flex shrink-0 flex-wrap gap-2">
                    {isAttendanceActivityType(item.type) && (
                        <>
                            <Button variant="ghost" size="sm" onClick={() => item.id && handleViewFeedback(item)} leftIcon={<Star size={14} className="text-yellow-400" />}>Reviews ({item.feedbackCount || 0})</Button>
                            {isRegistrationEvent(item) && <Button variant="ghost" size="sm" onClick={() => item.id && handleViewRegistrants(item)} leftIcon={<Users size={14} className="text-emerald-400" />}>Registrants ({item.registeredCount || 0})</Button>}
                            <Button variant="ghost" size="sm" onClick={() => item.id && handleViewAttendees(item)} leftIcon={<Users size={14} className="text-blue-400" />}>Attendees ({item.attendees || 0})</Button>
                            <Button variant="ghost" size="sm" onClick={() => item.id && handleViewAbsent(item)} leftIcon={<UserX size={14} className="text-red-400" />}>Absent</Button>
                            {evaluations?.get(item.id) && (
                                <Button variant="ghost" size="sm" onClick={() => item.id && handleViewEvaluationResults(item)} leftIcon={<ClipboardList size={14} className="text-purple-400" />}>
                                    Evaluation ({evaluations.get(item.id).responseCount})
                                </Button>
                            )}
                        </>
                    )}
                    {isAttendanceActivityType(item.type) && (
                        <Button variant="ghost" size="sm" onClick={() => onOpenExtend(item)} leftIcon={<Clock size={14} className="text-blue-400" />}>Extend attendance</Button>
                    )}
                </div>
            </div>
        ))}

        {eventFilter !== 'Archived' && events.filter(i => eventFilter === 'All Items' || isVisibleForStaffFilter(i, eventFilter)).length === 0 && <div className="text-center py-8 text-gray-400">No active events or announcements found.</div>}
        {eventFilter === 'Archived' && archivedEvents.length === 0 && <div className="text-center py-8 text-gray-400">No archived events yet.</div>}
    </div>
);

const CareStaffEventsPage = ({ functions }: CareStaffEventsPageProps) => {
    const {
        showToast,
        canPerformAction,
        canArchiveRecords,
        eventFilter,
        setEventFilter,
        isRefreshingData,
        setIsRefreshingData,
        events,
        archivedEvents,
        fetchEvents,
        showEventModal,
        setShowEventModal,
        showDeleteEventModal,
        setShowDeleteEventModal,
        showAttendeesModal,
        setShowAttendeesModal,
        showAbsentModal,
        setShowAbsentModal,
        showRegistrantsModal,
        setShowRegistrantsModal,
        showFeedbackModal,
        setShowFeedbackModal,
        isAttendanceLoading,
        detailEvent,
        setDetailEvent,
        editingEventId,
        setEditingEventId,
        eventToDelete,
        setEventToDelete,
        newEvent,
        setNewEvent,
        departmentOptions,
        setDepartmentOptions,
        courseOptions,
        setCourseOptions,
        attendees,
        setAttendees,
        expectedStudents,
        setExpectedStudents,
        registrations,
        setRegistrations,
        feedbackList,
        setFeedbackList,
        selectedEventTitle,
        setSelectedEventTitle,
        selectedAttendanceEvent,
        setSelectedAttendanceEvent,
        selectedFeedbackEvent,
        selectedRegistrationEvent,
        setSelectedRegistrationEvent,
        attendeeFilter,
        setAttendeeFilter,
        yearLevelFilter,
        setYearLevelFilter,
        attendeeCourseFilter,
        setAttendeeCourseFilter,
        attendeeSectionFilter,
        setAttendeeSectionFilter,
        registrantStatusFilter,
        setRegistrantStatusFilter,
        createEvent,
        handleEditEvent,
        handleExtendAttendance,
        handleDeleteEvent,
        confirmDeleteEvent,
        handleViewAttendees,
        handleViewRegistrants,
        handleViewFeedback,
        handleRefreshData,
        getCurrentLocation,
        renderAudienceCheckboxGroup
    } = useCareStaffEvents({ functions });

    const [evaluations, setEvaluations] = useState<Map<number, { form: EvaluationForm; responseCount: number }>>(new Map());
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [evaluationTarget, setEvaluationTarget] = useState<{ event: SystemEvent; form: EvaluationForm | null } | null>(null);
    const [resultsTarget, setResultsTarget] = useState<{ formId: number; title: string; eventDate?: string | null } | null>(null);
    const [extendTarget, setExtendTarget] = useState<any>(null);
    const [extendDate, setExtendDate] = useState('');

    const onOpenExtend = (item: any) => {
        setExtendTarget(item);
        setExtendDate(suggestCloseDate(item.event_date || '', item.end_time || ''));
    };

    const refreshEvaluations = useCallback(async () => {
        const ids = [...events, ...archivedEvents]
            .map((item: SystemEvent) => item.id)
            .filter((id): id is number => typeof id === 'number');
        try {
            setEvaluations(await getEvaluationsForEvents(ids));
        } catch {
            showToast('Could not load event evaluations.', 'error');
        }
    }, [events, archivedEvents, showToast]);

    useEffect(() => {
        void refreshEvaluations();
    }, [refreshEvaluations]);

    const handleBuildEvaluation = (event: SystemEvent) => {
        setEvaluationTarget({ event, form: evaluations.get(event.id as number)?.form ?? null });
    };

    const handleViewEvaluationResults = (event: SystemEvent) => {
        const existing = evaluations.get(event.id as number);
        if (existing) setResultsTarget({ formId: existing.form.id, title: event.title, eventDate: event.event_date });
    };

    const eventTabs = [
        { id: 'All Items', label: 'All Items', count: events.length },
        { id: 'Activities', label: 'Activities', count: events.filter((item) => isVisibleForStaffFilter(item, 'Activities')).length },
        { id: 'Announcements', label: 'Announcements', count: events.filter((item) => isVisibleForStaffFilter(item, 'Announcements')).length },
        { id: 'Archived', label: 'Archived', count: archivedEvents.length }
    ];

    return (
        <>
            <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Events & Announcements</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage campus activities and broadcast official notices.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            isLoading={isRefreshingData}
                            leftIcon={!isRefreshingData ? <RefreshCw size={16} /> : undefined}
                        >
                            {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setShowTemplatesModal(true)}
                            leftIcon={<ClipboardList size={16} />}
                        >
                            Evaluation Templates
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setEditingEventId(null);
                                setNewEvent(createEmptyEvent());
                                setShowEventModal(true);
                            }}
                            leftIcon={<Plus size={14} />}
                        >
                            Create New
                        </Button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-full overflow-x-auto rounded-full">
                        <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-gray-200/60 bg-white/60 p-1.5 shadow-sm backdrop-blur-xl">
                            <AnimatePresence>
                                {eventTabs.map((tab) => {
                                    const isActive = eventFilter === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            aria-pressed={isActive}
                                            onClick={() => setEventFilter(tab.id)}
                                            className={`relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                                        >
                                            {isActive && (
                                                <m.div
                                                    layoutId="eventFilterBubble"
                                                    className="absolute inset-0 -z-10 rounded-full bg-purple-600 shadow-md shadow-purple-200"
                                                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                                                />
                                            )}
                                            {tab.id === 'Archived' && <Archive size={14} />}
                                            <span>{tab.label}</span>
                                            <span className={`text-xs ${isActive ? 'rounded-full bg-white/20 px-1.5 py-0.5 text-white' : 'rounded-full bg-gray-100 px-1.5 py-0.5 text-gray-500'}`}>{tab.count}</span>
                                        </button>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                    <span className="self-start rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-400 sm:self-auto">
                        {eventFilter === 'Archived' ? `Archived: ${archivedEvents.length}` : `Active: ${events.length}`}
                    </span>
                </div>

                <EventListSection
                    eventFilter={eventFilter}
                    events={events}
                    archivedEvents={archivedEvents}
                    canArchiveRecords={canArchiveRecords}
                    handleEditEvent={handleEditEvent}
                    onOpenExtend={onOpenExtend}
                    handleViewAttendees={handleViewAttendees}
                    handleViewAbsent={(item: SystemEvent) => handleViewAttendees(item, 'absent')}
                    handleViewRegistrants={handleViewRegistrants}
                    handleViewFeedback={handleViewFeedback}
                    setDetailEvent={setDetailEvent}
                    handleDeleteEvent={handleDeleteEvent}
                    evaluations={evaluations}
                    handleBuildEvaluation={handleBuildEvaluation}
                    handleViewEvaluationResults={handleViewEvaluationResults}
                />
            </div>

            {/* Event Modal - Enhanced for Create/Edit */}
            {showEventModal && (
                <EventFormModal
                    newEvent={newEvent}
                    setNewEvent={setNewEvent}
                    editingEventId={editingEventId}
                    createEvent={createEvent}
                    departmentOptions={departmentOptions}
                    courseOptions={courseOptions}
                    getCurrentLocation={getCurrentLocation}
                    setShowEventModal={setShowEventModal}
                    setEditingEventId={setEditingEventId}
                    renderAudienceCheckboxGroup={renderAudienceCheckboxGroup}
                />
            )}

            {/* Attendees Modal */}
            {showAttendeesModal && (
                <AttendeesModal
                    showToast={showToast}
                    isLoading={isAttendanceLoading}
                    attendees={attendees}
                    expectedStudents={expectedStudents}
                    selectedAttendanceEvent={selectedAttendanceEvent}
                    attendeeFilter={attendeeFilter}
                    setAttendeeFilter={setAttendeeFilter}
                    yearLevelFilter={yearLevelFilter}
                    setYearLevelFilter={setYearLevelFilter}
                    attendeeCourseFilter={attendeeCourseFilter}
                    setAttendeeCourseFilter={setAttendeeCourseFilter}
                    attendeeSectionFilter={attendeeSectionFilter}
                    setAttendeeSectionFilter={setAttendeeSectionFilter}
                    setShowAttendeesModal={setShowAttendeesModal}
                    selectedEventTitle={selectedEventTitle}
                    setExpectedStudents={setExpectedStudents}
                    setSelectedAttendanceEvent={setSelectedAttendanceEvent}
                />
            )}

            {/* Absent Students Modal */}
            {showAbsentModal && (
                <AbsentModal
                    isLoading={isAttendanceLoading}
                    attendees={attendees}
                    expectedStudents={expectedStudents}
                    selectedAttendanceEvent={selectedAttendanceEvent}
                    selectedEventTitle={selectedEventTitle}
                    setShowAbsentModal={setShowAbsentModal}
                    setExpectedStudents={setExpectedStudents}
                    setSelectedAttendanceEvent={setSelectedAttendanceEvent}
                />
            )}

            {/* Registrants Modal */}
            {showRegistrantsModal && (
                <RegistrantsModal
                    selectedEventTitle={selectedEventTitle}
                    registrations={registrations}
                    selectedRegistrationEvent={selectedRegistrationEvent}
                    registrantStatusFilter={registrantStatusFilter}
                    setRegistrantStatusFilter={setRegistrantStatusFilter}
                    setShowRegistrantsModal={setShowRegistrantsModal}
                    setRegistrations={setRegistrations}
                    setSelectedRegistrationEvent={setSelectedRegistrationEvent}
                />
            )}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <FeedbackModal
                    selectedEventTitle={selectedEventTitle}
                    eventDate={selectedFeedbackEvent?.event_date}
                    evaluationCreatedAt={evaluations.get(selectedFeedbackEvent?.id as number)?.form.created_at}
                    feedbackList={feedbackList}
                    setShowFeedbackModal={setShowFeedbackModal}
                />
            )}

            {detailEvent && (
                <EventDetailModal detailEvent={detailEvent} setDetailEvent={setDetailEvent} />
            )}

            {showTemplatesModal && (
                <EventEvaluationTemplatesModal
                    open={showTemplatesModal}
                    onClose={() => setShowTemplatesModal(false)}
                    showToast={showToast}
                />
            )}

            {evaluationTarget && (
                <EventEvaluationBuilderModal
                    open={Boolean(evaluationTarget)}
                    onClose={() => setEvaluationTarget(null)}
                    eventId={evaluationTarget.event.id as number}
                    eventTitle={evaluationTarget.event.title}
                    existingForm={evaluationTarget.form}
                    showToast={showToast}
                    onSaved={refreshEvaluations}
                />
            )}

            {resultsTarget && (
                <EventEvaluationResultsModal
                    open={Boolean(resultsTarget)}
                    onClose={() => setResultsTarget(null)}
                    formId={resultsTarget.formId}
                    eventTitle={resultsTarget.title}
                    eventDate={resultsTarget.eventDate}
                    showToast={showToast}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteEventModal && canArchiveRecords && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center animate-scale-in">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><Archive size={32} /></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Archive Item</h3>
                        <p className="text-gray-500 mb-6">Are you sure you want to archive this event or announcement? Attendance and feedback history stay intact.</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteEventModal(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1" onClick={confirmDeleteEvent}>Yes, Archive</Button>
                        </div>
                    </div>
                </div>
            )}

            {extendTarget && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Extend attendance</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {extendTarget.title} &mdash; time in, time out, rating and the evaluation form reopen until this date.
                                An archived event comes back into the students&rsquo; list.
                            </p>
                            <label htmlFor="extend-closes-at" className="block text-xs font-bold text-gray-500 mb-1">Attendance closes</label>
                            <input
                                id="extend-closes-at"
                                type="datetime-local"
                                className="w-full border rounded-lg p-2 text-sm"
                                value={extendDate}
                                onChange={e => setExtendDate(e.target.value)}
                            />
                            <div className="flex gap-3 mt-6">
                                <Button variant="secondary" className="flex-1" onClick={() => setExtendTarget(null)}>Cancel</Button>
                                <Button
                                    className="flex-1"
                                    onClick={async () => {
                                        await handleExtendAttendance(extendTarget, extendDate);
                                        setExtendTarget(null);
                                    }}
                                >
                                    Reopen
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
};

export default CareStaffEventsPage;

