import { useState, useEffect, useRef } from 'react';
import { Download, FileText, Plus, Trash2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { savePdf } from '../../utils/dashboardUtils';
import { formatDate, formatDateTime, formatTime, generateExportFilename } from '../../utils/formatters';
import StatusBadge from '../../components/StatusBadge';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DEFAULT_PAGE_SIZE } from '../../types/pagination';
import { getAdmissionSchedules, getApplicationsPage, getCoursesForNat, getNatAttendanceSupport, isMissingNatAttendanceColumnsError } from '../../services/natService';

const PASS_STATUS = 'Qualified for Interview (1st Choice)';
const FAIL_STATUS = 'Failed';

const isNatFinalizedStatus = (status: unknown) => {
    const value = String(status || '');
    return value === 'Passed'
        || value === FAIL_STATUS
        || value === PASS_STATUS
        || value === 'Approved for Enrollment'
        || value === 'Interview Scheduled'
        || value.includes('Forwarded to')
        || value.includes('Application Unsuccessful');
};

const hasTakenNatStatus = (status: unknown) => {
    const value = String(status || '');
    return value === 'Test Taken' || isNatFinalizedStatus(value);
};

const hasPassedNatStatus = (status: unknown) => {
    const value = String(status || '');
    return value === 'Passed'
        || value === PASS_STATUS
        || value === 'Approved for Enrollment'
        || value === 'Interview Scheduled'
        || value.includes('Forwarded to');
};

