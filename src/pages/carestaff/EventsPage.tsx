import React, { useState, useEffect } from 'react';
import {
    Plus, Calendar, Clock, MapPin, Users, Star, XCircle, Download, CheckCircle, Archive, RefreshCw
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { managedArchiveService } from '../../services/managedArchiveService';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/dashboardUtils';
import { useEventsData } from '../../hooks/useEventsData';
import { SystemEvent } from '../../types/models';
import { getCoursesWithDepartments, getDepartments } from '../../services/careStaffService';
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
} from '../../utils/eventAudience';
import type { CareStaffDashboardFunctions } from './types';

interface EventsPageProps {
    functions?: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

const EVENT_ATTENDANCE_COLUMNS = 'id, event_id, student_id, student_name, checked_in_at, time_in, time_out, proof_url, latitude, longitude, department';
const EVENT_REGISTRATION_COLUMNS = 'id, event_id, student_id, student_name, email, department, course, year_level, section, status, registered_at, cancelled_at, updated_at';
const EVENT_FEEDBACK_COLUMNS = [
    'id',
    'event_id',
    'student_id',
    'student_name',
    'sex',
    'college',
    'date_of_activity',
    'rating',
    'feedback',
    'q1_score',
    'q2_score',
    'q3_score',
    'q4_score',
    'q5_score',
    'q6_score',
    'q7_score',
    'open_best',
    'open_suggestions',
    'open_comments',
    'submitted_at'
].join(', ');

const createEmptyEvent = (): Partial<SystemEvent> => ({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    end_time: '',
    location: '',
    latitude: '',
    longitude: '',
    type: 'Event',
    participation_mode: 'general_attendance',
    audience_type: 'all_students',
    audience_departments: [],
    audience_courses: [],
    audience_year_levels: [],
    audience_sections: [],
    attendance_required: false,
    allow_walk_ins: true,
    capacity: null,
    registration_deadline: ''
});

const getEventTypeBadgeClass = (type: unknown) => {
    if (type === 'Announcement') return 'bg-purple-100 text-purple-700';
    if (type === 'Seminar') return 'bg-emerald-100 text-emerald-700';
    if (type === 'Orientation') return 'bg-orange-100 text-orange-700';
    if (type === 'Meeting') return 'bg-slate-100 text-slate-700';
    return 'bg-blue-100 text-blue-700';
};

const getArchivedEventTypeBadgeClass = (type: unknown) =>
    getEventTypeBadgeClass(type).replace('100', '50').replace('700', '500');

const toggleStringValue = (values: string[] | undefined, value: string) => {
    const current = cleanAudienceValues(values || []);
    return current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
};

const isVisibleForStaffFilter = (item: SystemEvent, filter: string) => {
    if (filter === 'Activities') return isAttendanceActivityType(item.type);
    if (filter === 'Announcements') return item.type === 'Announcement';
    return true;
};

const getAudienceModeLabel = (event: SystemEvent) => {
    const audienceType = getEventAudienceType(event);
    if (audienceType === 'all_students') return 'All students';
    if (audienceType === 'graduating_students') return 'Graduating students';
    return 'Selected students';
};

const getAudienceBulletItems = (event: SystemEvent) => {
    const audienceType = getEventAudienceType(event);
    if (audienceType === 'all_students') {
        return ['All students'];
    }

    const items: string[] = [];
    const departments = getAudienceValues(event, 'audience_departments');
    const courses = getAudienceValues(event, 'audience_courses');
    const yearLevels = getAudienceValues(event, 'audience_year_levels');
    const sections = getAudienceValues(event, 'audience_sections');

    if (audienceType === 'graduating_students') items.push('Graduating students');
    if (departments.length > 0) items.push(`Departments: ${departments.join(', ')}`);
    if (courses.length > 0) items.push(`Courses: ${courses.join(', ')}`);
    if (yearLevels.length > 0) items.push(`Year levels: ${yearLevels.join(', ')}`);
    if (sections.length > 0) items.push(`Sections: ${sections.join(', ')}`);

    return items.length > 0 ? items : ['Selected students'];
};

const isRegistrationEvent = (event: SystemEvent | Partial<SystemEvent> | null | undefined) =>
    event?.participation_mode === 'registration_required';

const formatRegistrationDeadline = (value: unknown) => {
    if (!value) return 'No deadline';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

const toDatetimeLocalInput = (value: unknown) => {
    if (!value) return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const getEventEndDate = (event: SystemEvent | null | undefined) => {
    if (!event?.event_date) return null;
    const timeValue = String(event.end_time || event.event_time || '23:59').slice(0, 8);
    const date = new Date(`${event.event_date}T${timeValue}`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getRegistrationAttendanceStatus = (event: SystemEvent | null, registration: any, attendance?: any) => {
    if (registration?.status === 'Cancelled') return 'Cancelled';
    if (attendance?.time_in || registration?.status === 'Attended') return 'Attended';
    if (registration?.status === 'Absent') return 'Absent';

    const eventEndDate = getEventEndDate(event);
    if (eventEndDate && Date.now() > eventEndDate.getTime()) return 'Absent';

    return 'Registered';
};

const getRegistrationStatusClass = (status: string) => {
    if (status === 'Attended') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Absent') return 'bg-red-100 text-red-700';
    if (status === 'Cancelled') return 'bg-slate-100 text-slate-500';
    return 'bg-blue-100 text-blue-700';
};

const EventsPage = ({ functions }: EventsPageProps) => {
    const { showToast } = functions || {};
    const { canPerformAction } = usePermissions();
    const canArchiveRecords = canPerformAction('archive_records');

    // Filter States
    const [eventFilter, setEventFilter] = useState('All Items');
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Data States from Custom Hook
    const { events, archivedEvents, refetchEvents: fetchEvents } = useEventsData();

    // UI/Modal States
    const [showEventModal, setShowEventModal] = useState(false);
    const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
    const [showAttendeesModal, setShowAttendeesModal] = useState(false);
    const [showRegistrantsModal, setShowRegistrantsModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [detailEvent, setDetailEvent] = useState<SystemEvent | null>(null);

    // Target Item States
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    const [newEvent, setNewEvent] = useState<Partial<SystemEvent>>(createEmptyEvent());
    const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
    const [courseOptions, setCourseOptions] = useState<string[]>([]);

    // Associated Data States (Attendees, Feedback)
    const [attendees, setAttendees] = useState<any[]>([]);
    const [expectedStudents, setExpectedStudents] = useState<any[]>([]);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [feedbackList, setFeedbackList] = useState<any[]>([]);
    const [selectedEventTitle, setSelectedEventTitle] = useState<string>('');
    const [selectedAttendanceEvent, setSelectedAttendanceEvent] = useState<SystemEvent | null>(null);
    const [selectedRegistrationEvent, setSelectedRegistrationEvent] = useState<SystemEvent | null>(null);

    // Attendee Filters
    const [attendeeFilter, setAttendeeFilter] = useState('All');
    const [yearLevelFilter, setYearLevelFilter] = useState('All');
    const [attendeeCourseFilter, setAttendeeCourseFilter] = useState('All');
    const [attendeeSectionFilter, setAttendeeSectionFilter] = useState('All');
    const [registrantStatusFilter, setRegistrantStatusFilter] = useState('All');

    useEffect(() => {
        const loadAudienceOptions = async () => {
            try {
                const [departments, courses] = await Promise.all([
                    getDepartments(),
                    getCoursesWithDepartments()
                ]);
                setDepartmentOptions((departments || []).map((dept: any) => String(dept.name || '')).filter(Boolean));
                setCourseOptions((courses || []).map((course: any) => String(course.name || '')).filter(Boolean));
            } catch (error) {
                console.error('Failed to load event audience options.', error);
            }
        };

        void loadAudienceOptions();
    }, []);

    // Handlers
    const createEvent = async (e: any) => {
        e.preventDefault();
        try {
            const isAttendanceActivity = isAttendanceActivityType(newEvent.type);
            const audienceType = isAttendanceActivity ? getEventAudienceType(newEvent) : 'all_students';
            const participationMode = isAttendanceActivity
                ? (newEvent.participation_mode || 'general_attendance')
                : 'general_attendance';
            const capacityValue = Number(newEvent.capacity || 0);
            const payload = {
                title: newEvent.title,
                type: newEvent.type,
                description: newEvent.description,
                location: isAttendanceActivity ? newEvent.location : 'Online/General',
                event_date: newEvent.event_date,
                event_time: isAttendanceActivity ? (newEvent.event_time || null) : null,
                end_time: isAttendanceActivity ? (newEvent.end_time || null) : null,
                latitude: isAttendanceActivity ? (newEvent.latitude || null) : null,
                longitude: isAttendanceActivity ? (newEvent.longitude || null) : null,
                participation_mode: participationMode,
                audience_type: audienceType,
                audience_departments: audienceType === 'all_students' ? [] : cleanAudienceValues(newEvent.audience_departments || []),
                audience_courses: audienceType === 'all_students' ? [] : cleanAudienceValues(newEvent.audience_courses || []),
                audience_year_levels: audienceType === 'all_students' ? [] : cleanAudienceValues(newEvent.audience_year_levels || []),
                audience_sections: audienceType === 'all_students' ? [] : cleanAudienceValues(newEvent.audience_sections || []),
                attendance_required: isAttendanceActivity ? Boolean(newEvent.attendance_required) : false,
                allow_walk_ins: participationMode === 'registration_required' ? Boolean(newEvent.allow_walk_ins) : true,
                capacity: participationMode === 'registration_required' && Number.isFinite(capacityValue) && capacityValue > 0
                    ? capacityValue
                    : null,
                registration_deadline: participationMode === 'registration_required' && newEvent.registration_deadline
                    ? newEvent.registration_deadline
                    : null,
                is_archived: false
            };

            if (editingEventId) {
                const { error } = await supabase.from('events').update(payload).eq('id', editingEventId);
                if (error) throw error;
                if (showToast) showToast('Changes saved.');
            } else {
                const { error } = await supabase.from('events').insert([payload]);
                if (error) throw error;
                if (showToast) showToast('Changes saved.');
            }
            setShowEventModal(false);
            setEditingEventId(null);
            setNewEvent(createEmptyEvent());
            await fetchEvents();
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
            longitude: item.longitude || '',
            participation_mode: item.participation_mode || 'general_attendance',
            audience_type: item.audience_type || 'all_students',
            audience_departments: item.audience_departments || [],
            audience_courses: item.audience_courses || [],
            audience_year_levels: item.audience_year_levels || [],
            audience_sections: item.audience_sections || [],
            attendance_required: Boolean(item.attendance_required),
            allow_walk_ins: item.allow_walk_ins ?? true,
            capacity: item.capacity || null,
            registration_deadline: toDatetimeLocalInput(item.registration_deadline || '')
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
            await managedArchiveService.archiveEvent(eventToDelete);
            if (showToast) showToast('Item archived.');
            setShowDeleteEventModal(false);
            setEventToDelete(null);
            await fetchEvents();
        } catch (err: any) {
            if (showToast) showToast(err.message, 'error');
            setShowDeleteEventModal(false);
            setEventToDelete(null);
        }
    };

    const handleViewAttendees = async (item: SystemEvent) => {
        setSelectedEventTitle(item.title);
        setSelectedAttendanceEvent(item);
        try {
            const { data, error } = await supabase.from('event_attendance').select(EVENT_ATTENDANCE_COLUMNS).eq('event_id', item.id).order('time_in', { ascending: false });
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

            let expected: any[] = [];
            const shouldLoadExpectedStudents = isAttendanceActivityType(item.type)
                && (Boolean(item.attendance_required) || getEventAudienceType(item) !== 'all_students');
            if (shouldLoadExpectedStudents) {
                let expectedQuery: any = supabase
                    .from('students')
                    .select('student_id, first_name, middle_name, last_name, suffix, email, department, course, year_level, section, status')
                    .eq('is_archived', false)
                    .eq('status', 'Active');

                expectedQuery = applyEventAudienceQuery(expectedQuery, item);
                const { data: expectedData, error: expectedError } = await expectedQuery.order('last_name', { ascending: true });
                if (expectedError) throw expectedError;
                expected = expectedData || [];
            }

            setAttendees(enriched);
            setExpectedStudents(expected);
            setShowAttendeesModal(true);
            setYearLevelFilter('All');
            setAttendeeCourseFilter('All');
            setAttendeeSectionFilter('All');
        } catch (err: any) {
            if (showToast) showToast(err.message, 'error');
        }
    };

    const handleViewRegistrants = async (item: SystemEvent) => {
        setSelectedEventTitle(item.title);
        setSelectedRegistrationEvent(item);
        try {
            const [
                { data: registrationData, error: registrationError },
                { data: attendanceData, error: attendanceError }
            ] = await Promise.all([
                supabase
                    .from('event_registrations')
                    .select(EVENT_REGISTRATION_COLUMNS)
                    .eq('event_id', item.id)
                    .order('registered_at', { ascending: false }),
                supabase
                    .from('event_attendance')
                    .select(EVENT_ATTENDANCE_COLUMNS)
                    .eq('event_id', item.id)
            ]);

            if (registrationError) throw registrationError;
            if (attendanceError) throw attendanceError;

            const attendanceByStudentId = new Map(
                (attendanceData || []).map((attendance: any) => [String(attendance.student_id || ''), attendance])
            );
            const enriched = (registrationData || []).map((registration: any) => {
                const attendance = attendanceByStudentId.get(String(registration.student_id || ''));
                return {
                    ...registration,
                    attendance,
                    attendance_status: getRegistrationAttendanceStatus(item, registration, attendance)
                };
            });

            setRegistrations(enriched);
            setRegistrantStatusFilter('All');
            setShowRegistrantsModal(true);
        } catch (err: any) {
            if (showToast) showToast(err.message, 'error');
        }
    };

    const handleViewFeedback = async (item: SystemEvent) => {
        setSelectedEventTitle(item.title);
        try {
            const { data, error } = await supabase.from('event_feedback').select(EVENT_FEEDBACK_COLUMNS).eq('event_id', item.id).order('submitted_at', { ascending: false });
            if (error) throw error;
            setFeedbackList(data || []);
            setShowFeedbackModal(true);
        } catch (err: any) {
            if (showToast) showToast(err.message, 'error');
        }
    };

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await fetchEvents();
            showToast?.('Events refreshed.', 'success');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            if (showToast) showToast("Your browser doesn't support location services.", 'error');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewEvent((prev: any) => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                if (showToast) showToast("Location retrieved!");
            },
            (err) => {
                if (showToast) showToast("Unable to retrieve location: ", 'error');
            }
        );
    };

    const renderAudienceCheckboxGroup = (
        label: string,
        field: 'audience_departments' | 'audience_courses' | 'audience_year_levels' | 'audience_sections',
        options: string[],
        formatLabel = (value: string) => value
    ) => {
        if (options.length === 0) return null;
        const selectedValues = cleanAudienceValues((newEvent[field] as string[]) || []);

        return (
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">{label}</label>
                <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {options.map((option) => (
                        <label key={option} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(option)}
                                onChange={() => setNewEvent({
                                    ...newEvent,
                                    [field]: toggleStringValue(selectedValues, option)
                                })}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="truncate">{formatLabel(option)}</span>
                        </label>
                    ))}
                </div>
            </div>
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
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 shadow-sm hover:text-purple-600 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />
                            <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                        </button>
                        <button
                            onClick={() => {
                                setEditingEventId(null);
                                setNewEvent(createEmptyEvent());
                                setShowEventModal(true);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-purple-200 hover:scale-[1.02] transition-all duration-300">
                            <Plus size={14} /> Create New
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        {['All Items', 'Activities', 'Announcements', 'Archived'].map(tab => (
                            <button key={tab} onClick={() => setEventFilter(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${eventFilter === tab ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-700'}`}>
                                {tab === 'Archived' && <Archive size={14} />}
                                {tab}
                                {tab === 'Archived' && archivedEvents.length > 0 && (
                                    <span className="ml-1 bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{archivedEvents.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-md border border-gray-200">
                        {eventFilter === 'Archived' ? `Archived: ${archivedEvents.length}` : `Active: ${events.length}`}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Active Events */}
                    {eventFilter !== 'Archived' && events
                        .filter(i => eventFilter === 'All Items' || isVisibleForStaffFilter(i, eventFilter))
                        .map(item => (
                            <div key={item.id} onClick={() => setDetailEvent(item)} className="card-hover bg-white/80 backdrop-blur-sm border border-gray-100/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start gap-4 relative overflow-hidden group cursor-pointer">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getEventTypeBadgeClass(item.type)}`}>{item.type}</span>
                                        {isAttendanceActivityType(item.type) && item.attendance_required && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Required</span>}
                                        {isRegistrationEvent(item) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Registration</span>}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                                    <p className="mt-2 max-w-5xl whitespace-pre-wrap break-words text-sm leading-6 text-gray-600 line-clamp-2">
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
                                        <div className="mt-3 max-w-5xl rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700">
                                            <div className="flex items-start gap-2">
                                                <Users size={13} className="mt-0.5 shrink-0 text-slate-500" />
                                                <span className="min-w-0 break-words">{getAudienceModeLabel(item)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                                    {isAttendanceActivityType(item.type) && (
                                        <>
                                            <button onClick={() => item.id && handleViewFeedback(item)} className="p-2 border rounded text-xs flex items-center gap-1 hover:bg-gray-50 flex-1 justify-center"><Star size={14} className="text-yellow-500" /> Reviews ({item.feedbackCount || 0})</button>
                                            {isRegistrationEvent(item) && <button onClick={() => item.id && handleViewRegistrants(item)} className="p-2 border rounded text-xs flex items-center gap-1 hover:bg-gray-50 flex-1 justify-center"><Users size={14} className="text-emerald-500" /> Registrants ({item.registeredCount || 0})</button>}
                                            <button onClick={() => item.id && handleViewAttendees(item)} className="p-2 border rounded text-xs flex items-center gap-1 hover:bg-gray-50 flex-1 justify-center"><Users size={14} className="text-blue-500" /> Attendees ({item.attendees || 0})</button>
                                        </>
                                    )}
                                    <button onClick={() => handleEditEvent(item)} className="p-2 border rounded text-xs text-blue-600 hover:bg-blue-50"><CheckCircle size={14} /></button>
                                    {canArchiveRecords && (
                                        <button onClick={() => item.id && handleDeleteEvent(item.id)} className="p-2 border rounded text-xs text-amber-700 hover:bg-amber-50"><Archive size={14} /></button>
                                    )}
                                </div>
                            </div>
                        ))}

                    {/* Archived Events */}
                    {eventFilter === 'Archived' && archivedEvents.map(item => (
                        <div key={item.id} onClick={() => setDetailEvent(item)} className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start gap-4 relative overflow-hidden opacity-75 hover:opacity-100 transition-opacity cursor-pointer">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-300 to-gray-400" />
                            <div className="min-w-0 flex-1">
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
                            <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                                {isAttendanceActivityType(item.type) && (
                                    <>
                                        <button onClick={() => item.id && handleViewFeedback(item)} className="p-2 border border-gray-200 rounded text-xs flex items-center gap-1 hover:bg-gray-100 flex-1 justify-center text-gray-500"><Star size={14} className="text-yellow-400" /> Reviews ({item.feedbackCount || 0})</button>
                                        {isRegistrationEvent(item) && <button onClick={() => item.id && handleViewRegistrants(item)} className="p-2 border border-gray-200 rounded text-xs flex items-center gap-1 hover:bg-gray-100 flex-1 justify-center text-gray-500"><Users size={14} className="text-emerald-400" /> Registrants ({item.registeredCount || 0})</button>}
                                        <button onClick={() => item.id && handleViewAttendees(item)} className="p-2 border border-gray-200 rounded text-xs flex items-center gap-1 hover:bg-gray-100 flex-1 justify-center text-gray-500"><Users size={14} className="text-blue-400" /> Attendees ({item.attendees || 0})</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}

                    {eventFilter !== 'Archived' && events.filter(i => eventFilter === 'All Items' || isVisibleForStaffFilter(i, eventFilter)).length === 0 && <div className="text-center py-8 text-gray-400">No active events or announcements found.</div>}
                    {eventFilter === 'Archived' && archivedEvents.length === 0 && <div className="text-center py-8 text-gray-400">No archived events yet.</div>}
                </div>
            </div>

            {/* Event Modal - Enhanced for Create/Edit */}
            {showEventModal && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
                        <div className="px-6 py-5 sm:px-8 border-b bg-gradient-to-r from-gray-50 to-purple-50/30 flex justify-between items-center">
                            <h3 className="font-bold text-lg gradient-text">{editingEventId ? 'Edit Item' : 'Create New Item'}</h3>
                            <button onClick={() => { setShowEventModal(false); setEditingEventId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 sm:p-8 overflow-y-auto">
                            <form onSubmit={createEvent} className="space-y-5">
                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                                    <select
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
                                    <div className="lg:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Title</label><input required className="w-full border rounded-lg p-2 text-sm" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="e.g., Campus Fair 2026" /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Description</label><textarea required className="w-full resize-y rounded-xl border border-gray-200 bg-slate-50/60 p-4 text-sm leading-6 text-gray-700 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-2 focus:ring-purple-100" rows={5} value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Details..." /></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Date</label><input type="date" required className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_date} onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })} /></div>
                                    {isAttendanceActivityType(newEvent.type) && (
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label><input type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_time} onChange={e => setNewEvent({ ...newEvent, event_time: e.target.value })} /></div>
                                    )}
                                </div>

                                {isAttendanceActivityType(newEvent.type) && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">End Time</label><input type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.end_time} onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })} /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Location</label><input className="w-full border rounded-lg p-2 text-sm" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="e.g., Main Gym" /></div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Mode</label>
                                                    <select
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
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Audience</label>
                                                    <select
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
                                                        <label className="block text-xs font-bold text-emerald-700 mb-1">Capacity</label>
                                                        <input
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
                                                        <label className="block text-xs font-bold text-emerald-700 mb-1">Registration Deadline</label>
                                                        <input
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
                const attendeeByStudentId = new Map(attendees.map((att: any) => [String(att.student_id || ''), att]));
                const absentStudents = expectedStudents.filter((student: any) => !attendeeByStudentId.has(String(student.student_id || '')));
                const attendanceRate = expectedStudents.length > 0
                    ? Math.round((attendees.length / expectedStudents.length) * 100)
                    : null;
                const studentName = (student: any) => [student.first_name, student.middle_name, student.last_name, student.suffix]
                    .map((part) => String(part || '').trim())
                    .filter(Boolean)
                    .join(' ');
                return (
                    <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b bg-gray-50 rounded-t-2xl">
                                <div className="flex justify-between items-center mb-3">
                                    <div><h3 className="font-bold text-lg">Attendees List</h3><p className="text-xs text-gray-500">{selectedEventTitle}</p></div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => {
                                            if (filtered.length === 0 && expectedStudents.length === 0) return;
                                            const headers = ['Student Name', 'Department', 'Course', 'Year Level', 'Section', 'Time In', 'Time Out', 'Status'];
                                            const rows = expectedStudents.length > 0
                                                ? expectedStudents.map((student: any) => {
                                                    const attendance = attendeeByStudentId.get(String(student.student_id || ''));
                                                    return [
                                                        attendance?.student_name || studentName(student),
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
                                        }} disabled={filtered.length === 0 && expectedStudents.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50">
                                            <Download size={14} /> Export Excel
                                        </button>
                                        <button onClick={() => { setShowAttendeesModal(false); setAttendeeFilter('All'); setYearLevelFilter('All'); setAttendeeCourseFilter('All'); setAttendeeSectionFilter('All'); setExpectedStudents([]); setSelectedAttendanceEvent(null); }}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs mb-3">
                                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">{attendees.length} Total</span>
                                    <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold">{completedCount} Completed</span>
                                    <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-bold">{attendees.length - completedCount} Still In</span>
                                    {expectedStudents.length > 0 && <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">{expectedStudents.length} Expected</span>}
                                    {expectedStudents.length > 0 && <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold">{absentStudents.length} {selectedAttendanceEvent?.attendance_required ? 'Absent' : 'Not attended'}</span>}
                                    {attendanceRate !== null && <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">{attendanceRate}% Attendance</span>}
                                </div>
                                {selectedAttendanceEvent && expectedStudents.length > 0 && (
                                    <p className="mb-3 text-xs font-semibold text-gray-500">Audience: {getAudienceLabel(selectedAttendanceEvent)}</p>
                                )}
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
                                {expectedStudents.length > 0 && absentStudents.length > 0 && (
                                    <div className="border-t border-gray-100 bg-red-50/40 p-5">
                                        <h4 className="mb-3 text-xs font-bold uppercase text-red-700">
                                            {selectedAttendanceEvent?.attendance_required ? 'Absent Students' : 'Expected Students Not Yet Attended'}
                                        </h4>
                                        <div className="max-h-56 overflow-y-auto rounded-xl border border-red-100 bg-white">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-red-50 text-red-700"><tr><th className="px-4 py-2">Student</th><th className="px-4 py-2">Course</th><th className="px-4 py-2">Year / Sec</th></tr></thead>
                                                <tbody className="divide-y divide-red-50">
                                                    {absentStudents.map((student: any) => (
                                                        <tr key={student.student_id}>
                                                            <td className="px-4 py-2"><p className="font-bold text-gray-800">{studentName(student)}</p><p className="text-[10px] text-gray-500">{student.student_id} | {student.department || '-'}</p></td>
                                                            <td className="px-4 py-2 text-gray-600">{student.course || '-'}</td>
                                                            <td className="px-4 py-2 text-gray-600">{student.year_level || '-'}{student.section ? ` - ${student.section}` : ''}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Registrants Modal */}
            {showRegistrantsModal && (() => {
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
                const statusOptions = ['All', 'Registered', 'Attended', 'Absent', 'Cancelled'];

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
                                        <button
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
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
                                        >
                                            <Download size={14} /> Export Excel
                                        </button>
                                        <button onClick={() => { setShowRegistrantsModal(false); setRegistrations([]); setSelectedRegistrationEvent(null); setRegistrantStatusFilter('All'); }}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
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
                                    {statusOptions.map((status) => (
                                        <button
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
            })()}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4">
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

            {detailEvent && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setDetailEvent(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden animate-scale-in flex flex-col" onClick={(event) => event.stopPropagation()}>
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
                            <button onClick={() => setDetailEvent(null)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 sm:p-8 space-y-5 overflow-y-auto">
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
                            <button onClick={() => setDetailEvent(null)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteEventModal && canArchiveRecords && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center animate-scale-in">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><Archive size={32} /></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Archive Item</h3>
                        <p className="text-gray-500 mb-6">Are you sure you want to archive this event or announcement? Attendance and feedback history stay intact.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteEventModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition">Cancel</button>
                            <button onClick={confirmDeleteEvent} className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition shadow-md">Yes, Archive</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EventsPage;
