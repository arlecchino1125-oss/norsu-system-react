import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DEFAULT_PAGE_SIZE } from '../../types/pagination';
import { DEPT_SUPPORT_VISIBLE_STATUSES, SUPPORT_STATUS } from '../../utils/workflow';
import {
    getCounselingRequestsPage,
    getDepartmentApplicationsPage,
    getCourseDepartmentMap,
    getEventsPage,
    getStudentsPage,
    getSupportRequestsPage
} from '../../services/deptService';

export function useDeptData(session: any, isAuthenticated: boolean) {
    const [data, setData] = useState<any>(null);
    const [courseMap, setCourseMap] = useState<Record<string, string>>({});
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    const [supportRequests, setSupportRequests] = useState<any[]>([]);
    const [admissionApplicants, setAdmissionApplicants] = useState<any[]>([]);
    const [lastSeenSupportCount, setLastSeenSupportCount] = useState<number>(0);
    const [toast, setToast] = useState<any>(null);

    const [studentsPage, setStudentsPage] = useState(1);
    const [studentsPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [studentsTotal, setStudentsTotal] = useState(0);
    const [studentsError, setStudentsError] = useState<string | null>(null);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentFilters, setStudentFilters] = useState<any>({});

    const [counselingPage, setCounselingPage] = useState(1);
    const [counselingPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [counselingTotal, setCounselingTotal] = useState(0);
    const [counselingError, setCounselingError] = useState<string | null>(null);
    const [counselingLoading, setCounselingLoading] = useState(false);
    const [counselingFilters, setCounselingFilters] = useState<any>({});

    const [supportPage, setSupportPage] = useState(1);
    const [supportPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [supportTotal, setSupportTotal] = useState(0);
    const [supportError, setSupportError] = useState<string | null>(null);
    const [supportLoading, setSupportLoading] = useState(false);
    const [supportFilters, setSupportFilters] = useState<any>({});

    const [admissionsPage, setAdmissionsPage] = useState(1);
    const [admissionsPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [admissionsTotal, setAdmissionsTotal] = useState(0);
    const [admissionsError, setAdmissionsError] = useState<string | null>(null);
    const [admissionsLoading, setAdmissionsLoading] = useState(false);
    const [admissionsFilters, setAdmissionsFilters] = useState<any>({});

    const [eventsPage, setEventsPage] = useState(1);
    const [eventsPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [eventsTotal, setEventsTotal] = useState(0);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [eventsLoading, setEventsLoading] = useState(false);

    const showToastMessage = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const ensureCourseMap = async () => {
        if (Object.keys(courseMap).length > 0) {
            return courseMap;
        }

        const map = await getCourseDepartmentMap();
        setCourseMap(map);
        return map;
    };

    // Initialize Data from Session
    useEffect(() => {
        if (isAuthenticated && session) {
            setData({
                profile: {
                    name: session.full_name,
                    department: session.department || 'Unassigned',
                    email: session.email,
                    id: session.id
                },
                students: [],
                requests: [],
                settings: {
                    referralReasons: ['Academic Performance', 'Attendance Issues', 'Behavioral Concern', 'Career Guidance', 'Personal/Emotional'],
                    darkMode: false
                }
            });

            setStudentFilters({ department: session.department || 'Unassigned' });
            setCounselingFilters({ department: session.department || 'Unassigned' });
            setSupportFilters({ department: session.department || 'Unassigned' });
            setAdmissionsFilters({});
        }
    }, [isAuthenticated, session]);

    const refreshStudents = async () => {
        if (!data?.profile?.department) return;
        setStudentsLoading(true);
        setStudentsError(null);
        try {
            const map = await ensureCourseMap();

            const result = await getStudentsPage(
                { ...studentFilters, department: data.profile.department },
                { page: studentsPage, pageSize: studentsPageSize }
            );

            const mappedStudents = result.rows.map((student: any) => ({
                id: student.student_id,
                name: `${student.first_name} ${student.last_name}`.trim(),
                email: student.email || 'No Email',
                year: student.year_level,
                status: student.status,
                section: student.section,
                department: student.department || map[String(student.course || '').trim().toLowerCase()] || 'Unassigned',
                course: student.course,
                ...student
            }));

            setStudentsTotal(result.total);
            setData((prev: any) => ({ ...prev, students: mappedStudents, courseMap: map }));
        } catch (error: any) {
            setStudentsError(error.message || 'Failed to load students');
        } finally {
            setStudentsLoading(false);
        }
    };

    const refreshEvents = async () => {
        setEventsLoading(true);
        setEventsError(null);
        try {
            const result = await getEventsPage(
                { page: eventsPage, pageSize: eventsPageSize },
                { column: 'created_at', ascending: false }
            );
            // Filter out expired events for dept view
            const now = new Date();
            const todayStr = now.toISOString().slice(0, 10);
            const activeEvents = (result.rows || []).filter((ev: any) => {
                if (!ev.event_date) return true;
                if (ev.event_date < todayStr) return false;
                if (ev.event_date > todayStr) return true;
                // Same day — check end_time
                if (ev.end_time) {
                    const [h, m] = ev.end_time.split(':').map(Number);
                    if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) return false;
                }
                return true;
            });
            setEventsList(activeEvents);
            setEventsTotal(activeEvents.length);
        } catch (error: any) {
            setEventsError(error.message || 'Failed to load events');
        } finally {
            setEventsLoading(false);
        }
    };

    const refreshCounseling = async () => {
        if (!data?.profile?.department) return;
        setCounselingLoading(true);
        setCounselingError(null);
        try {
            const result = await getCounselingRequestsPage(
                { ...counselingFilters, department: data.profile.department },
                { page: counselingPage, pageSize: counselingPageSize },
                { column: 'created_at', ascending: false }
            );
            setCounselingRequests(result.rows);
            setCounselingTotal(result.total);
        } catch (error: any) {
            setCounselingError(error.message || 'Failed to load counseling requests');
        } finally {
            setCounselingLoading(false);
        }
    };

    const refreshSupport = async () => {
        if (!data?.profile?.department) return;
        setSupportLoading(true);
        setSupportError(null);
        try {
            const result = await getSupportRequestsPage(
                {
                    ...supportFilters,
                    department: data.profile.department,
                    status: [...DEPT_SUPPORT_VISIBLE_STATUSES]
                },
                { page: supportPage, pageSize: supportPageSize },
                { column: 'created_at', ascending: false }
            );
            setSupportRequests(result.rows);
            setSupportTotal(result.total);
        } catch (error: any) {
            setSupportError(error.message || 'Failed to load support requests');
        } finally {
            setSupportLoading(false);
        }
    };

    const refreshAdmissions = async () => {
        if (!data?.profile?.department) return;
        setAdmissionsLoading(true);
        setAdmissionsError(null);
        try {
            const result = await getDepartmentApplicationsPage(
                data.profile.department,
                admissionsFilters,
                { page: admissionsPage, pageSize: admissionsPageSize },
                { column: 'created_at', ascending: false }
            );

            setAdmissionApplicants(result.rows);
            setAdmissionsTotal(result.total);
        } catch (error: any) {
            setAdmissionsError(error.message || 'Failed to load admissions');
        } finally {
            setAdmissionsLoading(false);
        }
    };

    // Fetch paginated students (server-side)
    useEffect(() => {
        if (data?.profile?.department) {
            refreshStudents();
            const department = data.profile.department;
            const channel = supabase.channel('dept_students_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `department=eq.${department}` }, refreshStudents)
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [data?.profile?.department, studentsPage, studentsPageSize, JSON.stringify(studentFilters)]);

    // Dark Mode Effect
    useEffect(() => {
        if (data?.settings?.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [data?.settings?.darkMode]);

    // Fetch Events (paginated)
    useEffect(() => {
        refreshEvents();
        const channel = supabase.channel('dept_events_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, refreshEvents)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [eventsPage, eventsPageSize]);

    // Fetch Counseling Requests (paginated)
    useEffect(() => {
        if (!data?.profile?.department) return;
        refreshCounseling();
        const channel = supabase
            .channel('dept_counseling')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests', filter: `department=eq.${data.profile.department}` }, (payload: any) => {
                refreshCounseling();
                if (payload.eventType === 'INSERT') {
                    showToastMessage(`New Counseling Request Received`, 'info');
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [data?.profile?.department, counselingPage, counselingPageSize, JSON.stringify(counselingFilters)]);

    // Fetch Admissions Applicants (paginated)
    useEffect(() => {
        if (!data?.profile?.department) return;
        refreshAdmissions();
    }, [data?.profile?.department, admissionsPage, admissionsPageSize, JSON.stringify(admissionsFilters)]);

    // Fetch Support Requests (paginated)
    useEffect(() => {
        if (!data?.profile?.department) return;
        refreshSupport();
        const channel = supabase
            .channel('dept_support_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'support_requests',
                filter: `department=eq.${data.profile.department}`
            }, (payload: any) => {
                if (payload.new && payload.new.status === SUPPORT_STATUS.FORWARDED_TO_DEPT) {
                    showToastMessage("New Support Request Received", "success");
                }
                refreshSupport();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [data?.profile?.department, supportPage, supportPageSize, JSON.stringify(supportFilters)]);

    const refreshAllData = async () => {
        await Promise.all([
            refreshStudents(),
            refreshEvents(),
            refreshCounseling(),
            refreshSupport(),
            refreshAdmissions()
        ]);
    };

    return {
        data,
        setData,
        eventsList,
        counselingRequests,
        supportRequests,
        setSupportRequests,
        admissionApplicants,
        lastSeenSupportCount,
        setLastSeenSupportCount,
        toast,
        setToast,
        refreshAllData,
        showToastMessage,
        studentsState: {
            rows: data?.students || [],
            total: studentsTotal,
            page: studentsPage,
            pageSize: studentsPageSize,
            isLoading: studentsLoading,
            error: studentsError,
            setPage: setStudentsPage,
            setFilters: setStudentFilters,
            refresh: refreshStudents
        },
        counselingState: {
            rows: counselingRequests,
            total: counselingTotal,
            page: counselingPage,
            pageSize: counselingPageSize,
            isLoading: counselingLoading,
            error: counselingError,
            setPage: setCounselingPage,
            setFilters: setCounselingFilters,
            refresh: refreshCounseling
        },
        supportState: {
            rows: supportRequests,
            total: supportTotal,
            page: supportPage,
            pageSize: supportPageSize,
            isLoading: supportLoading,
            error: supportError,
            setPage: setSupportPage,
            setFilters: setSupportFilters,
            refresh: refreshSupport
        },
        admissionsState: {
            rows: admissionApplicants,
            total: admissionsTotal,
            page: admissionsPage,
            pageSize: admissionsPageSize,
            isLoading: admissionsLoading,
            error: admissionsError,
            setPage: setAdmissionsPage,
            setFilters: setAdmissionsFilters,
            refresh: refreshAdmissions
        },
        eventsState: {
            rows: eventsList,
            total: eventsTotal,
            page: eventsPage,
            pageSize: eventsPageSize,
            isLoading: eventsLoading,
            error: eventsError,
            setPage: setEventsPage,
            setFilters: () => undefined,
            refresh: refreshEvents
        }
    };
}
