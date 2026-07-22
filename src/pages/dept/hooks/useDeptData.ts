import { useCallback, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { DEFAULT_PAGE_SIZE } from '../../../types/pagination';
import { isEventVisibleToDepartment } from '../../../utils/eventAudience';

// Stable identities: fresh literals as query fallbacks change on every render
// and retrigger every consumer downstream.
const EMPTY_ROWS: any[] = [];
const EMPTY_COUNTS = new Map<number, number>();
import {
    COUNSELING_AWAITING_DEPT_STATUSES,
    COUNSELING_CALENDAR_STATUSES,
    COUNSELING_STATUS,
    COUNSELING_WITH_CARE_STAFF_STATUSES,
    DEPT_SUPPORT_VISIBLE_STATUSES,
    SUPPORT_STATUS
} from '../../../utils/workflow';
import {
    getCounselingRequestsPage,
    getDepartmentApplicationsPage,
    getDepartmentCourseNames,
    getCourseDepartmentMap,
    getEventsPage,
    getDeptAttendanceEventsPage,
    getDeptEventAttendanceCounts,
    getStudentsPage,
    getSupportRequestsPage
} from '../../../services/deptService';
import { useToast, type ToastType } from '../../../components/ui/toast/useToast';

const localDateKey = (date = new Date()) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const DEFAULT_REFERRAL_REASONS = ['Academic Performance', 'Attendance Issues', 'Behavioral Concern', 'Career Guidance', 'Personal/Emotional'];
const REFERRAL_REASONS_STORAGE_KEY = 'dept-referral-reasons-v1';
const POPULATION_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

// ponytail: localStorage persistence — per-browser only; move to a settings table if reasons must roam
const readStoredReferralReasons = (): string[] => {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(REFERRAL_REASONS_STORAGE_KEY) || 'null');
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_REFERRAL_REASONS];
    } catch {
        return [...DEFAULT_REFERRAL_REASONS];
    }
};

