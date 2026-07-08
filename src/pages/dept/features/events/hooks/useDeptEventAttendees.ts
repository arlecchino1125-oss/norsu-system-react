import { useState } from 'react';
import { supabase } from '../../../../../lib/supabase';

export function useDeptEventAttendees({
    data,
    showToastMessage,
    setYearLevelFilter,
    setDeptCourseFilter,
    setDeptSectionFilter
}: {
    data: any;
    showToastMessage: (msg: string, type?: string) => void;
    setYearLevelFilter: (value: string) => void;
    setDeptCourseFilter: (value: string) => void;
    setDeptSectionFilter: (value: string) => void;
}) {
    const [showEventAttendees, setShowEventAttendees] = useState<any>(null);
    const [deptAttendees, setDeptAttendees] = useState<any[]>([]);

    const handleViewDeptAttendees = async (event: any) => {
        const myDept = data.profile.department;
        try {
            const { data: attendeesData, error } = await supabase
                .from('event_attendance')
                .select('*')
                .eq('event_id', event.id)
                .eq('department', myDept)
                .order('time_in', { ascending: false });

            if (error) throw error;
            let enriched = attendeesData || [];
            if (enriched.length > 0) {
                const studentIds = [...new Set(enriched.map((a: any) => a.student_id).filter(Boolean))];
                if (studentIds.length > 0) {
                    const { data: studs } = await supabase.from('students').select('student_id, year_level, section, course').in('student_id', studentIds);
                    const stuMap: Record<string, any> = {};
                    (studs || []).forEach((s: any) => { stuMap[s.student_id] = s; });
                    enriched = enriched.map((a: any) => ({
                        ...a,
                        year_level: stuMap[a.student_id]?.year_level || '',
                        section: stuMap[a.student_id]?.section || '',
                        course: a.course || stuMap[a.student_id]?.course || ''
                    }));
                }
            }
            setDeptAttendees(enriched);
            setYearLevelFilter('All');
            setDeptCourseFilter('All');
            setDeptSectionFilter('All');
            setShowEventAttendees(event);
        } catch (err) {
            console.error(err);
            showToastMessage('Failed to load attendees.', 'error');
        }
    };

    return {
        showEventAttendees,
        setShowEventAttendees,
        deptAttendees,
        handleViewDeptAttendees
    };
}
