import { useState, useEffect } from 'react';
import { Download, FileText, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { savePdf } from '../../utils/dashboardUtils';
import StatusBadge from '../../components/StatusBadge';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// PAGE 5: NAT Management
const NATManagementPage = ({ showToast }: any) => {
    const [activeTab, setActiveTab] = useState('applications');
    const [applications, setApplications] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [courseLimits, setCourseLimits] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [resultFilter, setResultFilter] = useState('All');
    const [completedFilter, setCompletedFilter] = useState('All');

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ date: '', venue: '', slots: '' });
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [courseForm, setCourseForm] = useState({ name: '', application_limit: 200, department_id: '' });

    useEffect(() => {
        fetchData();
        const sub1 = supabase.channel('nat_apps').on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchData).subscribe();
        const sub2 = supabase.channel('nat_scheds').on('postgres_changes', { event: '*', schema: 'public', table: 'admission_schedules' }, fetchData).subscribe();
        const sub3 = supabase.channel('nat_courses').on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchData).subscribe();
        return () => { supabase.removeChannel(sub1); supabase.removeChannel(sub2); supabase.removeChannel(sub3); };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: apps } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
        const { data: scheds } = await supabase.from('admission_schedules').select('*').order('date', { ascending: true });
        const { data: courses } = await supabase.from('courses').select('*');
        const { data: depts } = await supabase.from('departments').select('*').order('name');
        setApplications(apps || []);
        setSchedules(scheds || []);
        setCourseLimits(courses || []);
        setDepartments(depts || []);
        setLoading(false);
    };

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
        await supabase.from('admission_schedules').insert({ date: scheduleForm.date, venue: scheduleForm.venue, slots: parseInt(scheduleForm.slots), is_active: true });
        setShowScheduleModal(false);
        setScheduleForm({ date: '', venue: '', slots: '' });
        fetchData();
    };

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

    const handleAddCourse = async (e: any) => {
        e.preventDefault();
        try {
            if (!courseForm.department_id) {
                showToast('Please select a department.', 'error');
                return;
            }

            const { error } = await supabase.from('courses').insert({
                name: courseForm.name,
                application_limit: parseInt(String(courseForm.application_limit)),
                status: 'Open',
                department_id: parseInt(courseForm.department_id)
            });
            if (error) throw error;
            showToast('Course added successfully!');
            setShowCourseModal(false);
            setCourseForm({ name: '', application_limit: 200, department_id: '' });
            fetchData();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
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
                .or(`priority_course.eq."${courseName}",alt_course_1.eq."${courseName}",alt_course_2.eq."${courseName}",alt_course_3.eq."${courseName}"`);
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

    const filteredApplications = applications.filter(app =>
        (app.first_name + ' ' + app.last_name + ' ' + app.reference_id).toLowerCase().includes(searchTerm.toLowerCase()) &&
        app.status !== 'Qualified for Interview (1st Choice)' && app.status !== 'Failed' &&
        !app.status.includes('Forwarded to') && !app.status.includes('Application Unsuccessful') && !app.status.includes('Approved for Enrollment')
    ).filter(app => {
        if (resultFilter === 'All') return true;
        return app.status === resultFilter;
    });

    const completedApplications = applications.filter(app =>
        app.status === 'Qualified for Interview (1st Choice)' || app.status === 'Failed' ||
        app.status.includes('Forwarded to') || app.status.includes('Application Unsuccessful') || app.status.includes('Approved for Enrollment')
    ).filter(app => {
        if (completedFilter === 'All') return true;
        return app.status === completedFilter;
    });

    const testTakers = applications.filter(app => app.time_in && app.time_out);
    const filteredResults = testTakers.filter(app => resultFilter === 'All' || app.priority_course === resultFilter);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("NAT Attendance Log", 14, 20);
        (doc as any).autoTable({
            startY: 30,
            head: [["Student Name", "Ref ID", "Status", "Test Date", "Course", "In", "Out"]],
            body: filteredApplications.map(app => [
                `${app.first_name} ${app.last_name}`, app.reference_id, app.status, app.test_date, app.priority_course,
                app.time_in ? new Date(app.time_in).toLocaleTimeString() : '-', app.time_out ? new Date(app.time_out).toLocaleTimeString() : '-'
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
        link.download = `nat_applications_${new Date().toISOString().split('T')[0]}.csv`;
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
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Total Applications</p><p className="text-xl font-bold">{applications.length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Submitted</p><p className="text-xl font-bold">{applications.filter(a => a.status === 'Scheduled' || a.status === 'Submitted').length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Test Takers</p><p className="text-xl font-bold">{testTakers.length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Passed</p><p className="text-xl font-bold">{applications.filter(a => a.status === 'Passed' || a.status.includes('Qualified for Interview')).length}</p></div>
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
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app.id, 'Qualified for Interview (1st Choice)'); }} className="text-green-600 font-bold text-xs cursor-pointer hover:bg-green-50 px-2 py-1 rounded transition-colors">Pass</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app.id, 'Failed'); }} className="text-red-600 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Fail</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteApplication(app.id); }} className="text-slate-400 font-bold text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 px-2 py-1 rounded transition-colors">Del</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeTab === 'test takers' ? (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold">Test Takers</h3>
                                <p className="text-xs text-gray-400">Applicants who completed the test (timed in &amp; timed out)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 font-bold">{filteredResults.length} applicant{filteredResults.length !== 1 ? 's' : ''}</span>
                                <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-sm"><option value="All">All Courses</option>{courseLimits.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Student</th><th className="p-4">Ref ID</th><th className="p-4">Course</th><th className="p-4">Test Date</th><th className="p-4">Time In</th><th className="p-4">Time Out</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
                                <tbody className="divide-y">
                                    {filteredResults.length === 0 ? (
                                        <tr><td colSpan={8} className="p-8 text-center text-gray-400 text-sm">No test takers yet. Applicants appear here once they time in and time out on test day.</td></tr>
                                    ) : filteredResults.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedApp(r); setShowModal(true); }}>
                                            <td className="p-4 font-bold">{r.first_name} {r.last_name}</td>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{r.reference_id}</td>
                                            <td className="p-4">{r.priority_course}</td>
                                            <td className="p-4 text-gray-600">{r.test_date ? new Date(r.test_date).toLocaleDateString() : '—'}</td>
                                            <td className="p-4 text-green-600 font-mono text-xs">{r.time_in ? new Date(r.time_in).toLocaleTimeString() : '—'}</td>
                                            <td className="p-4 text-red-500 font-mono text-xs">{r.time_out ? new Date(r.time_out).toLocaleTimeString() : '—'}</td>
                                            <td className="p-4"><StatusBadge status={r.status} /></td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedApp(r); setShowModal(true); }} className="text-blue-600 font-bold text-xs cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">View</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'Qualified for Interview (1st Choice)'); }} className="text-green-600 font-bold text-xs cursor-pointer hover:bg-green-50 px-2 py-1 rounded transition-colors">Pass</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'Failed'); }} className="text-red-500 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Fail</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                                            <td className="p-4 text-gray-500 text-xs">{new Date(app.created_at).toLocaleDateString()}</td>
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
                    </div>
                ) : activeTab === 'schedules' ? (
                    <div className="space-y-4">
                        <div className="flex justify-end"><button onClick={() => setShowScheduleModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold">+ Add Schedule</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {schedules.map(sch => (
                                <div key={sch.id} className="bg-white p-4 rounded-xl border shadow-sm">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-gray-800">{new Date(sch.date).toDateString()}</span>
                                        <button onClick={() => toggleSchedule(sch)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${sch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{sch.is_active ? 'Active' : 'Closed'}</button>
                                    </div>
                                    <div className="text-sm text-gray-600 text-center py-4">{sch.venue} • {sch.slots} Slots</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-red-50 p-4 rounded-xl border border-red-100">
                            <div>
                                <h3 className="font-bold text-red-800 text-sm">Course Deletion Notice</h3>
                                <p className="text-xs text-red-600 mt-1 max-w-2xl">
                                    <strong>Note:</strong> The deletion process is strictly intended to be used <span className="underline">only</span> if a course is being permanently removed from the university curriculum or school offerings.
                                </p>
                            </div>
                            <button onClick={() => setShowCourseModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-purple-700 transition shrink-0">+ Add Course</button>
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
                                        <p className="text-[10px] text-gray-400 mt-1">Submitted: {new Date(selectedApp.created_at).toLocaleString()}</p>
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
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">School Last Attended</label><p className="text-sm text-gray-700">{selectedApp.school_last_attended || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Year Level Applying</label><p className="text-sm text-gray-700">{selectedApp.year_level_applying || '—'}</p></div>
                                        <div className="md:col-span-3"><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Reason for Applying</label><p className="text-sm text-gray-700">{selectedApp.reason || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-2">Course Preferences</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="md:col-span-2"><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Priority Course</label><p className="text-sm font-bold text-purple-700">{selectedApp.priority_course || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Alternative Course 1</label><p className="text-sm text-gray-700">{selectedApp.alt_course_1 || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Alternative Course 2</label><p className="text-sm text-gray-700">{selectedApp.alt_course_2 || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Alternative Course 3</label><p className="text-sm text-gray-700">{selectedApp.alt_course_3 || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-2">Test Schedule</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Test Date</label><p className="text-sm font-bold text-blue-700">{selectedApp.test_date ? new Date(selectedApp.test_date).toLocaleDateString() : '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Time In</label><p className="text-sm text-green-600 font-mono">{selectedApp.time_in ? new Date(selectedApp.time_in).toLocaleString() : '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Time Out</label><p className="text-sm text-red-500 font-mono">{selectedApp.time_out ? new Date(selectedApp.time_out).toLocaleString() : '—'}</p></div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-2">Support &amp; Special Circumstances</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Working Student</label><p className="text-sm text-gray-700">{selectedApp.is_working_student ? 'Yes' : 'No'}</p></div>
                                        {selectedApp.is_working_student && <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Work Type</label><p className="text-sm text-gray-700">{selectedApp.working_student_type || '—'}</p></div>}
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Supporter/s</label><p className="text-sm text-gray-700">{selectedApp.supporter || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Supporter Contact</label><p className="text-sm text-gray-700">{selectedApp.supporter_contact || '—'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">PWD</label><p className="text-sm text-gray-700">{selectedApp.is_pwd ? 'Yes' : 'No'}</p></div>
                                        {selectedApp.is_pwd && <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">PWD Type</label><p className="text-sm text-gray-700">{selectedApp.pwd_type || '—'}</p></div>}
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Indigenous People</label><p className="text-sm text-gray-700">{selectedApp.is_indigenous ? 'Yes' : 'No'}</p></div>
                                        {selectedApp.is_indigenous && <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Indigenous Group</label><p className="text-sm text-gray-700">{selectedApp.indigenous_group || '—'}</p></div>}
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Witnessed Conflict</label><p className="text-sm text-gray-700">{selectedApp.witnessed_conflict ? 'Yes' : 'No'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Solo Parent</label><p className="text-sm text-gray-700">{selectedApp.is_solo_parent ? 'Yes' : 'No'}</p></div>
                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Child of Solo Parent</label><p className="text-sm text-gray-700">{selectedApp.is_child_of_solo_parent ? 'Yes' : 'No'}</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex flex-wrap gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                                {selectedApp.status !== 'Passed' && selectedApp.status !== 'Failed' && (
                                    <>
                                        <button onClick={() => updateStatus(selectedApp.id, 'Passed')} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-200/50 hover:shadow-xl transition-all">Pass</button>
                                        <button onClick={() => updateStatus(selectedApp.id, 'Failed')} className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200/50 hover:shadow-xl transition-all">Fail</button>
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
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                            <h3 className="font-bold text-lg mb-4">Add Schedule</h3>
                            <form onSubmit={handleAddSchedule} className="space-y-4">
                                <div><label className="text-xs font-bold block mb-1">Date</label><input type="date" className="w-full border rounded p-2" value={scheduleForm.date} onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} required /></div>
                                <div><label className="text-xs font-bold block mb-1">Venue</label><input className="w-full border rounded p-2" value={scheduleForm.venue} onChange={e => setScheduleForm({ ...scheduleForm, venue: e.target.value })} required /></div>
                                <div><label className="text-xs font-bold block mb-1">Slots</label><input type="number" className="w-full border rounded p-2" value={scheduleForm.slots} onChange={e => setScheduleForm({ ...scheduleForm, slots: e.target.value })} required /></div>
                                <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold">Save</button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Add Course Modal */}
            {showCourseModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
                        <button onClick={() => setShowCourseModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
                        <h3 className="font-bold text-lg mb-4 text-gray-900">Add New Course</h3>
                        <form onSubmit={handleAddCourse} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Course Name</label>
                                <input type="text" className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} placeholder="e.g. BS in Computer Science" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Application Limit</label>
                                <input type="number" className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={courseForm.application_limit} onChange={e => setCourseForm({ ...courseForm, application_limit: parseInt(e.target.value) })} required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Department</label>
                                <select className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={courseForm.department_id} onChange={e => setCourseForm({ ...courseForm, department_id: e.target.value })} required>
                                    <option value="" disabled>Select Department</option>
                                    {departments.map((dept: any) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 transition-colors text-white py-3 rounded-xl font-bold mt-2 shadow-lg shadow-purple-600/20">Save Course</button>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};

export default NATManagementPage;
