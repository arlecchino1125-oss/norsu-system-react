import React, { useState, useEffect } from 'react';
import {
    Plus, Calendar, Clock, MapPin, Users, Star, XCircle, Download, CheckCircle, Archive, RefreshCw
} from 'lucide-react';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { supabase } from '../../../../../lib/supabase';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { Button } from '../../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../../components/ui/Card';
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


export interface CareStaffEventsPageProps {
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

export const createEmptyEvent = (): Partial<SystemEvent> => ({
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

export const getEventTypeBadgeClass = (type: unknown) => {
    if (type === 'Announcement') return 'bg-purple-100 text-purple-700';
    if (type === 'Seminar') return 'bg-emerald-100 text-emerald-700';
    if (type === 'Orientation') return 'bg-orange-100 text-orange-700';
    if (type === 'Meeting') return 'bg-slate-100 text-slate-700';
    return 'bg-blue-100 text-blue-700';
};

export const getArchivedEventTypeBadgeClass = (type: unknown) =>
    getEventTypeBadgeClass(type).replace('100', '50').replace('700', '500');

const toggleStringValue = (values: string[] | undefined, value: string) => {
    const current = cleanAudienceValues(values || []);
    return current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
};

export const isVisibleForStaffFilter = (item: SystemEvent, filter: string) => {
    if (filter === 'Activities') return isAttendanceActivityType(item.type);
    if (filter === 'Announcements') return item.type === 'Announcement';
    return true;
};

export const getAudienceModeLabel = (event: SystemEvent) => {
    const audienceType = getEventAudienceType(event);
    if (audienceType === 'all_students') return 'All students';
    if (audienceType === 'graduating_students') return 'Graduating students';
    return 'Selected students';
};

export const getAudienceBulletItems = (event: SystemEvent) => {
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

export const isRegistrationEvent = (event: SystemEvent | Partial<SystemEvent> | null | undefined) =>
    event?.participation_mode === 'registration_required';

export const formatRegistrationDeadline = (value: unknown) => {
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

export const getRegistrationStatusClass = (status: string) => {
    if (status === 'Attended') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Absent') return 'bg-red-100 text-red-700';
    if (status === 'Cancelled') return 'bg-slate-100 text-slate-500';
    return 'bg-blue-100 text-blue-700';
};

export function useCareStaffEvents({ functions }: any) {
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
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [eventToDelete, setEventToDelete] = useState<number | null>(null);
    const [newEvent, setNewEvent] = useState<Partial<SystemEvent>>(() => createEmptyEvent());
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
                setDepartmentOptions((departments || []).flatMap((dept: any) => {
                    const name = String(dept.name || '');
                    return name ? [name] : [];
                }));
                setCourseOptions((courses || []).flatMap((course: any) => {
                    const name = String(course.name || '');
                    return name ? [name] : [];
                }));
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
            const latitudeValue = Number(newEvent.latitude);
            const longitudeValue = Number(newEvent.longitude);
            const payload = {
                title: newEvent.title,
                type: newEvent.type,
                description: newEvent.description,
                location: isAttendanceActivity ? newEvent.location : 'Online/General',
                event_date: newEvent.event_date,
                event_time: isAttendanceActivity ? (newEvent.event_time || null) : null,
                end_time: isAttendanceActivity ? (newEvent.end_time || null) : null,
                latitude: isAttendanceActivity && newEvent.latitude && Number.isFinite(latitudeValue) ? latitudeValue : null,
                longitude: isAttendanceActivity && newEvent.longitude && Number.isFinite(longitudeValue) ? longitudeValue : null,
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

    const handleDeleteEvent = async (id: number) => {
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
                const studentIds = [...new Set(enriched.flatMap((a: any) => a.student_id ? [a.student_id] : []))];
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
        const selectedValueSet = new Set(selectedValues);

        return (
            <div>
                <p className="block text-xs font-bold text-gray-500 mb-2">{label}</p>
                <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {options.map((option) => (
                        <label key={option} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={selectedValueSet.has(option)}
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

    return {
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
        showRegistrantsModal,
        setShowRegistrantsModal,
        showFeedbackModal,
        setShowFeedbackModal,
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
        handleDeleteEvent,
        confirmDeleteEvent,
        handleViewAttendees,
        handleViewRegistrants,
        handleViewFeedback,
        handleRefreshData,
        getCurrentLocation,
        renderAudienceCheckboxGroup
    };
}
