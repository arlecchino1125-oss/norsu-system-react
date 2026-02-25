import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function useDeptData(session: any, isAuthenticated: boolean) {
    const [data, setData] = useState<any>(null);
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    const [supportRequests, setSupportRequests] = useState<any[]>([]);
    const [admissionApplicants, setAdmissionApplicants] = useState<any[]>([]);
    const [lastSeenSupportCount, setLastSeenSupportCount] = useState<number>(0);
    const [toast, setToast] = useState<any>(null);

    const showToastMessage = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
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
        }
    }, [isAuthenticated, session]);

    // Fetch Real Students, Courses, and Departments
    useEffect(() => {
        const fetchStudents = async () => {
            if (!data?.profile) return;
            // 1. Fetch Students
            const { data: studentsData } = await supabase.from('students').select('*');

            // 2. Fetch Courses and Departments to map dynamically
            const { data: coursesData } = await supabase.from('courses').select('id, name, department_id');
            const { data: deptsData } = await supabase.from('departments').select('id, name');

            const courseMap: any = {};
            if (coursesData && deptsData) {
                const deptMap: any = {};
                deptsData.forEach(d => deptMap[d.id] = d.name);
                coursesData.forEach(c => courseMap[c.name.trim().toLowerCase()] = deptMap[c.department_id] || 'Unassigned');
            }

            if (studentsData) {
                const mappedStudents = studentsData.map(s => ({
                    id: s.student_id,
                    name: `${s.first_name} ${s.last_name}`,
                    email: s.email || 'No Email',
                    year: s.year_level,
                    status: s.status,
                    department: s.department || courseMap[s.course?.trim().toLowerCase()] || 'Unassigned',
                    course: s.course,
                    ...s
                }));
                setData((prev: any) => ({ ...prev, students: mappedStudents, courseMap }));
            }
        };

        if (data?.profile) {
            fetchStudents();
            const channel = supabase.channel('dept_students_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchStudents)
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [data?.profile]);

    // Dark Mode Effect
    useEffect(() => {
        if (data?.settings?.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [data?.settings?.darkMode]);

    // Fetch Events (Always Active)
    useEffect(() => {
        const fetchEvents = async () => {
            const { data: eventsData } = await supabase
                .from('events').select('*').order('created_at', { ascending: false });
            if (eventsData) setEventsList(eventsData);
        };

        fetchEvents();
        const channel = supabase.channel('dept_events_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch Counseling Requests
    useEffect(() => {
        if (!data?.profile?.department) return;

        const fetchRequests = async () => {
            const { data: reqs, error } = await supabase
                .from('counseling_requests')
                .select('*')
                .eq('department', data.profile.department)
                .order('created_at', { ascending: false });

            if (error) console.error("DeptDashboard: Error fetching requests:", error);
            if (reqs) {
                setCounselingRequests(reqs);
            }
        };

        fetchRequests();
        const channel = supabase
            .channel('dept_counseling')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests', filter: `department=eq.${data.profile.department}` }, (payload: any) => {
                fetchRequests();
                if (payload.eventType === 'INSERT') {
                    showToastMessage(`New Counseling Request Received`, 'info');
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [data?.profile?.department]);

    // Fetch Admissions Applicants
    useEffect(() => {
        if (!data?.profile?.department || !data?.courseMap) return;

        const fetchAdmissions = async () => {
            const { data: apps, error } = await supabase
                .from('applications')
                .select('*')
                .in('status', ['Qualified for Interview (1st Choice)', 'Forwarded to 2nd Choice for Interview', 'Forwarded to 3rd Choice for Interview', 'Interview Scheduled'])
                .order('created_at', { ascending: false });

            if (apps) {
                const myDeptApps = apps.filter((app: any) => {
                    const activeChoice = app.current_choice || 1;
                    const activeCourse = activeChoice === 1 ? app.priority_course : activeChoice === 2 ? app.alt_course_1 : app.alt_course_2;

                    const mappedDept = data.courseMap[activeCourse?.trim().toLowerCase()];
                    return mappedDept === data.profile.department;
                });
                setAdmissionApplicants(myDeptApps);
            }
        };

        fetchAdmissions();
        const channel = supabase.channel('dept_admissions_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchAdmissions)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [data?.profile?.department, data?.courseMap]);

    // Fetch Support Requests
    useEffect(() => {
        if (!data?.profile?.department) return;

        const fetchSupport = async () => {
            const { data: reqs } = await supabase
                .from('support_requests')
                .select('*')
                .eq('department', data.profile.department)
                .in('status', ['Forwarded to Dept', 'Visit Scheduled', 'Resolved by Dept', 'Referred to CARE'])
                .order('created_at', { ascending: false });
            if (reqs) setSupportRequests(reqs);
        };

        fetchSupport();
        const channel = supabase
            .channel('dept_support_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'support_requests',
                filter: `department=eq.${data.profile.department}`
            }, (payload: any) => {
                if (payload.new && payload.new.status === 'Forwarded to Dept') {
                    showToastMessage("New Support Request Received", "success");
                }
                fetchSupport();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [data?.profile?.department]);

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
        showToastMessage
    };
}
