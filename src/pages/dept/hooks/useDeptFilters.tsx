import { useState } from 'react';
import CascadeFilterBar from '../../../components/shared/filters/CascadeFilterBar';

export function useDeptFilters(data: any, filteredData: any) {
    // Derived cascading filter options
    const [yearLevelFilter, setYearLevelFilter] = useState<string>('All');
    const [deptCourseFilter, setDeptCourseFilter] = useState('All');
    const [deptSectionFilter, setDeptSectionFilter] = useState('All');
    const deptYearFilter = yearLevelFilter;
    const [studentSearch, setStudentSearch] = useState('');
    const [counseledSearch, setCounseledSearch] = useState('');
    const [counseledDate, setCounseledDate] = useState('');

    // Derived cascading filter options — pull ALL courses belonging to this college from courseMap
    const dept = String(data?.profile?.department || '').trim();
    const deptCourses = data?.courseMap
        ? [...new Set(
            Object.entries(data.courseMap)
                .filter(([_, d]) => d === dept)
                .map(([courseName]) => courseName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
        )] as string[]
        : [...new Set(filteredData.students.map((s: any) => s.course).filter(Boolean))] as string[];

    // Helper: check if a student matches the current cascade filters
    const matchesCascadeFilters = (student: any) => {
        if (!student) return true;
        if (deptCourseFilter !== 'All' && student.course?.toLowerCase() !== deptCourseFilter.toLowerCase()) return false;
        if (deptYearFilter !== 'All' && student.year !== deptYearFilter) return false;
        if (deptSectionFilter !== 'All' && student.section !== deptSectionFilter) return false;
        return true;
    };

    // Helper: lookup student for a request by student_id
    const getStudentForRequest = (req: any) =>
        filteredData.students.find((s: any) =>
            String(s.student_id || s.id || '') === String(req.student_id || '')
        );

    const cascadeFilterBar = (
        <CascadeFilterBar
            courseOptions={deptCourses}
            yearOptions={['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']}
            sectionOptions={['A', 'B', 'C', 'D', 'E']}
            selectedCourse={deptCourseFilter}
            selectedYear={deptYearFilter}
            selectedSection={deptSectionFilter}
            onCourseChange={(value) => {
                setDeptCourseFilter(value);
                setYearLevelFilter('All');
                setDeptSectionFilter('All');
            }}
            onYearChange={(value) => {
                setYearLevelFilter(value);
                setDeptSectionFilter('All');
            }}
            onSectionChange={setDeptSectionFilter}
            onReset={() => {
                setDeptCourseFilter('All');
                setYearLevelFilter('All');
                setDeptSectionFilter('All');
            }}
        />
    );

    return {
        yearLevelFilter,
        setYearLevelFilter,
        deptCourseFilter,
        setDeptCourseFilter,
        deptSectionFilter,
        setDeptSectionFilter,
        deptYearFilter,
        studentSearch,
        setStudentSearch,
        counseledSearch,
        setCounseledSearch,
        counseledDate,
        setCounseledDate,
        deptCourses,
        matchesCascadeFilters,
        getStudentForRequest,
        cascadeFilterBar
    };
}
