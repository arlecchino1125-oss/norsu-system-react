import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';
import {
    Plus, Calendar, Clock, MapPin, Users, UserX, Star, XCircle, Download, CheckCircle, Archive, RefreshCw, ClipboardList, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { supabase } from '../../../../../lib/supabase';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { formatDate, toTitleCase } from '../../../../../utils/formatters';
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
import { useCareStaffEvents, createEmptyEvent, suggestCloseDate, suggestExtendDate, nowCloseDate, getEventTypeBadgeClass, getArchivedEventTypeBadgeClass, isVisibleForStaffFilter, getAudienceModeLabel, getAudienceBulletItems, isRegistrationEvent, formatRegistrationDeadline, getRegistrationStatusClass } from '../hooks/useCareStaffEvents';
import type { CareStaffEventsPageProps } from '../hooks/useCareStaffEvents';

const REGISTRANT_STATUS_OPTIONS = ['All', 'Registered', 'Attended', 'Absent', 'Cancelled'];
const ITEMS_PER_PAGE = 20;
const EVENTS_PAGE_SIZE = 10;

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
    newEvent, setNewEvent, editingEventId, setEditingEventId, createEvent, departmentOptions, courseOptions, getCurrentLocation, setShowEventModal, renderAudienceCheckboxGroup, applyScheduleField
}: any) => {
    const isActivity = isAttendanceActivityType(newEvent.type);
    const isRegistration = isRegistrationEvent(newEvent);
    const hasFilteredAudience = newEvent.audience_type !== 'all_students' && newEvent.audience_type !== 'peer_facilitators';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:pl-64 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            {editingEventId ? 'Edit Item' : 'Create New Item'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isActivity ? 'Fill in event schedule, audience, and attendance settings.' : 'Configure details for this campus announcement.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close event form"
                        onClick={() => { setShowEventModal(false); setEditingEventId(null); }}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body - Scrollable */}
                <form id="event-form" onSubmit={createEvent} className="overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 custom-scrollbar flex-1 space-y-4">
                    {/* Category & Title */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <label htmlFor="event-category" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Category
                            </label>
                            <select
                                id="event-category"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all cursor-pointer"
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
                        <div className="sm:col-span-2">
                            <label htmlFor="event-title" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Title <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="event-title"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all placeholder:text-slate-400 placeholder:font-normal"
                                value={newEvent.title}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                placeholder="e.g., Campus Fair 2026"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="event-description" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Description <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            id="event-description"
                            required
                            rows={2}
                            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/10 placeholder:text-slate-400"
                            value={newEvent.description}
                            onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                            placeholder="Briefly describe the purpose, agenda, or highlights..."
                        />
                    </div>

                    {/* Schedule & Location */}
                    {isActivity ? (
                        <div className="space-y-3">
                            {/* Date, Start Time, End Time in ONE compact row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label htmlFor="event-date" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="event-date"
                                        type="date"
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                        value={newEvent.event_date}
                                        onChange={e => applyScheduleField('event_date', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="event-start-time" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Start Time
                                    </label>
                                    <input
                                        id="event-start-time"
                                        type="time"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                        value={newEvent.event_time}
                                        onChange={e => applyScheduleField('event_time', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="event-end-time" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        End Time
                                    </label>
                                    <input
                                        id="event-end-time"
                                        type="time"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                        value={newEvent.end_time}
                                        onChange={e => applyScheduleField('end_time', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Location & Attendance Closes */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="event-location" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Location / Venue
                                    </label>
                                    <input
                                        id="event-location"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all placeholder:text-slate-400 placeholder:font-normal"
                                        value={newEvent.location}
                                        onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                        placeholder="e.g., Main Gym, Audio-Visual Room"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="event-attendance-closes" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Attendance Closes (Archive)
                                    </label>
                                    <input
                                        id="event-attendance-closes"
                                        type="datetime-local"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                        value={newEvent.attendance_closes_at}
                                        onChange={e => setNewEvent({ ...newEvent, attendance_closes_at: e.target.value })}
                                        placeholder={suggestCloseDate(newEvent.event_date, newEvent.end_time)}
                                    />
                                    <p className="mt-1 text-[10.5px] text-slate-400 truncate" title="Leave blank for 3 days after event">
                                        Leave blank for 3 days after event ends{suggestCloseDate(newEvent.event_date, newEvent.end_time) ? ` (${suggestCloseDate(newEvent.event_date, newEvent.end_time).replace('T', ' ')})` : ''}.
                                    </p>
                                </div>
                            </div>

                            {/* Mode, Audience & Required Attendance Card */}
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4 space-y-3.5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                    <div>
                                        <label htmlFor="event-mode" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            Mode
                                        </label>
                                        <select
                                            id="event-mode"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all cursor-pointer"
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
                                        <label htmlFor="event-audience" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            Audience
                                        </label>
                                        <select
                                            id="event-audience"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all cursor-pointer"
                                            value={newEvent.audience_type || 'all_students'}
                                            onChange={e => setNewEvent({
                                                ...newEvent,
                                                audience_type: e.target.value as SystemEvent['audience_type']
                                            })}
                                        >
                                            <option value="all_students">All students</option>
                                            <option value="filtered_students">Selected students</option>
                                            <option value="graduating_students">Graduating students</option>
                                            <option value="peer_facilitators">Peer Facilitators</option>
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 transition-colors cursor-pointer select-none h-[38px] shadow-2xs">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(newEvent.attendance_required)}
                                            onChange={e => setNewEvent({ ...newEvent, attendance_required: e.target.checked })}
                                            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                        />
                                        <span>Required attendance</span>
                                    </label>
                                </div>

                                {/* Registration Details Subpanel */}
                                {isRegistration && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 items-end animate-fade-in">
                                        <div>
                                            <label htmlFor="event-capacity" className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                                                Capacity
                                            </label>
                                            <input
                                                id="event-capacity"
                                                type="number"
                                                min="1"
                                                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 placeholder:font-normal"
                                                value={newEvent.capacity ?? ''}
                                                onChange={e => {
                                                    const nextValue = e.target.value;
                                                    setNewEvent({ ...newEvent, capacity: nextValue ? Number(nextValue) : null });
                                                }}
                                                placeholder="Unlimited"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="event-registration-deadline" className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                                                Registration Deadline
                                            </label>
                                            <input
                                                id="event-registration-deadline"
                                                type="datetime-local"
                                                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                                value={newEvent.registration_deadline || ''}
                                                onChange={e => setNewEvent({ ...newEvent, registration_deadline: e.target.value })}
                                            />
                                        </div>
                                        <label className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 transition-colors cursor-pointer select-none h-[38px] shadow-2xs">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(newEvent.allow_walk_ins)}
                                                onChange={e => setNewEvent({ ...newEvent, allow_walk_ins: e.target.checked })}
                                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                            />
                                            <span>Allow walk-ins</span>
                                        </label>
                                    </div>
                                )}

                                {/* Selected Cohort Filter Checkboxes */}
                                {hasFilteredAudience && (
                                    <div className="space-y-3 pt-2 border-t border-slate-200/70 animate-fade-in">
                                        {renderAudienceCheckboxGroup('Colleges', 'audience_departments', departmentOptions)}
                                        {renderAudienceCheckboxGroup('Courses', 'audience_courses', courseOptions)}
                                        {renderAudienceCheckboxGroup('Year Levels', 'audience_year_levels', YEAR_LEVEL_OPTIONS)}
                                        {renderAudienceCheckboxGroup('Sections', 'audience_sections', SECTION_OPTIONS, value => `Section ${value}`)}
                                    </div>
                                )}
                            </div>

                            {/* Advanced Verification Accordion */}
                            <details className="group rounded-2xl border border-slate-200/80 bg-slate-50/50 transition-all">
                                <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-bold text-slate-600 flex items-center justify-between hover:bg-slate-100/60 rounded-2xl transition-colors">
                                    <span className="flex items-center gap-1.5">
                                        <span>Advanced</span>
                                    </span>
                                    <span className="text-[10.5px] font-medium text-slate-400 group-open:hidden">
                                        Photo &amp; Location Checks &darr;
                                    </span>
                                </summary>
                                <div className="space-y-3 border-t border-slate-200/80 p-4">
                                    <p className="text-[11px] text-slate-400">
                                        Proof-of-presence checks apply only while the event is running.
                                    </p>
                                    <label htmlFor="event-require-photo" className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs">
                                        <input
                                            id="event-require-photo"
                                            type="checkbox"
                                            checked={Boolean(newEvent.require_photo)}
                                            onChange={e => setNewEvent({ ...newEvent, require_photo: e.target.checked })}
                                            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                        />
                                        <span>Require photo on time in</span>
                                    </label>
                                    <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 space-y-2.5">
                                        <div className="flex flex-wrap justify-between items-center gap-2">
                                            <label htmlFor="event-require-geolocation" className="flex items-center gap-2 text-xs font-bold text-blue-900 cursor-pointer">
                                                <input
                                                    id="event-require-geolocation"
                                                    type="checkbox"
                                                    checked={Boolean(newEvent.require_geolocation)}
                                                    onChange={e => setNewEvent({ ...newEvent, require_geolocation: e.target.checked })}
                                                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <span>Require geolocation (within 200m of venue)</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={getCurrentLocation} className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"><MapPin size={11} /> My Location</button>
                                                <span className="text-slate-300">·</span>
                                                <button type="button" onClick={() => setNewEvent({ ...newEvent, latitude: '9.306', longitude: '123.306' })} className="text-[11px] text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer"><MapPin size={11} /> Reset Campus</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="number" step="any" aria-label="Latitude" placeholder="Latitude (e.g. 9.306)" className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400" value={newEvent.latitude} onChange={e => setNewEvent({ ...newEvent, latitude: e.target.value })} />
                                            <input type="number" step="any" aria-label="Longitude" placeholder="Longitude (e.g. 123.306)" className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400" value={newEvent.longitude} onChange={e => setNewEvent({ ...newEvent, longitude: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </details>
                        </div>
                    ) : (
                        /* Simple Announcement Date */
                        <div className="w-full sm:w-1/2">
                            <label htmlFor="event-date" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="event-date"
                                type="date"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                                value={newEvent.event_date}
                                onChange={e => applyScheduleField('event_date', e.target.value)}
                            />
                        </div>
                    )}
                </form>

                {/* Fixed / Sticky Footer */}
                <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
                    <button
                        type="button"
                        onClick={() => { setShowEventModal(false); setEditingEventId(null); }}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-2xs cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="event-form"
                        className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer"
                    >
                        {editingEventId ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AttendeesModal = ({
    showToast, isLoading, attendees, expectedStudents, selectedAttendanceEvent, attendeeFilter, setAttendeeFilter, yearLevelFilter, setYearLevelFilter, attendeeCourseFilter, setAttendeeCourseFilter, attendeeSectionFilter, setAttendeeSectionFilter, setShowAttendeesModal, selectedEventTitle, setExpectedStudents, setSelectedAttendanceEvent, handleVoidAttendance
}: any) => {
    const [attendeeSearch, setAttendeeSearch] = useState('');
    const [page, setPage] = useState(1);
    const [confirmVoid, setConfirmVoid] = useState(false);
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
                        {attendees.length > 0 && (
                            <Button variant="danger" size="sm" onClick={() => setConfirmVoid(true)} leftIcon={<XCircle size={14} />}>Void All Attendance</Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => {
                            if (filtered.length === 0 && expectedStudents.length === 0) return;
                            const headers = ['Student Name', 'College', 'Course', 'Year Level', 'Section', 'Time In', 'Time Out', 'Status'];
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
                                        <option value="All">All Colleges ({attendees.length})</option>
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
                        {confirmVoid && (
                            <div className="mx-4 my-3 rounded-xl border border-red-200 bg-red-50 p-4">
                                <p className="text-sm font-bold text-red-700 mb-1">Void all attendance?</p>
                                <p className="text-xs text-red-600 mb-3">This permanently wipes all time-in/time-out records for this event (e.g. the event did not happen). This cannot be undone.</p>
                                <div className="flex gap-3">
                                    <Button variant="secondary" size="sm" onClick={() => setConfirmVoid(false)}>Cancel</Button>
                                    <Button variant="danger" size="sm" onClick={async () => { await handleVoidAttendance(selectedAttendanceEvent?.id); setConfirmVoid(false); }}>Yes, void all attendance</Button>
                                </div>
                            </div>
                        )}
                        <div className="p-0 overflow-y-auto flex-1">
                            {filtered.length === 0 ? <p className="text-center py-8 text-gray-500">{hasActiveFilters ? 'No attendees match the filters.' : 'No attendees yet.'}</p> : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-green-50 text-green-700 sticky top-0"><tr><th className="px-4 py-2">Student</th><th className="px-4 py-2">Course</th><th className="px-4 py-2">Year / Sec</th><th className="px-4 py-2">Time In</th><th className="px-4 py-2">Time Out</th><th className="px-4 py-2">Location</th><th className="px-4 py-2">Proof</th></tr></thead>
                                    <tbody className="divide-y divide-green-50">
                                        {pageItems.map((att) => (
                                            <tr key={att.id} className="bg-green-50/20 hover:bg-green-50/60">
                                                <td className="px-4 py-2"><p className="font-bold text-gray-900">{toTitleCase(att.student_name, '—')}</p><p className="text-[10px] text-gray-500">{att.department}</p></td>
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
                            const headers = ['Student Name', 'Student ID', 'College', 'Course', 'Year Level'];
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
                                        <option value="All">All Colleges ({absentStudents.length})</option>
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
                                    const headers = ['Student Name', 'Student ID', 'College', 'Course', 'Year Level', 'Section', 'Registration Status', 'Registered At', 'Time In', 'Time Out'];
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
                                            <p className="font-bold text-gray-900">{toTitleCase(registration.student_name, '-')}</p>
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

const parseEventDescription = (description?: string) => {
    if (!description) return { theme: null, body: '' };
    const lines = description.split('\n');
    let theme: string | null = null;
    const remainingLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^(?:💙\s*)?Theme:\s*(?:"([^"]+)"|(.+))$/i);
        if (!theme && match) {
            theme = (match[1] || match[2] || '').trim();
        } else {
            remainingLines.push(line);
        }
    }

    return {
        theme,
        body: remainingLines.join('\n').trim()
    };
};

const getTypeTextColor = (type: unknown) => {
    if (type === 'Announcement') return 'text-purple-600';
    if (type === 'Orientation') return 'text-orange-500';
    if (type === 'Seminar') return 'text-emerald-600';
    if (type === 'Meeting') return 'text-slate-600';
    return 'text-blue-600';
};

const AnnouncementCard = ({
    item,
    isArchived,
    canArchiveRecords,
    handleEditEvent,
    handleDeleteEvent,
    setDetailEvent
}: {
    item: SystemEvent;
    isArchived: boolean;
    canArchiveRecords?: boolean;
    handleEditEvent: (item: SystemEvent) => void;
    handleDeleteEvent: (id: number) => void;
    setDetailEvent: (item: SystemEvent) => void;
}) => (
    <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-md transition-all duration-200 relative group flex flex-col gap-2">
        <button
            type="button"
            aria-label={`View details for ${item.title}`}
            className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
            onClick={() => setDetailEvent(item)}
        />
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-600">Announcement</span>
                {isArchived && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-gray-200 text-gray-500">
                        <Archive size={11} className="text-gray-400" /> Archived
                    </span>
                )}
            </div>
            {!isArchived && (
                <div className="relative z-20 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => handleEditEvent(item)}
                        className="p-1 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                        aria-label={`Edit ${item.title}`}
                    >
                        <CheckCircle size={15} />
                    </button>
                    {canArchiveRecords && (
                        <button
                            type="button"
                            onClick={() => item.id && handleDeleteEvent(item.id)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            aria-label={`Archive ${item.title}`}
                        >
                            <Archive size={15} />
                        </button>
                    )}
                </div>
            )}
        </div>
        <h3 className="font-bold text-gray-900 text-lg leading-snug">{item.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words line-clamp-2">
            {item.description || 'No description provided.'}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-1">
            {item.location && (
                <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-gray-400 shrink-0" />
                    <span>{item.location}</span>
                </span>
            )}
            {item.event_date && (
                <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400 shrink-0" />
                    <span>{item.event_date}</span>
                </span>
            )}
        </div>
    </div>
);

const ActivityCard = ({
    item,
    isArchived,
    canArchiveRecords,
    handleEditEvent,
    handleDeleteEvent,
    onOpenExtend,
    onOpenReschedule,
    handleViewAttendees,
    handleViewAbsent,
    handleViewRegistrants,
    handleViewFeedback,
    setDetailEvent,
    evaluations,
    handleBuildEvaluation,
    handleViewEvaluationResults
}: any) => {
    const { theme, body } = parseEventDescription(item.description);

    return (
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-md transition-all duration-200 relative group flex flex-col gap-2">
            <button
                type="button"
                aria-label={`View details for ${item.title}`}
                className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
                onClick={() => setDetailEvent(item)}
            />
            {/* Top row: type label + badges on left, action links row on right */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold ${getTypeTextColor(item.type)}`}>
                        {item.type}
                    </span>
                    {isArchived ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-gray-200 text-gray-500">
                            <Archive size={11} className="text-gray-400" /> Archived
                        </span>
                    ) : (
                        <>
                            {item.attendance_required && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                    Required
                                </span>
                            )}
                            {isRegistrationEvent(item) && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                    Registration
                                </span>
                            )}
                        </>
                    )}
                </div>

                {/* Top-right action links row */}
                <div className="relative z-20 flex items-center gap-3 sm:gap-4 flex-wrap text-xs font-medium text-gray-500">
                    <button
                        type="button"
                        onClick={() => item.id && handleViewFeedback(item)}
                        className="inline-flex items-center gap-1 hover:text-amber-600 transition-colors cursor-pointer"
                        aria-label={`Reviews (${item.feedbackCount || 0})`}
                    >
                        <Star size={13} />
                        <span>Reviews ({item.feedbackCount || 0})</span>
                    </button>

                    {isRegistrationEvent(item) && (
                        <button
                            type="button"
                            onClick={() => item.id && handleViewRegistrants(item)}
                            className="inline-flex items-center gap-1 hover:text-emerald-600 transition-colors cursor-pointer"
                            aria-label={`Registrants (${item.registeredCount || 0})`}
                        >
                            <Users size={13} />
                            <span>Registrants ({item.registeredCount || 0})</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => item.id && handleViewAttendees(item)}
                        className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                        aria-label={`Attendees (${item.attendees || 0})`}
                    >
                        <Users size={13} />
                        <span>Attendees ({item.attendees || 0})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => item.id && handleViewAbsent(item)}
                        className="inline-flex items-center gap-1 hover:text-red-600 transition-colors cursor-pointer"
                        aria-label="Absent"
                    >
                        <UserX size={13} />
                        <span>Absent</span>
                    </button>

                    {evaluations?.get(item.id) ? (
                        <button
                            type="button"
                            onClick={() => item.id && handleViewEvaluationResults(item)}
                            className="inline-flex items-center gap-1 hover:text-purple-600 transition-colors cursor-pointer"
                            aria-label={`Evaluation (${evaluations.get(item.id).responseCount})`}
                        >
                            <ClipboardList size={13} />
                            <span>
                                {item.audience_type === 'peer_facilitators' ? 'Peer Evaluation' : 'Evaluation'} ({evaluations.get(item.id).responseCount})
                            </span>
                        </button>
                    ) : !isArchived ? (
                        <button
                            type="button"
                            onClick={() => item.id && handleBuildEvaluation(item)}
                            className="inline-flex items-center gap-1 hover:text-purple-600 transition-colors cursor-pointer"
                            aria-label="Create Evaluation"
                        >
                            <Plus size={13} />
                            <span>
                                {item.audience_type === 'peer_facilitators' ? 'Create Peer Evaluation' : 'Create Evaluation'}
                            </span>
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => onOpenExtend(item)}
                        className="inline-flex items-center gap-1 hover:text-teal-600 transition-colors cursor-pointer"
                        aria-label="Extend attendance"
                    >
                        <Clock size={13} />
                        <span>Extend attendance</span>
                    </button>

                    {!isArchived && (
                        <>
                            <button
                                type="button"
                                onClick={() => onOpenReschedule(item)}
                                className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                                aria-label="Reschedule"
                            >
                                <Calendar size={13} />
                                <span>Reschedule</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleEditEvent(item)}
                                className="p-1 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                                aria-label={`Edit ${item.title}`}
                            >
                                <CheckCircle size={14} />
                            </button>
                            {canArchiveRecords && (
                                <button
                                    type="button"
                                    onClick={() => item.id && handleDeleteEvent(item.id)}
                                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    aria-label={`Archive ${item.title}`}
                                >
                                    <Archive size={14} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Title */}
            <h3 className="font-bold text-gray-900 text-lg leading-snug">{item.title}</h3>

            {/* Theme line in blue with 💙 prefix */}
            {theme && (
                <p className="text-sm font-medium text-blue-600">
                    💙 Theme: &quot;{theme}&quot;
                </p>
            )}

            {/* Description body */}
            {body ? (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words line-clamp-2">
                    {body}
                </p>
            ) : !theme && (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words line-clamp-2">
                    {item.description || 'No description provided.'}
                </p>
            )}

            {/* Meta row: location, date, time range, attendee count, star rating */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-1">
                {item.location && (
                    <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span>{item.location}</span>
                    </span>
                )}
                {item.event_date && (
                    <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400 shrink-0" />
                        <span>{item.event_date}</span>
                    </span>
                )}
                {item.event_time && (
                    <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400 shrink-0" />
                        <span>{item.event_time}{item.end_time ? ` → ${item.end_time}` : ''}</span>
                    </span>
                )}
                <span className="flex items-center gap-1.5 text-purple-600 font-semibold">
                    <Users size={13} className="text-purple-500 shrink-0" />
                    <span>{item.attendees || 0} Attendees</span>
                </span>
                {isRegistrationEvent(item) && (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <Users size={13} className="text-emerald-500 shrink-0" />
                        <span>{item.registeredCount || 0}{item.capacity ? `/${item.capacity}` : ''} Registered</span>
                    </span>
                )}
                {item.avgRating && (
                    <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                        <Star size={13} className="text-amber-500 fill-amber-500 shrink-0" />
                        <span>{item.avgRating} {item.feedbackCount ? `(${item.feedbackCount})` : ''}</span>
                    </span>
                )}
            </div>

            {/* Audience tag at bottom */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                <Users size={13} className="text-gray-400 shrink-0" />
                {item.audience_type === 'peer_facilitators' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Peer Facilitators Only
                    </span>
                ) : (
                    <span>{getAudienceModeLabel(item)}</span>
                )}
            </div>
        </div>
    );
};

const EventListSection = ({
    eventFilter, events, archivedEvents, canArchiveRecords, handleEditEvent, onOpenExtend, onOpenReschedule, handleViewAttendees, handleViewAbsent, handleViewRegistrants, handleViewFeedback, setDetailEvent, handleDeleteEvent, evaluations, handleBuildEvaluation, handleViewEvaluationResults,
    displayItems: explicitDisplayItems, isArchivedTab: explicitIsArchivedTab
}: any) => {
    const isArchivedTab = explicitIsArchivedTab !== undefined ? explicitIsArchivedTab : eventFilter === 'Archived';
    const displayItems = explicitDisplayItems !== undefined ? explicitDisplayItems : (
        isArchivedTab
            ? (archivedEvents || [])
            : (events || []).filter((item: SystemEvent) => eventFilter === 'All Items' || isVisibleForStaffFilter(item, eventFilter))
    );

    if (displayItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200/60 flex items-center justify-center text-gray-400 mb-3 shadow-xs">
                    <Calendar size={22} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">
                    No active events or announcements found.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {displayItems.map((item: SystemEvent) => (
                item.type === 'Announcement' ? (
                    <AnnouncementCard
                        key={item.id}
                        item={item}
                        isArchived={isArchivedTab}
                        canArchiveRecords={canArchiveRecords}
                        handleEditEvent={handleEditEvent}
                        handleDeleteEvent={handleDeleteEvent}
                        setDetailEvent={setDetailEvent}
                    />
                ) : (
                    <ActivityCard
                        key={item.id}
                        item={item}
                        isArchived={isArchivedTab}
                        canArchiveRecords={canArchiveRecords}
                        handleEditEvent={handleEditEvent}
                        handleDeleteEvent={handleDeleteEvent}
                        onOpenExtend={onOpenExtend}
                        onOpenReschedule={onOpenReschedule}
                        handleViewAttendees={handleViewAttendees}
                        handleViewAbsent={handleViewAbsent}
                        handleViewRegistrants={handleViewRegistrants}
                        handleViewFeedback={handleViewFeedback}
                        setDetailEvent={setDetailEvent}
                        evaluations={evaluations}
                        handleBuildEvaluation={handleBuildEvaluation}
                        handleViewEvaluationResults={handleViewEvaluationResults}
                    />
                )
            ))}
        </div>
    );
};

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
        handleRescheduleEvent,
        handleVoidAttendance,
        applyScheduleField,
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
    const [resultsTarget, setResultsTarget] = useState<{ formId: number; title: string; eventDate?: string | null; isPeerEvent?: boolean } | null>(null);
    const [extendTarget, setExtendTarget] = useState<any>(null);
    const [extendDate, setExtendDate] = useState('');
    const [rescheduleTarget, setRescheduleTarget] = useState<SystemEvent | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleStartTime, setRescheduleStartTime] = useState('');
    const [rescheduleEndTime, setRescheduleEndTime] = useState('');

    const onOpenExtend = (item: any) => {
        setExtendTarget(item);
        setExtendDate(suggestExtendDate(item.event_date || '', item.end_time || ''));
    };

    const onOpenReschedule = (item: SystemEvent) => {
        setRescheduleTarget(item);
        setRescheduleDate(item.event_date || '');
        setRescheduleStartTime(item.event_time || '');
        setRescheduleEndTime(item.end_time || '');
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
        if (existing) {
            setResultsTarget({
                formId: existing.form.id,
                title: event.title,
                eventDate: event.event_date,
                isPeerEvent: event.audience_type === 'peer_facilitators'
            });
        }
    };

    const [currentPage, setCurrentPage] = useState(1);

    const eventTabs = [
        { id: 'All Items', label: 'All Items', count: events.length },
        { id: 'Activities', label: 'Activities', count: events.filter((item) => isVisibleForStaffFilter(item, 'Activities')).length },
        { id: 'Announcements', label: 'Announcements', count: events.filter((item) => isVisibleForStaffFilter(item, 'Announcements')).length },
        { id: 'Archived', label: 'Archived', count: archivedEvents.length }
    ];

    const isArchivedTab = eventFilter === 'Archived';
    const filteredEvents = isArchivedTab
        ? archivedEvents
        : events.filter((item: SystemEvent) => eventFilter === 'All Items' || isVisibleForStaffFilter(item, eventFilter));

    const totalEvents = filteredEvents.length;
    const totalPages = Math.max(1, Math.ceil(totalEvents / EVENTS_PAGE_SIZE));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startItem = totalEvents === 0 ? 0 : (safePage - 1) * EVENTS_PAGE_SIZE + 1;
    const endItem = Math.min(safePage * EVENTS_PAGE_SIZE, totalEvents);
    const paginatedEvents = filteredEvents.slice((safePage - 1) * EVENTS_PAGE_SIZE, safePage * EVENTS_PAGE_SIZE);

    return (
        <>
            <div className="flex h-full min-h-0 flex-col gap-4">
                {/* Header Banner (Dark Gradient) */}
                <div
                    style={{ background: 'linear-gradient(135deg, #1e0f40 0%, #2d1b69 100%)' }}
                    className="rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-md border border-purple-900/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0"
                >
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Events &amp; Announcements</h1>
                        <p className="mt-1 text-xs md:text-sm font-medium text-purple-300/70">Manage campus activities and broadcast official notices.</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Refresh Data */}
                        <button
                            type="button"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            <RefreshCw size={14} className={isRefreshingData ? 'animate-spin' : ''} />
                            <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                        </button>

                        {/* Evaluation Templates */}
                        <button
                            type="button"
                            onClick={() => setShowTemplatesModal(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm cursor-pointer"
                        >
                            <ClipboardList size={14} />
                            <span>Evaluation Templates</span>
                        </button>

                        {/* + Create New */}
                        <button
                            type="button"
                            onClick={() => {
                                setEditingEventId(null);
                                setNewEvent(createEmptyEvent());
                                setShowEventModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold transition-all duration-200 hover:shadow-md cursor-pointer"
                        >
                            <Plus size={14} className="stroke-[2.5]" />
                            <span>Create New</span>
                        </button>
                    </div>
                </div>

                {/* White Toolbar */}
                <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 px-5 md:px-6 py-3 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-full">
                        {eventTabs.map((tab) => {
                            const isActive = eventFilter === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => {
                                        setEventFilter(tab.id);
                                        setCurrentPage(1);
                                    }}
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-150 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                                        isActive
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {tab.id === 'Archived' && (
                                        <Archive size={13} className={isActive ? 'text-white' : 'text-gray-400'} />
                                    )}
                                    <span>{tab.label}</span>
                                    <span
                                        className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <span className="text-xs font-semibold text-gray-400 shrink-0 self-end sm:self-auto">
                        {eventFilter === 'Archived' ? `Archived: ${archivedEvents.length}` : `Active: ${events.length}`}
                    </span>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                    <EventListSection
                        eventFilter={eventFilter}
                        events={events}
                        archivedEvents={archivedEvents}
                        displayItems={paginatedEvents}
                        isArchivedTab={isArchivedTab}
                        canArchiveRecords={canArchiveRecords}
                        handleEditEvent={handleEditEvent}
                        onOpenExtend={onOpenExtend}
                        onOpenReschedule={onOpenReschedule}
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

                {/* Pagination Container */}
                <div className="bg-white border border-slate-200/80 rounded-2xl md:rounded-3xl px-5 md:px-6 py-3 flex items-center justify-between text-xs text-gray-500 shrink-0 shadow-xs">
                    <div>
                        Showing <span className="font-bold text-gray-900">{totalEvents === 0 ? 0 : `${startItem}–${endItem}`}</span> of <span className="font-bold text-gray-900">{totalEvents}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                            disabled={isRefreshingData || safePage <= 1}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-semibold text-gray-700 px-1">
                            {safePage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                            disabled={isRefreshingData || safePage >= totalPages}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                            aria-label="Next page"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
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
                    applyScheduleField={applyScheduleField}
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
                    handleVoidAttendance={handleVoidAttendance}
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
                    isPeerEvent={evaluationTarget.event.audience_type === 'peer_facilitators'}
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
                    isPeerEvent={resultsTarget.isPeerEvent}
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
                                min={nowCloseDate()}
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

            {rescheduleTarget && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Reschedule event</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {rescheduleTarget.title} &mdash; move the date and time. Rescheduling resets the attendance close date to 3 days after the new end time.
                            </p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label htmlFor="reschedule-date" className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                                    <input id="reschedule-date" type="date" required className="w-full border rounded-lg p-2 text-sm" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor="reschedule-start-time" className="block text-xs font-bold text-gray-500 mb-1">Start time</label>
                                    <input id="reschedule-start-time" type="time" required className="w-full border rounded-lg p-2 text-sm" value={rescheduleStartTime} onChange={e => setRescheduleStartTime(e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor="reschedule-end-time" className="block text-xs font-bold text-gray-500 mb-1">End time</label>
                                    <input id="reschedule-end-time" type="time" className="w-full border rounded-lg p-2 text-sm" value={rescheduleEndTime} onChange={e => setRescheduleEndTime(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button variant="secondary" className="flex-1" onClick={() => setRescheduleTarget(null)}>Cancel</Button>
                                <Button
                                    className="flex-1"
                                    onClick={async () => {
                                        await handleRescheduleEvent(rescheduleTarget, {
                                            event_date: rescheduleDate,
                                            event_time: rescheduleStartTime,
                                            end_time: rescheduleEndTime
                                        });
                                        setRescheduleTarget(null);
                                    }}
                                >
                                    Reschedule
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