// PAGE 5: NAT Management
const NATManagementPage = ({ showToast }: any) => {
    const [activeTab, setActiveTab] = useState('applications');
    const [applications, setApplications] = useState<any[]>([]);
    const [completedApplications, setCompletedApplications] = useState<any[]>([]);
    const [testTakers, setTestTakers] = useState<any[]>([]);
    const [summaryApplications, setSummaryApplications] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [courseLimits, setCourseLimits] = useState<any[]>([]);
    const [supportsAttendance, setSupportsAttendance] = useState(true);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [testTakersCourseFilter, setTestTakersCourseFilter] = useState('All');
    const [completedFilter, setCompletedFilter] = useState('All');
    const [applicationsPage, setApplicationsPage] = useState(1);
    const [completedPage, setCompletedPage] = useState(1);
    const [testTakersPage, setTestTakersPage] = useState(1);
    const [applicationsTotal, setApplicationsTotal] = useState(0);
    const [completedTotal, setCompletedTotal] = useState(0);
    const [testTakersTotal, setTestTakersTotal] = useState(0);

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        date: '',
        venue: '',
        timeSlots: [{ start: '08:00', end: '09:00', slots: '' }]
    });
    const fetchDataRef = useRef<() => Promise<void>>(async () => { });

    const normalizeTimeSlots = (rawSlots: any[] = []) => {
        return rawSlots
            .map((slot: any) => ({
                start: String(slot?.start || '').trim(),
                end: String(slot?.end || '').trim(),
                slots: parseInt(String(slot?.slots ?? '0'), 10)
            }))
            .filter((slot: any) => slot.start && slot.end && Number.isFinite(slot.slots) && slot.slots > 0);
    };

    const parseTimeToMinutes = (value: string) => {
        const [hour, minute] = String(value || '').split(':').map(Number);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return -1;
        return (hour * 60) + minute;
    };

    const getSummaryRows = async (attendanceEnabled: boolean) => {
        const attendanceSelect = 'id, status, priority_course, test_date, test_time, time_in, time_out';
        const fallbackSelect = 'id, status, priority_course, test_date, test_time';
        const result = await supabase
            .from('applications')
            .select(attendanceEnabled ? attendanceSelect : fallbackSelect);

        if (result.error && isMissingNatAttendanceColumnsError(result.error)) {
            const fallback = await supabase
                .from('applications')
                .select(fallbackSelect);

            return {
                data: fallback.data || [],
                error: fallback.error,
                supportsAttendance: false
            };
        }

        return {
            data: result.data || [],
            error: result.error,
            supportsAttendance: attendanceEnabled
        };
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const attendanceEnabled = await getNatAttendanceSupport();
            const [
                applicationsResult,
                completedResult,
                testTakersResult,
                scheds,
                courses,
                summaryRows
            ] = await Promise.all([
                getApplicationsPage(
                    { mode: 'applications', search: searchTerm },
                    { page: applicationsPage, pageSize: DEFAULT_PAGE_SIZE }
                ),
                getApplicationsPage(
                    { mode: 'completed', status: completedFilter },
                    { page: completedPage, pageSize: DEFAULT_PAGE_SIZE }
                ),
                getApplicationsPage(
                    { mode: 'test_takers', course: testTakersCourseFilter },
                    { page: testTakersPage, pageSize: DEFAULT_PAGE_SIZE }
                ),
                getAdmissionSchedules(),
                getCoursesForNat(),
                getSummaryRows(attendanceEnabled)
            ]);

            if (summaryRows.error) {
                throw summaryRows.error;
            }

            setApplications(applicationsResult.rows);
            setApplicationsTotal(applicationsResult.total);
            setCompletedApplications(completedResult.rows);
            setCompletedTotal(completedResult.total);
            setTestTakers(testTakersResult.rows);
            setTestTakersTotal(testTakersResult.total);
            setSchedules(scheds || []);
            setCourseLimits(courses || []);
            setSupportsAttendance(summaryRows.supportsAttendance);
            setSummaryApplications(summaryRows.data || []);
        } catch (error: any) {
            showToast(error.message || 'Failed to load NAT data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataRef.current = fetchData;
    });

    useEffect(() => {
        void fetchData();
    }, [searchTerm, completedFilter, applicationsPage, completedPage, testTakersPage, testTakersCourseFilter]);

    useEffect(() => {
        const refreshData = () => {
            void fetchDataRef.current();
        };

        const sub1 = supabase
            .channel('nat_apps')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, refreshData)
            .subscribe();
        const sub2 = supabase
            .channel('nat_scheds')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admission_schedules' }, refreshData)
            .subscribe();
        const sub3 = supabase
            .channel('nat_courses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, refreshData)
            .subscribe();

        return () => {
            void supabase.removeChannel(sub1);
            void supabase.removeChannel(sub2);
            void supabase.removeChannel(sub3);
        };
    }, []);

    const updateStatus = async (id, newStatus) => {
        console.log(`[DEBUG] Attempting to update status for ID: ${id} to ${newStatus}`);
        if (!id) {
            alert("Error: Invalid Application ID");
            return;
        }

        try {
            console.log("[DEBUG] Sending update request to Supabase...");
            const { error } = await supabase
                .from('applications')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) {
                console.error("[DEBUG] Supabase Error:", error);
                alert(`Error: ${error.message}`);
                return;
            }

            console.log("[DEBUG] Update successful!");
            showToast(`Status updated to ${newStatus}`);
            fetchData();
            setShowModal(false);
        } catch (err) {
            console.error("[DEBUG] Unexpected Error:", err);
            alert(`Unexpected error: ${err.message}`);
        }
    };

    const deleteApplication = async (id) => {
        if (!window.confirm('Delete this application?')) return;
        await supabase.from('applications').delete().eq('id', id);
        showToast('Application deleted.');
        fetchData();
        setShowModal(false);
    };

    const handleAddSchedule = async (e) => {
        e.preventDefault();
        const normalizedSlots = normalizeTimeSlots(scheduleForm.timeSlots);

        if (normalizedSlots.length === 0) {
            showToast('Add at least one valid time slot with slot count.', 'error');
            return;
        }

        const invalidRange = normalizedSlots.find((slot: any) => parseTimeToMinutes(slot.start) >= parseTimeToMinutes(slot.end));
        if (invalidRange) {
            showToast('Each time slot must have an end time later than the start time.', 'error');
            return;
        }

        const totalSlots = normalizedSlots.reduce((sum: number, slot: any) => sum + slot.slots, 0);
        const payload: any = {
            date: scheduleForm.date,
            venue: scheduleForm.venue,
            slots: totalSlots,
            is_active: true,
            time_windows: normalizedSlots
        };

        let { error } = await supabase.from('admission_schedules').insert(payload);
        if (error && String(error.message || '').toLowerCase().includes('time_windows')) {
            // Backward compatibility if DB migration is not yet applied.
            const fallback = await supabase.from('admission_schedules').insert({
                date: scheduleForm.date,
                venue: scheduleForm.venue,
                slots: totalSlots,
                is_active: true
            });
            error = fallback.error;
            if (!fallback.error) {
                showToast('Schedule saved. Time windows need latest DB migration to persist.', 'info');
            }
        }

        if (error) {
            showToast(error.message, 'error');
            return;
        }

        showToast('Schedule added successfully!');
        setShowScheduleModal(false);
        setScheduleForm({
            date: '',
            venue: '',
            timeSlots: [{ start: '08:00', end: '09:00', slots: '' }]
        });
        fetchData();
    };

    const addTimeSlotRow = () => {
        setScheduleForm((prev: any) => ({
            ...prev,
            timeSlots: [...prev.timeSlots, { start: '', end: '', slots: '' }]
        }));
    };

    const updateTimeSlotRow = (index: number, field: 'start' | 'end' | 'slots', value: string) => {
        setScheduleForm((prev: any) => ({
            ...prev,
            timeSlots: prev.timeSlots.map((slot: any, i: number) => (i === index ? { ...slot, [field]: value } : slot))
        }));
    };

    const removeTimeSlotRow = (index: number) => {
        setScheduleForm((prev: any) => {
            const next = prev.timeSlots.filter((_: any, i: number) => i !== index);
            return {
                ...prev,
                timeSlots: next.length > 0 ? next : [{ start: '', end: '', slots: '' }]
            };
        });
    };

    useEffect(() => {
        setApplicationsPage(1);
    }, [searchTerm]);

    useEffect(() => {
        setCompletedPage(1);
    }, [completedFilter]);

    useEffect(() => {
        setTestTakersPage(1);
    }, [testTakersCourseFilter]);

    const toggleSchedule = async (sch) => {
        await supabase.from('admission_schedules').update({ is_active: !sch.is_active }).eq('id', sch.id);
        fetchData();
    };

    const handleUpdateLimit = async (id, field, value) => {
        try {
            await supabase.from('courses').update({ [field]: value }).eq('id', id);
            showToast("Limit updated!");
            fetchData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const handleDeleteCourse = async (courseName: string, id: number) => {
        const confirmDelete = window.confirm(
            `WARNING: You are about to completely delete the course "${courseName}".\n\n` +
            `NOTE: This deletion process is primarily intended for removing a course if it is being permanently removed from the curriculum or school.\n\n` +
            `This will permanently delete ALL NAT Applications and Enrolled Students connected to this course. ` +
            `Current students taking this course will have their course set to "None".\n\n` +
            `Are you absolutely sure you want to proceed?`
        );
        if (!confirmDelete) return;

        setLoading(true);
        try {
            // 1. Delete associated applications
            const { error: appError } = await supabase.from('applications')
                .delete()
                .or(`priority_course.eq."${courseName}",alt_course_1.eq."${courseName}",alt_course_2.eq."${courseName}"`);
            if (appError) console.error("Error deleting applications:", appError);

            // 2. Delete enrolled students
            const { error: enrollError } = await supabase.from('enrolled_students')
                .delete()
                .eq('course', courseName);
            if (enrollError) console.error("Error deleting enrolled students:", enrollError);

            // 3. Nullify course in students
            const { error: studentError } = await supabase.from('students')
                .update({
                    course: null,
                    priority_course: null,
                    alt_course_1: null,
                    alt_course_2: null
                })
                .or(`course.eq."${courseName}",priority_course.eq."${courseName}",alt_course_1.eq."${courseName}",alt_course_2.eq."${courseName}"`);
            if (studentError) console.error("Error updating students:", studentError);

            // 4. Delete the course itself
            const { error: courseError } = await supabase.from('courses')
                .delete()
                .eq('id', id);

            if (courseError) throw courseError;

            showToast(`Course "${courseName}" and its dependencies have been deleted.`);
            fetchData();
        } catch (err: any) {
            console.error("Delete sequence failed:", err);
            showToast(`Error deleting course: ${err.message}`, 'error');
            setLoading(false);
        }
    };

    const filteredApplications = applications;
    const filteredResults = testTakers;
    const hasCompletedAttendance = (app: any) => Boolean(app?.time_in) && Boolean(app?.time_out);
    const isCompletedNatRecord = (app: any) => supportsAttendance ? hasCompletedAttendance(app) : hasTakenNatStatus(app?.status);

    const dateApplicantCounts = summaryApplications.reduce((acc: Record<string, number>, app: any) => {
        if (app.test_date) acc[app.test_date] = (acc[app.test_date] || 0) + 1;
        return acc;
    }, {});

    const dateTimeApplicantCounts = summaryApplications.reduce((acc: Record<string, number>, app: any) => {
        if (app.test_date && app.test_time) {
            const key = `${app.test_date}|${app.test_time}`;
            acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
    }, {});

    const formatTime12h = (value: string) => {
        if (!value) return value;
        const [hour, minute] = value.split(':').map(Number);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const displayHour = ((hour + 11) % 12) + 1;
        return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
    };

    const formatAssignedSlot = (value: string) => {
        if (!value) return 'Not assigned';
        if (!String(value).includes('-')) return formatTime12h(value);
        const [start, end] = String(value).split('-').map((part) => part.trim());
        if (!start || !end) return value;
        return `${formatTime12h(start)} - ${formatTime12h(end)}`;
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("NAT Applications Log", 14, 20);
        (doc as any).autoTable({
            startY: 30,
            head: [supportsAttendance
                ? ["Student Name", "Ref ID", "Status", "Test Date", "Course", "Time In", "Time Out"]
                : ["Student Name", "Ref ID", "Status", "Test Date", "Test Slot", "Course"]],
            body: filteredApplications.map(app => supportsAttendance
                ? [
                    `${app.first_name} ${app.last_name}`,
                    app.reference_id,
                    app.status,
                    formatDate(app.test_date),
                    app.priority_course,
                    formatTime(app.time_in, '-'),
                    formatTime(app.time_out, '-')
                ]
                : [
                    `${app.first_name} ${app.last_name}`,
                    app.reference_id,
                    app.status,
                    formatDate(app.test_date),
                    formatAssignedSlot(app.test_time),
                    app.priority_course
                ])
        });
        savePdf(doc, "NAT_Log.pdf");
    };

    const handleExportCSV = () => {
        if (filteredApplications.length === 0) { showToast("No applications to export.", 'info'); return; }
        const headers = ["Reference ID", "First Name", "Last Name", "Email", "Mobile", "Course Preference", "Status", "Test Date"];
        const rows = filteredApplications.map(app => [
            `"${app.reference_id}"`, `"${app.first_name}"`, `"${app.last_name}"`, `"${app.email}"`, `"${app.mobile}"`,
            `"${app.priority_course}"`, `"${app.status}"`, `"${app.test_date || ''}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = generateExportFilename('nat_applications', 'csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">NAT Management</h1>
                <p className="text-gray-500 text-sm">Manage NAT applications and course quotas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Total Applications</p><p className="text-xl font-bold">{summaryApplications.length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Submitted</p><p className="text-xl font-bold">{summaryApplications.filter(a => a.status === 'Scheduled' || a.status === 'Submitted').length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Test Takers</p><p className="text-xl font-bold">{summaryApplications.filter(isCompletedNatRecord).length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Passed</p><p className="text-xl font-bold">{summaryApplications.filter(a => hasPassedNatStatus(a.status)).length}</p></div>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
                {['applications', 'test takers', 'completed', 'schedules', 'limits'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition ${activeTab === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>{t === 'completed' ? 'Completed Logs' : t}</button>
                ))}
            </div>

            {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> :
                activeTab === 'applications' ? (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="border rounded-lg px-3 py-1.5 text-sm w-64" />
                            <div className="flex gap-2">
                                <button onClick={handleExportCSV} className="text-green-600 text-sm font-bold flex items-center gap-1 hover:bg-green-50 px-2 py-1 rounded"><Download size={14} /> CSV</button>
                                <button onClick={handleExportPDF} className="text-red-600 text-sm font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"><FileText size={14} /> PDF</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Student</th><th className="p-4">Status</th><th className="p-4">Course</th><th className="p-4">Action</th></tr></thead>
                                <tbody className="divide-y">
                                    {filteredApplications.map(app => (
                                        <tr key={app.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedApp(app); setShowModal(true); }}>
                                            <td className="p-4 font-bold">{app.first_name} {app.last_name}<div className="text-xs text-gray-400 font-normal">{app.reference_id}</div></td>
                                            <td className="p-4"><StatusBadge status={app.status} /></td>
                                            <td className="p-4">{app.priority_course}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedApp(app); setShowModal(true); }} className="text-blue-600 font-bold text-xs cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">View</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app.id, PASS_STATUS); }} className="text-green-600 font-bold text-xs cursor-pointer hover:bg-green-50 px-2 py-1 rounded transition-colors">Pass</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app.id, FAIL_STATUS); }} className="text-red-600 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Fail</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteApplication(app.id); }} className="text-slate-400 font-bold text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 px-2 py-1 rounded transition-colors">Del</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between text-xs">
                            <span className="text-gray-500">Showing page {applicationsPage} ({filteredApplications.length} rows) of {Math.max(1, Math.ceil(applicationsTotal / DEFAULT_PAGE_SIZE))}</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setApplicationsPage((prev) => Math.max(1, prev - 1))}
                                    disabled={applicationsPage === 1}
                                    className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setApplicationsPage((prev) => prev + 1)}
                                    disabled={applicationsPage >= Math.max(1, Math.ceil(applicationsTotal / DEFAULT_PAGE_SIZE))}
                                    className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'test takers' ? (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold">Test Takers</h3>
                                <p className="text-xs text-gray-400">{supportsAttendance ? 'Applicants who timed in and timed out on their assigned test day.' : 'Applicants who finished the NAT and are awaiting result tagging.'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 font-bold">{filteredResults.length} applicant{filteredResults.length !== 1 ? 's' : ''}</span>
                                <select value={testTakersCourseFilter} onChange={e => setTestTakersCourseFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-sm"><option value="All">All Courses</option>{courseLimits.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="p-4">Student</th>
                                        <th className="p-4">Ref ID</th>
                                        <th className="p-4">Course</th>
                                        <th className="p-4">Test Date</th>
                                        {supportsAttendance ? (
                                            <>
                                                <th className="p-4">Time In</th>
                                                <th className="p-4">Time Out</th>
                                            </>
                                        ) : (
                                            <th className="p-4">Test Slot</th>
                                        )}
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredResults.length === 0 ? (
                                        <tr><td colSpan={supportsAttendance ? 8 : 7} className="p-8 text-center text-gray-400 text-sm">{supportsAttendance ? 'No timed attendance records yet. Applicants appear here after they time in and time out.' : 'No finished NAT records yet. Applicants move here after they are marked as `Test Taken`.'}</td></tr>
                                    ) : filteredResults.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedApp(r); setShowModal(true); }}>
                                            <td className="p-4 font-bold">{r.first_name} {r.last_name}</td>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{r.reference_id}</td>
                                            <td className="p-4">{r.priority_course}</td>
                                            <td className="p-4 text-gray-600">{formatDate(r.test_date)}</td>
                                            {supportsAttendance ? (
                                                <>
                                                    <td className="p-4 text-green-600 font-mono text-xs">{formatTime(r.time_in, '-')}</td>
                                                    <td className="p-4 text-red-500 font-mono text-xs">{formatTime(r.time_out, '-')}</td>
                                                </>
                                            ) : (
                                                <td className="p-4 text-gray-600 text-xs font-medium">{formatAssignedSlot(r.test_time)}</td>
                                            )}
                                            <td className="p-4"><StatusBadge status={r.status} /></td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedApp(r); setShowModal(true); }} className="text-blue-600 font-bold text-xs cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">View</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r.id, PASS_STATUS); }} className="text-green-600 font-bold text-xs cursor-pointer hover:bg-green-50 px-2 py-1 rounded transition-colors">Pass</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r.id, FAIL_STATUS); }} className="text-red-500 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Fail</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between text-xs">
                            <span className="text-gray-500">Showing page {testTakersPage} ({filteredResults.length} rows) of {Math.max(1, Math.ceil(testTakersTotal / DEFAULT_PAGE_SIZE))}</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTestTakersPage((prev) => Math.max(1, prev - 1))}
                                    disabled={testTakersPage === 1}
                                    className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTestTakersPage((prev) => prev + 1)}
                                    disabled={testTakersPage >= Math.max(1, Math.ceil(testTakersTotal / DEFAULT_PAGE_SIZE))}
                                    className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'completed' ? (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold">Completed Logs</h3>
                                <p className="text-xs text-gray-400">Archived applications (Passed &amp; Failed)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 font-bold">{completedApplications.length} record{completedApplications.length !== 1 ? 's' : ''}</span>
                                <select value={completedFilter} onChange={e => setCompletedFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
                                    <option value="All">All Status</option>
                                    <option value="Qualified for Interview (1st Choice)">Passed NAT (Interview Prep)</option>
                                    <option value="Approved for Enrollment">Approved for Enrollment</option>
                                    <option value="Application Unsuccessful">Unsuccessful</option>
                                    <option value="Failed">Failed NAT</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="p-4">Student</th>
                                        <th className="p-4">Ref ID</th>
                                        <th className="p-4">Course</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Date Completed</th>
                                        <th className="p-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {completedApplications.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">No completed logs yet.</td></tr>
                                    ) : completedApplications.map(app => (
                                        <tr key={app.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedApp(app); setShowModal(true); }}>
                                            <td className="p-4 font-bold">{app.first_name} {app.last_name}</td>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{app.reference_id}</td>
                                            <td className="p-4">{app.priority_course}</td>
                                            <td className="p-4"><StatusBadge status={app.status} /></td>
                                            <td className="p-4 text-gray-500 text-xs">{formatDate(app.created_at)}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedApp(app); setShowModal(true); }} className="text-blue-600 font-bold text-xs cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">View</button>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteApplication(app.id); }} className="text-red-500 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between text-xs">
                            <span className="text-gray-500">Showing page {completedPage} ({completedApplications.length} rows) of {Math.max(1, Math.ceil(completedTotal / DEFAULT_PAGE_SIZE))}</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCompletedPage((prev) => Math.max(1, prev - 1))}
                                    disabled={completedPage === 1}
                                    className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCompletedPage((prev) => prev + 1)}
                                    disabled={completedPage >= Math.max(1, Math.ceil(completedTotal / DEFAULT_PAGE_SIZE))}
                                    className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'schedules' ? (
                    <div className="space-y-4">
                        <div className="flex justify-end"><button onClick={() => setShowScheduleModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold">+ Add Schedule</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {schedules.map(sch => (
                                <div key={sch.id} className="bg-white p-4 rounded-xl border shadow-sm">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-gray-800">{formatDate(sch.date)}</span>
                                        <button onClick={() => toggleSchedule(sch)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${sch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{sch.is_active ? 'Active' : 'Closed'}</button>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <div className="font-medium">{sch.venue}</div>
                                        <div className="text-xs mt-1">
                                            Overall Slots: <span className="font-bold text-gray-800">{Math.max((sch.slots || 0) - (dateApplicantCounts[sch.date] || 0), 0)}</span> / {sch.slots || 0} available
                                        </div>
                                    </div>

                                    {Array.isArray(sch.time_windows) && sch.time_windows.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                                            {normalizeTimeSlots(sch.time_windows).map((slot: any, index: number) => {
                                                const key = `${sch.date}|${slot.start}-${slot.end}`;
                                                const used = dateTimeApplicantCounts[key] || 0;
                                                const remaining = Math.max(slot.slots - used, 0);
                                                return (
                                                    <div key={`${slot.start}-${slot.end}-${index}`} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5">
                                                        <span className="font-medium text-gray-700">{formatTime12h(slot.start)} - {formatTime12h(slot.end)}</span>
                                                        <span className="font-mono text-blue-700">{remaining}/{slot.slots}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div>
                                <h3 className="font-bold text-blue-800 text-sm">Course Creation Moved</h3>
                                <p className="text-xs text-blue-700 mt-1 max-w-2xl">
                                    Add new courses in Student Population &rarr; Enrollment Keys &rarr; Course &amp; Applicant Limits. NAT keeps quota/status monitoring and deletion tools.
                                </p>
                            </div>
                        </div>
                        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Course</th><th className="p-4 text-center">Applicants</th><th className="p-4 text-center">Limit</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Action</th></tr></thead>
                                <tbody className="divide-y">
                                    {courseLimits.map(c => (
                                        <tr key={c.id}>
                                            <td className="p-4 font-bold">{c.name}</td>
                                            <td className="p-4 text-center font-mono font-bold text-blue-600">{applications.filter(a => a.priority_course === c.name).length}</td>
                                            <td className="p-4 text-center"><input type="number" className="border rounded w-20 text-center" defaultValue={c.application_limit || 200} onBlur={e => handleUpdateLimit(c.id, 'application_limit', e.target.value)} /></td>
                                            <td className="p-4 text-center"><button onClick={() => handleUpdateLimit(c.id, 'status', c.status === 'Closed' ? 'Open' : 'Closed')} className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'Closed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{c.status || 'Open'}</button></td>
                                            <td className="p-4 text-center"><button onClick={() => handleDeleteCourse(c.name, c.id)} className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition">Delete</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Application Modal — Full Details */}
            {
                showModal && selectedApp && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-blue-100/50">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="font-extrabold text-lg text-gray-900">NAT APPLICATION FORM</h3>
                                        <p className="text-xs text-gray-400 mt-1">Complete application details submitted by the applicant</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Submitted: {formatDateTime(selectedApp.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={selectedApp.status} />
                                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-6 flex items-center gap-3">
                                    <span className="text-xs font-bold text-blue-800 uppercase">Reference ID:</span>
                                    <span className="font-mono font-bold text-blue-900">{selectedApp.reference_id}</span>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-2">Personal Information</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">First Name</label><p className="text-sm font-bold text-gray-800">{selectedApp.first_name || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Last Name</label><p className="text-sm font-bold text-gray-800">{selectedApp.last_name || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Middle Name</label><p className="text-sm text-gray-700">{selectedApp.middle_name || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Suffix</label><p className="text-sm text-gray-700">{selectedApp.suffix || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Student ID</label><p className="text-sm text-gray-700 font-mono">{selectedApp.student_id || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Date of Birth</label><p className="text-sm text-gray-700">{selectedApp.dob || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Age</label><p className="text-sm text-gray-700">{selectedApp.age || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Place of Birth</label><p className="text-sm text-gray-700">{selectedApp.place_of_birth || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Nationality</label><p className="text-sm text-gray-700">{selectedApp.nationality || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Sex</label><p className="text-sm text-gray-700">{selectedApp.sex || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Gender Identity</label><p className="text-sm text-gray-700">{selectedApp.gender_identity || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Civil Status</label><p className="text-sm text-gray-700">{selectedApp.civil_status || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-2">Address</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Street</label><p className="text-sm text-gray-700">{selectedApp.street || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">City/Municipality</label><p className="text-sm text-gray-700">{selectedApp.city || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Province</label><p className="text-sm text-gray-700">{selectedApp.province || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Zip Code</label><p className="text-sm text-gray-700">{selectedApp.zip_code || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-2">Contact Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Mobile</label><p className="text-sm text-gray-700">{selectedApp.mobile || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Email</label><p className="text-sm text-gray-700 break-all">{selectedApp.email || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Facebook URL</label><p className="text-sm text-gray-700 break-all">{selectedApp.facebook_url || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-2">Educational Background</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="md:col-span-3"><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Reason for Applying</label><p className="text-sm text-gray-700">{selectedApp.reason || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-2">Course Preferences</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="md:col-span-2"><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Priority Course</label><p className="text-sm font-bold text-purple-700">{selectedApp.priority_course || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Alternative Course 1</label><p className="text-sm text-gray-700">{selectedApp.alt_course_1 || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Alternative Course 2</label><p className="text-sm text-gray-700">{selectedApp.alt_course_2 || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-2">Test Schedule</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Test Date</label><p className="text-sm font-bold text-blue-700">{formatDate(selectedApp.test_date)}</p></div>
                                        {supportsAttendance ? (
                                            <>
                                                <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Time In</label><p className="text-sm text-green-600 font-mono">{formatTime(selectedApp.time_in, '-')}</p></div>
                                                <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Time Out</label><p className="text-sm text-red-500 font-mono">{formatTime(selectedApp.time_out, '-')}</p></div>
                                            </>
                                        ) : (
                                            <>
                                                <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Test Slot</label><p className="text-sm text-gray-700 font-medium">{formatAssignedSlot(selectedApp.test_time)}</p></div>
                                                <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Current Status</label><p className="text-sm text-gray-700">{selectedApp.status || 'Submitted'}</p></div>
                                            </>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div className="p-6 border-t border-gray-100 flex flex-wrap gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                                {!isNatFinalizedStatus(selectedApp.status) && (
                                    <>
                                        <button onClick={() => updateStatus(selectedApp.id, PASS_STATUS)} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-200/50 hover:shadow-xl transition-all">Pass</button>
                                        <button onClick={() => updateStatus(selectedApp.id, FAIL_STATUS)} className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200/50 hover:shadow-xl transition-all">Fail</button>
                                    </>
                                )}
                                <button onClick={() => setShowModal(false)} className="w-full py-2 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors">Close</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Schedule Modal */}
            {
                showScheduleModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
                            <h3 className="font-bold text-lg mb-4">Add Schedule</h3>
                            <form onSubmit={handleAddSchedule} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold block mb-1">Date</label>
                                        <input type="date" className="w-full border rounded p-2" value={scheduleForm.date} onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold block mb-1">Venue</label>
                                        <input className="w-full border rounded p-2" value={scheduleForm.venue} onChange={e => setScheduleForm({ ...scheduleForm, venue: e.target.value })} required />
                                    </div>
                                </div>

                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-xs font-bold block">Time Slots (Hourly/Custom Blocks)</label>
                                        <button type="button" onClick={addTimeSlotRow} className="text-xs px-2.5 py-1 rounded bg-purple-100 text-purple-700 font-bold hover:bg-purple-200 flex items-center gap-1">
                                            <Plus size={12} /> Add Slot
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {scheduleForm.timeSlots.map((slot: any, index: number) => (
                                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                                <input
                                                    type="time"
                                                    className="col-span-4 border rounded p-2 text-sm"
                                                    value={slot.start}
                                                    onChange={e => updateTimeSlotRow(index, 'start', e.target.value)}
                                                    required
                                                />
                                                <input
                                                    type="time"
                                                    className="col-span-4 border rounded p-2 text-sm"
                                                    value={slot.end}
                                                    onChange={e => updateTimeSlotRow(index, 'end', e.target.value)}
                                                    required
                                                />
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className="col-span-3 border rounded p-2 text-sm"
                                                    placeholder="Slots"
                                                    value={slot.slots}
                                                    onChange={e => updateTimeSlotRow(index, 'slots', e.target.value)}
                                                    required
                                                />
                                                <button type="button" onClick={() => removeTimeSlotRow(index)} className="col-span-1 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3">
                                        Overall day slots: <span className="font-bold text-gray-800">{normalizeTimeSlots(scheduleForm.timeSlots).reduce((sum: number, slot: any) => sum + slot.slots, 0)}</span>
                                    </p>
                                </div>
                                <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold">Save</button>
                            </form>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default NATManagementPage;