export function useDeptData(session: any, isAuthenticated: boolean) {
    const queryClient = useQueryClient();

    // Derive department directly — no 2-step useEffect initialization chain
    const department = isAuthenticated && session ? (session.department || 'Unassigned') : null;

    // data keeps profile + settings in local state (settings are mutated locally by addReason/deleteReason/useDeptAccount)
    const [data, setData] = useState<any>(() =>
        isAuthenticated && session
            ? {
                profile: {
                    name: session.full_name,
                    department: session.department || 'Unassigned',
                    email: session.email,
                    id: session.id
                },
                students: [],
                requests: [],
                settings: {
                    referralReasons: readStoredReferralReasons(),
                    darkMode: false
                }
            }
            : null
    );

    // Keep data.profile in sync if session changes after mount
    useEffect(() => {
        if (isAuthenticated && session) {
            setData((prev: any) => ({
                ...(prev ?? {
                    students: [],
                    requests: [],
                    settings: {
                        referralReasons: readStoredReferralReasons(),
                        darkMode: false
                    }
                }),
                profile: {
                    name: session.full_name,
                    department: session.department || 'Unassigned',
                    email: session.email,
                    id: session.id
                }
            }));
        }
        // ponytail: session?.id as dep avoids object reference churn
        // react-doctor-disable-next-line react-doctor/exhaustive-deps
    }, [isAuthenticated, session?.id]);

    const [lastSeenSupportCount, setLastSeenSupportCount] = useState<number>(0);
    const [toast, setToast] = useState<any>(null);

    // Pagination state
    const [studentsPage, setStudentsPage] = useState(1);
    const [studentsPageSize, setStudentsPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [studentFilters, setStudentFilters] = useState<any>({});

    const [counselingPage, setCounselingPage] = useState(1);
    const [counselingPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [counselingFilters, setCounselingFilters] = useState<any>({});

    const [supportPage, setSupportPage] = useState(1);
    const [supportPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [supportFilters, setSupportFilters] = useState<any>({});

    const [admissionsPage, setAdmissionsPage] = useState(1);
    const [admissionsPageSize, setAdmissionsPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [admissionsFilters, setAdmissionsFilters] = useState<any>({});

    const [eventsPage, setEventsPage] = useState(1);
    const [eventsPageSize] = useState(DEFAULT_PAGE_SIZE);

    const { showToast: pushSharedToast } = useToast();
    // Display is owned by the app-wide <ToastProvider>; the returned `toast`
    // stays null so the legacy DeptModals toast render no-ops.
    const showToastMessage = useCallback((msg: string, type: string = 'success') => {
        pushSharedToast(msg, type as ToastType);
    }, [pushSharedToast]);

    // ── Students ──────────────────────────────────────────────────────────────
    const studentsQuery = useQuery({
        queryKey: ['dept_students', department, studentsPage, studentsPageSize, studentFilters],
        enabled: Boolean(department),
        queryFn: async () => {
            const [map, courseOptions, result] = await Promise.all([
                getCourseDepartmentMap(),
                getDepartmentCourseNames(department!),
                getStudentsPage(
                    { ...studentFilters, department },
                    { page: studentsPage, pageSize: studentsPageSize }
                )
            ]);
            const rows = result.rows.map((student: any) => ({
                ...student,
                row_id: student.id,
                id: student.student_id,
                name: `${student.first_name} ${student.last_name}`.trim(),
                email: student.email || 'No Email',
                year: student.year_level,
                status: student.status,
                section: student.section,
                department: student.department || map[String(student.course || '').trim().toLowerCase()] || 'Unassigned',
                course: student.course
            }));
            return { rows, total: result.total, courseMap: map, courseOptions };
        }
    });

    // Sync query result into legacy data fields for consumers that read them
    useEffect(() => {
        if (studentsQuery.data) {
            setData((prev: any) => prev ? {
                ...prev,
                students: studentsQuery.data!.rows,
                courseMap: studentsQuery.data!.courseMap,
                courseOptions: studentsQuery.data!.courseOptions
            } : prev);
        }
    }, [studentsQuery.data]);

    // ── Events ────────────────────────────────────────────────────────────────
    const eventsQuery = useQuery({
        queryKey: ['dept_events', eventsPage, eventsPageSize],
        queryFn: async () => {
            const now = new Date();
            // Local date, not toISOString() — UTC dates kept yesterday's events visible until 8am in UTC+8
            const todayStr = localDateKey(now);
            const result = await getEventsPage(
                { page: eventsPage, pageSize: eventsPageSize },
                { column: 'created_at', ascending: false },
                { fromDate: todayStr }
            );
            // Server already excludes past dates; only trim today's events that have ended
            return (result.rows || []).filter((ev: any) => {
                if (ev.event_date !== todayStr || !ev.end_time) return true;
                const [h, m] = ev.end_time.split(':').map(Number);
                return !(now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m));
            });
        }
    });

    // ── Attendance events (department events page) ────────────────────────────
    // Separate from eventsQuery above: that one is "what is on today" for the
    // home page, this one is the attendance history, so it keeps past and
    // archived events and drops announcements.
    const deptAttendanceEventsQuery = useQuery({
        queryKey: ['dept_attendance_events', department],
        enabled: Boolean(department),
        queryFn: async () => {
            const result = await getDeptAttendanceEventsPage({ page: 1, pageSize: 100 });
            const events = (result.rows || []).filter((event: any) => isEventVisibleToDepartment(event, department));
            const counts = await getDeptEventAttendanceCounts(
                String(department),
                events.map((event: any) => event.id).filter((id: any) => id != null)
            );
            return { events, counts };
        },
        staleTime: 2 * 60 * 1000
    });

    // ── Counseling ────────────────────────────────────────────────────────────
    const counselingQuery = useQuery({
        queryKey: ['dept_counseling', department, counselingPage, counselingPageSize, counselingFilters],
        enabled: Boolean(department),
        queryFn: async () => {
            const result = await getCounselingRequestsPage(
                { ...counselingFilters, department },
                { page: counselingPage, pageSize: counselingPageSize },
                { column: 'created_at', ascending: false }
            );
            return { rows: result.rows, total: result.total };
        }
    });

    // Local state for optimistic patches from useDeptCounseling (patchCounselingRows)
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    useEffect(() => {
        if (counselingQuery.data) setCounselingRequests(counselingQuery.data.rows);
    }, [counselingQuery.data]);

    // ── Support ───────────────────────────────────────────────────────────────
    const supportQuery = useQuery({
        queryKey: ['dept_support', department, supportPage, supportPageSize, supportFilters],
        enabled: Boolean(department),
        queryFn: async () => {
            const result = await getSupportRequestsPage(
                { ...supportFilters, department, status: [...DEPT_SUPPORT_VISIBLE_STATUSES] },
                { page: supportPage, pageSize: supportPageSize },
                { column: 'created_at', ascending: false }
            );
            return { rows: result.rows, total: result.total };
        }
    });

    // Local state for optimistic patches from useDeptSupport (patchSupportRows)
    const [supportRequests, setSupportRequests] = useState<any[]>([]);
    useEffect(() => {
        if (supportQuery.data) setSupportRequests(supportQuery.data.rows);
    }, [supportQuery.data]);

    // ── Admissions ────────────────────────────────────────────────────────────
    const admissionsQuery = useQuery({
        queryKey: ['dept_admissions', department, admissionsPage, admissionsPageSize, admissionsFilters],
        enabled: Boolean(department),
        queryFn: async () => {
            const result = await getDepartmentApplicationsPage(
                department!,
                admissionsFilters,
                { page: admissionsPage, pageSize: admissionsPageSize },
                { column: 'created_at', ascending: false }
            );
            return { rows: result.rows, total: result.total };
        }
    });

    useEffect(() => {
        if (admissionsQuery.data?.total === undefined) return;
        const totalPages = Math.max(1, Math.ceil(admissionsQuery.data.total / admissionsPageSize));
        if (admissionsPage > totalPages) setAdmissionsPage(totalPages);
    }, [admissionsPage, admissionsPageSize, admissionsQuery.data?.total]);

    const [admissionApplicants, setAdmissionApplicants] = useState<any[]>([]);
    useEffect(() => {
        if (admissionsQuery.data) setAdmissionApplicants(admissionsQuery.data.rows);
    }, [admissionsQuery.data]);

    // ── Dashboard stats (department-wide counts; the paged lists above only hold one page) ──
    const statsQuery = useQuery({
        queryKey: ['dept_dashboard_stats', department],
        enabled: Boolean(department),
        queryFn: async () => {
            const one = { page: 1, pageSize: 1 };
            const total = (result: any) => Number(result?.total || 0);
            const [awaiting, scheduled, withCare, completed, rejected, supportForwarded, populationTotal, ...yearResults] = await Promise.all([
                getCounselingRequestsPage({ department, status: [...COUNSELING_AWAITING_DEPT_STATUSES] }, one),
                getCounselingRequestsPage({ department, status: COUNSELING_STATUS.SCHEDULED }, one),
                getCounselingRequestsPage({ department, status: [...COUNSELING_WITH_CARE_STAFF_STATUSES] }, one),
                getCounselingRequestsPage({ department, status: COUNSELING_STATUS.COMPLETED }, one),
                getCounselingRequestsPage({ department, status: COUNSELING_STATUS.REJECTED }, one),
                getSupportRequestsPage({ department, status: [SUPPORT_STATUS.FORWARDED_TO_DEPT] }, one),
                getStudentsPage({ department }, one),
                ...POPULATION_YEARS.map((year) => getStudentsPage({ department, yearLevel: year }, one))
            ]);
            return {
                counseling: {
                    awaiting: total(awaiting),
                    scheduled: total(scheduled),
                    withCare: total(withCare),
                    completed: total(completed),
                    rejected: total(rejected)
                },
                supportForwarded: total(supportForwarded),
                populationTotal: total(populationTotal),
                populationByYear: Object.fromEntries(POPULATION_YEARS.map((year, index) => [year, total(yearResults[index])]))
            };
        }
    });

    // ── Today's counseling sessions (department-wide, filtered by scheduled_date on the server) ──
    // Shares the ['dept_counseling', department] key prefix so existing invalidations refresh it
    const todayKey = localDateKey();
    const todayCounselingQuery = useQuery({
        queryKey: ['dept_counseling', department, 'today', todayKey],
        enabled: Boolean(department),
        queryFn: async () => {
            const result = await getCounselingRequestsPage(
                { department, status: [...COUNSELING_CALENDAR_STATUSES], scheduledOn: todayKey },
                // ponytail: 50 rows covers any realistic single day of sessions
                { page: 1, pageSize: 50 },
                { column: 'scheduled_date', ascending: true }
            );
            return result.rows;
        }
    });

    // ── Persist referral reasons (edited in Settings) ─────────────────────────
    useEffect(() => {
        const reasons = data?.settings?.referralReasons;
        if (!Array.isArray(reasons)) return;
        try {
            window.localStorage.setItem(REFERRAL_REASONS_STORAGE_KEY, JSON.stringify(reasons));
        } catch { /* storage unavailable — reasons stay session-local */ }
    }, [data?.settings?.referralReasons]);

    // ── Dark mode ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (data?.settings?.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [data?.settings?.darkMode]);

    // ── Realtime → invalidate queries ─────────────────────────────────────────
    // False positive: cleanup below does call supabase.removeChannel(channel) —
    // the detector doesn't recognize Supabase's client.removeChannel() cleanup
    // convention (it looks for .unsubscribe() on the subscribed object itself).
    // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
    useEffect(() => {
        if (!department) return;
        const channel = supabase.channel('dept_students_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `department=eq.${department}` }, () => {
                void queryClient.invalidateQueries({ queryKey: ['dept_students', department] });
                void queryClient.invalidateQueries({ queryKey: ['dept_dashboard_stats', department] });
            })
            .subscribe();
        return () => { void supabase.removeChannel(channel).catch(() => undefined); };
    }, [department, queryClient]);

    // False positive: same Supabase removeChannel() cleanup pattern as above.
    // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
    useEffect(() => {
        const channel = supabase.channel('dept_events_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['dept_events'] });
            })
            .subscribe();
        return () => { void supabase.removeChannel(channel).catch(() => undefined); };
    }, [queryClient]);

    // False positive: same Supabase removeChannel() cleanup pattern as above.
    // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
    useEffect(() => {
        if (!department) return;
        const channel = supabase.channel('dept_counseling_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests', filter: `department=eq.${department}` }, (payload: any) => {
                void queryClient.invalidateQueries({ queryKey: ['dept_counseling', department] });
                void queryClient.invalidateQueries({ queryKey: ['dept_dashboard_stats', department] });
                if (payload.eventType === 'INSERT') showToastMessage('New Counseling Request Received', 'info');
            })
            .subscribe();
        return () => { void supabase.removeChannel(channel).catch(() => undefined); };
    }, [department, queryClient, showToastMessage]);

    // False positive: same Supabase removeChannel() cleanup pattern as above.
    // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
    useEffect(() => {
        if (!department) return;
        const channel = supabase.channel('dept_support_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests', filter: `department=eq.${department}` }, (payload: any) => {
                if (payload.new?.status === SUPPORT_STATUS.FORWARDED_TO_DEPT) {
                    showToastMessage('New Support Request Received', 'success');
                }
                void queryClient.invalidateQueries({ queryKey: ['dept_support', department] });
                void queryClient.invalidateQueries({ queryKey: ['dept_dashboard_stats', department] });
            })
            .subscribe();
        return () => { void supabase.removeChannel(channel).catch(() => undefined); };
    }, [department, queryClient, showToastMessage]);

    // ── Refresh all (used by header refresh button — must be awaitable) ────────
    const refreshAllData = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['dept_students', department] }),
            queryClient.invalidateQueries({ queryKey: ['dept_events'] }),
            queryClient.invalidateQueries({ queryKey: ['dept_counseling', department] }),
            queryClient.invalidateQueries({ queryKey: ['dept_support', department] }),
            queryClient.invalidateQueries({ queryKey: ['dept_admissions', department] }),
            queryClient.invalidateQueries({ queryKey: ['dept_dashboard_stats', department] }),
        ]);
    };

    return {
        data,
        setData,
        dashboardStats: statsQuery.data ?? null,
        todayCounselingSessions: todayCounselingQuery.data ?? [],
        eventsList: eventsQuery.data ?? [],
        deptAttendanceEvents: deptAttendanceEventsQuery.data?.events ?? EMPTY_ROWS,
        deptAttendanceCounts: deptAttendanceEventsQuery.data?.counts ?? EMPTY_COUNTS,
        isLoadingDeptAttendanceEvents: deptAttendanceEventsQuery.isLoading,
        counselingRequests,
        setCounselingRequests,
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
            rows: studentsQuery.data?.rows ?? [],
            total: studentsQuery.data?.total ?? 0,
            page: studentsPage,
            pageSize: studentsPageSize,
            isLoading: studentsQuery.isLoading,
            error: studentsQuery.error ? String((studentsQuery.error as any).message || 'Failed to load students') : null,
            setPage: setStudentsPage,
            setPageSize: setStudentsPageSize,
            setFilters: setStudentFilters,
            refresh: () => void queryClient.invalidateQueries({ queryKey: ['dept_students', department] })
        },
        counselingState: {
            rows: counselingRequests,
            total: counselingQuery.data?.total ?? 0,
            page: counselingPage,
            pageSize: counselingPageSize,
            isLoading: counselingQuery.isLoading,
            error: counselingQuery.error ? String((counselingQuery.error as any).message || 'Failed to load counseling requests') : null,
            setPage: setCounselingPage,
            setFilters: setCounselingFilters,
            refresh: () => {
                void queryClient.invalidateQueries({ queryKey: ['dept_counseling', department] });
                void queryClient.invalidateQueries({ queryKey: ['dept_dashboard_stats', department] });
            }
        },
        supportState: {
            rows: supportRequests,
            total: supportQuery.data?.total ?? 0,
            page: supportPage,
            pageSize: supportPageSize,
            isLoading: supportQuery.isLoading,
            error: supportQuery.error ? String((supportQuery.error as any).message || 'Failed to load support requests') : null,
            setPage: setSupportPage,
            setFilters: setSupportFilters,
            refresh: () => {
                void queryClient.invalidateQueries({ queryKey: ['dept_support', department] });
                void queryClient.invalidateQueries({ queryKey: ['dept_dashboard_stats', department] });
            }
        },
        admissionsState: {
            rows: admissionApplicants,
            total: admissionsQuery.data?.total ?? 0,
            page: admissionsPage,
            pageSize: admissionsPageSize,
            isLoading: admissionsQuery.isLoading,
            error: admissionsQuery.error ? String((admissionsQuery.error as any).message || 'Failed to load admissions') : null,
            setRows: setAdmissionApplicants,
            setPage: setAdmissionsPage,
            setPageSize: setAdmissionsPageSize,
            setFilters: setAdmissionsFilters,
            refresh: () => void queryClient.invalidateQueries({ queryKey: ['dept_admissions', department] })
        },
        eventsState: {
            rows: eventsQuery.data ?? [],
            total: eventsQuery.data?.length ?? 0,
            page: eventsPage,
            pageSize: eventsPageSize,
            isLoading: eventsQuery.isLoading,
            error: eventsQuery.error ? String((eventsQuery.error as any).message || 'Failed to load events') : null,
            setPage: setEventsPage,
            setFilters: () => undefined,
            refresh: () => void queryClient.invalidateQueries({ queryKey: ['dept_events'] })
        }
    };
}
