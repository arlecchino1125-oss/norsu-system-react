import { useMemo, useRef, useState, useEffect } from 'react';
import { ArrowRightLeft, CheckCircle2, Download, FileText, Pencil, Plus, RefreshCw, Trash2, Upload, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { loadJsPdfAutoTable, loadXlsx } from '../../lib/exportVendors';
import { savePdf } from '../../utils/dashboardUtils';
import { formatDate, formatDateTime, formatTime, generateExportFilename } from '../../utils/formatters';
import StatusBadge from '../../components/StatusBadge';
import { DEFAULT_PAGE_SIZE } from '../../types/pagination';
import { getAdmissionSchedules, getApplicationsPage, getCoursesForNat, getNatAttendanceSupport, isMissingNatAttendanceColumnsError } from '../../services/natService';
import { getApplicationDetailsById } from '../../services/applicationDetailsService';
import { buildEdgeFunctionHeaders } from '../../lib/functionHeaders';

const PASS_STATUS = 'Qualified for Interview (1st Choice)';
const FAIL_STATUS = 'Failed';
const APPROVED_STATUS = 'Approved for Enrollment';
const INTERVIEW_STATUS = 'Interview Scheduled';
const UNSUCCESSFUL_STATUS = 'Application Unsuccessful';
const BULK_PASS_TEMPLATE_HEADERS = ['reference_id', 'applicant_name'];

const isNatFinalizedStatus = (status: unknown) => {
    const value = String(status || '');
    return value === 'Passed'
        || value === FAIL_STATUS
        || value === PASS_STATUS
        || value === APPROVED_STATUS
        || value === INTERVIEW_STATUS
        || value.includes('Forwarded to')
        || value.includes(UNSUCCESSFUL_STATUS);
};

const hasTakenNatStatus = (status: unknown) => {
    const value = String(status || '');
    return value === 'Test Taken' || isNatFinalizedStatus(value);
};

const isNatForwardedStatus = (status: unknown) => String(status || '').includes('Forwarded to');
const isNatRejectedStatus = (status: unknown) => String(status || '') === FAIL_STATUS || String(status || '').includes(UNSUCCESSFUL_STATUS);

const normalizeReferenceId = (value: unknown) => String(value || '').trim();

const normalizeApplicantName = (value: unknown) => String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const buildApplicantName = (app: any) => [
    app?.first_name,
    app?.middle_name,
    app?.last_name,
    app?.suffix
]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');

const getApplicantRouteLabel = (app: any) => {
    const currentChoice = Number(app?.current_choice || 1);
    if (currentChoice >= 3) {
        return `3rd Choice - ${app?.alt_course_2 || 'Not assigned'}`;
    }
    if (currentChoice === 2) {
        return `2nd Choice - ${app?.alt_course_1 || 'Not assigned'}`;
    }
    return `1st Choice - ${app?.priority_course || 'Not assigned'}`;
};

const getSheetColumnValue = (row: Record<string, unknown>, aliases: string[]) => {
    const matchKey = Object.keys(row).find((key) => aliases.includes(
        String(key || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_')
    ));
    return matchKey ? row[matchKey] : '';
};

const createEmptyScheduleForm = () => ({
    date: '',
    venue: '',
    timeSlots: [{ start: '08:00', end: '09:00', slots: '' }]
});

// PAGE 5: NAT Management
const NATManagementPage = ({ showToast }: any) => {
    const [activeTab, setActiveTab] = useState('applications');
    const [applications, setApplications] = useState<any[]>([]);
    const [completedApplications, setCompletedApplications] = useState<any[]>([]);
    const [testTakers, setTestTakers] = useState<any[]>([]);
    const [summaryApplications, setSummaryApplications] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [courseLimits, setCourseLimits] = useState<any[]>([]);
    const [natRequirements, setNatRequirements] = useState<any[]>([]);
    const [supportsAttendance, setSupportsAttendance] = useState(true);
    const [loading, setLoading] = useState(true);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [newRequirementName, setNewRequirementName] = useState('');
    const [isSavingRequirement, setIsSavingRequirement] = useState(false);
    const [pendingRequirementDeleteId, setPendingRequirementDeleteId] = useState<number | null>(null);
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
    const [isLoadingSelectedApp, setIsLoadingSelectedApp] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
    const [isScheduleDateLocked, setIsScheduleDateLocked] = useState(false);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);
    const [showBulkPassModal, setShowBulkPassModal] = useState(false);
    const [bulkPassRows, setBulkPassRows] = useState<any[]>([]);
    const [bulkPassFileName, setBulkPassFileName] = useState('');
    const [bulkPassApplying, setBulkPassApplying] = useState(false);
    const [statusBoardFilter, setStatusBoardFilter] = useState('awaiting_results');
    const [scheduleForm, setScheduleForm] = useState(createEmptyScheduleForm);
    const bulkPassInputRef = useRef<HTMLInputElement | null>(null);

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
        const summaryBaseSelect = [
            'id',
            'created_at',
            'reference_id',
            'status',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'student_id',
            'priority_course',
            'alt_course_1',
            'alt_course_2',
            'current_choice',
            'test_date',
            'test_time',
            'interview_date'
        ].join(', ');
        const attendanceSelect = `${summaryBaseSelect}, time_in, time_out`;
        const fallbackSelect = summaryBaseSelect;
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
                summaryRows,
                natRequirementsResult
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
                getSummaryRows(attendanceEnabled),
                supabase
                    .from('nat_requirements')
                    .select('id, name, created_at')
                    .order('created_at', { ascending: true })
            ]);

            if (summaryRows.error) {
                throw summaryRows.error;
            }
            if (natRequirementsResult.error) {
                throw natRequirementsResult.error;
            }

            setApplications(applicationsResult.rows);
            setApplicationsTotal(applicationsResult.total);
            setCompletedApplications(completedResult.rows);
            setCompletedTotal(completedResult.total);
            setTestTakers(testTakersResult.rows);
            setTestTakersTotal(testTakersResult.total);
            setSchedules(scheds || []);
            setCourseLimits(courses || []);
            setNatRequirements(natRequirementsResult.data || []);
            setSupportsAttendance(summaryRows.supportsAttendance);
            setSummaryApplications(summaryRows.data || []);
        } catch (error: any) {
            showToast(error.message || 'Failed to load NAT data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, [searchTerm, completedFilter, applicationsPage, completedPage, testTakersPage, testTakersCourseFilter]);

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await fetchData();
            showToast('NAT data refreshed.', 'success');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const closeSelectedAppModal = () => {
        setShowModal(false);
        setSelectedApp(null);
        setIsLoadingSelectedApp(false);
    };

    const openApplicantDetails = async (application: any) => {
        const applicationId = String(application?.id || '').trim();
        if (!applicationId) return;

        setSelectedApp(application);
        setShowModal(true);
        setIsLoadingSelectedApp(true);

        try {
            const details = await getApplicationDetailsById(applicationId);
            setSelectedApp(details as any);
        } catch (error: any) {
            showToast(error?.message || 'Failed to load applicant details.', 'error');
        } finally {
            setIsLoadingSelectedApp(false);
        }
    };

    const updateStatus = async (application, newStatus) => {
        const id = application?.id;
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
            try {
                if (application?.email) {
                    await supabase.functions.invoke('send-email', {
                        body: {
                            type: 'NAT_RESULT',
                            email: application.email,
                            name: [application.first_name, application.last_name].filter(Boolean).join(' ') || 'Applicant',
                            status: newStatus
                        },
                        headers: buildEdgeFunctionHeaders()
                    });
                }
            } catch (emailError) {
                console.error('[DEBUG] NAT result email failed:', emailError);
            }
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

    const closeScheduleModal = () => {
        setShowScheduleModal(false);
        setEditingSchedule(null);
        setIsScheduleDateLocked(false);
        setIsSavingSchedule(false);
        setScheduleForm(createEmptyScheduleForm());
    };

    const handleSaveSchedule = async (e) => {
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
            venue: scheduleForm.venue,
            slots: totalSlots,
            time_windows: normalizedSlots
        };
        if (!editingSchedule || !isScheduleDateLocked) {
            payload.date = scheduleForm.date;
        }

        setIsSavingSchedule(true);

        try {
            if (editingSchedule) {
                let { error } = await supabase
                    .from('admission_schedules')
                    .update(payload)
                    .eq('id', editingSchedule.id);

                if (error && String(error.message || '').toLowerCase().includes('time_windows')) {
                    const fallbackPayload = { ...payload };
                    delete fallbackPayload.time_windows;
                    const fallback = await supabase
                        .from('admission_schedules')
                        .update(fallbackPayload)
                        .eq('id', editingSchedule.id);
                    error = fallback.error;
                    if (!fallback.error) {
                        showToast('Schedule updated. Time windows need latest DB migration to persist.', 'info');
                    }
                }

                if (error) {
                    showToast(error.message, 'error');
                    return;
                }

                showToast('Schedule updated successfully!', 'success');
                closeScheduleModal();
                fetchData();
                return;
            }

            payload.is_active = true;

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

            showToast('Schedule added successfully!', 'success');
            closeScheduleModal();
            fetchData();
        } finally {
            setIsSavingSchedule(false);
        }
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

    const handleAddRequirement = async (e: any) => {
        e.preventDefault();
        const nextName = String(newRequirementName || '').trim();
        if (!nextName || isSavingRequirement) return;

        setIsSavingRequirement(true);
        try {
            const { error } = await supabase
                .from('nat_requirements')
                .insert({ name: nextName });

            if (error) throw error;

            setNewRequirementName('');
            showToast('NAT requirement added.', 'success');
            await fetchData();
        } catch (error: any) {
            showToast(error?.message || 'Failed to add NAT requirement.', 'error');
        } finally {
            setIsSavingRequirement(false);
        }
    };

    const handleDeleteRequirement = async (requirement: any) => {
        const requirementId = Number(requirement?.id || 0);
        if (!requirementId || pendingRequirementDeleteId === requirementId) return;
        if (!window.confirm(`Delete requirement "${requirement?.name || 'this item'}"?`)) return;

        setPendingRequirementDeleteId(requirementId);
        try {
            const { error } = await supabase
                .from('nat_requirements')
                .delete()
                .eq('id', requirementId);

            if (error) throw error;

            showToast('NAT requirement deleted.', 'success');
            await fetchData();
        } catch (error: any) {
            showToast(error?.message || 'Failed to delete NAT requirement.', 'error');
        } finally {
            setPendingRequirementDeleteId(null);
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

    const openAddScheduleModal = () => {
        setEditingSchedule(null);
        setIsScheduleDateLocked(false);
        setScheduleForm(createEmptyScheduleForm());
        setShowScheduleModal(true);
    };

    const openEditScheduleModal = (sch: any) => {
        const existingTimeSlots = normalizeTimeSlots(Array.isArray(sch.time_windows) ? sch.time_windows : []);
        const assignedApplicants = dateApplicantCounts[sch.date] || 0;

        setEditingSchedule(sch);
        setIsScheduleDateLocked(assignedApplicants > 0);
        setScheduleForm({
            date: sch.date || '',
            venue: sch.venue || '',
            timeSlots: existingTimeSlots.length > 0
                ? existingTimeSlots.map((slot: any) => ({
                    start: slot.start,
                    end: slot.end,
                    slots: String(slot.slots)
                }))
                : [{ start: '', end: '', slots: String(sch.slots || '') }]
        });
        setShowScheduleModal(true);
    };

    const handleDeleteSchedule = async (sch: any) => {
        const assignedApplicants = dateApplicantCounts[sch.date] || 0;
        if (assignedApplicants > 0) {
            showToast(`Cannot delete ${formatDate(sch.date)} because ${assignedApplicants} applicant${assignedApplicants !== 1 ? 's are' : ' is'} already assigned to it.`, 'error');
            return;
        }

        if (!window.confirm(`Delete the NAT schedule for ${formatDate(sch.date)} at ${sch.venue || 'the selected venue'}?`)) {
            return;
        }

        const { error } = await supabase
            .from('admission_schedules')
            .delete()
            .eq('id', sch.id);

        if (error) {
            showToast(error.message, 'error');
            return;
        }

        if (editingSchedule?.id === sch.id) {
            closeScheduleModal();
        }

        showToast('Schedule deleted successfully!', 'success');
        fetchData();
    };

    const isEditingLegacySchedule = Boolean(
        editingSchedule
        && normalizeTimeSlots(Array.isArray(editingSchedule.time_windows) ? editingSchedule.time_windows : []).length === 0
    );

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

    const handleExportPDF = async () => {
        const { jsPDF, autoTable } = await loadJsPdfAutoTable();
        const doc = new jsPDF();
        doc.text("NAT Applications Log", 14, 20);
        autoTable(doc, {
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

    const handleDownloadBulkPassTemplate = async () => {
        const XLSX = await loadXlsx();
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([BULK_PASS_TEMPLATE_HEADERS]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'bulk_pass');
        XLSX.writeFile(workbook, generateExportFilename('nat_bulk_pass_template', 'xlsx'));
    };

    const closeBulkPassModal = () => {
        setShowBulkPassModal(false);
        setBulkPassRows([]);
        setBulkPassFileName('');
        setBulkPassApplying(false);
        if (bulkPassInputRef.current) {
            bulkPassInputRef.current.value = '';
        }
    };

    const handleBulkPassFileChange = async (event: any) => {
        const file = event?.target?.files?.[0];
        if (!file) return;

        try {
            const XLSX = await loadXlsx();
            const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            if (!firstSheet) {
                throw new Error('The uploaded file does not contain any worksheet.');
            }

            const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
                defval: '',
                raw: false
            });

            if (rawRows.length === 0) {
                throw new Error('The uploaded file has no data rows.');
            }

            const extractedRows = rawRows
                .map((row, index) => ({
                    rowNumber: index + 2,
                    referenceId: normalizeReferenceId(getSheetColumnValue(row, ['reference_id', 'referenceid', 'ref_id', 'refid', 'reference'])),
                    applicantName: String(getSheetColumnValue(row, ['applicant_name', 'applicant', 'full_name', 'fullname', 'name']) || '').trim()
                }))
                .filter((row) => row.referenceId || row.applicantName);

            if (extractedRows.length === 0) {
                throw new Error('No usable rows were found. Include at least a reference_id column.');
            }

            const seenReferenceIds = new Set<string>();
            const duplicateReferenceIds = new Set<string>();
            extractedRows.forEach((row) => {
                if (!row.referenceId) return;
                if (seenReferenceIds.has(row.referenceId)) {
                    duplicateReferenceIds.add(row.referenceId);
                    return;
                }
                seenReferenceIds.add(row.referenceId);
            });

            const uniqueReferenceIds = [...new Set(extractedRows.map((row) => row.referenceId).filter(Boolean))];
            if (uniqueReferenceIds.length === 0) {
                throw new Error('No reference IDs were found in the upload.');
            }

            const selectColumns = supportsAttendance
                ? 'id, reference_id, status, first_name, middle_name, last_name, suffix, priority_course, alt_course_1, alt_course_2, current_choice, test_date, interview_date, time_in, time_out'
                : 'id, reference_id, status, first_name, middle_name, last_name, suffix, priority_course, alt_course_1, alt_course_2, current_choice, test_date, interview_date';

            const { data: matchedApplications, error } = await supabase
                .from('applications')
                .select(selectColumns)
                .in('reference_id', uniqueReferenceIds);

            if (error) throw error;

            const applicationMap = new Map(
                (matchedApplications || []).map((application: any) => [normalizeReferenceId(application.reference_id), application])
            );

            const previewRows = extractedRows.map((row) => {
                if (!row.referenceId) {
                    return {
                        ...row,
                        matchStatus: 'missing_reference',
                        note: 'Missing reference_id in this row.'
                    };
                }

                if (duplicateReferenceIds.has(row.referenceId)) {
                    return {
                        ...row,
                        matchStatus: 'duplicate_reference',
                        note: 'Duplicate reference_id found in the uploaded file.'
                    };
                }

                const matchedApplication = applicationMap.get(row.referenceId);
                if (!matchedApplication) {
                    return {
                        ...row,
                        matchStatus: 'not_found',
                        note: 'Reference ID was not found in the applications table.'
                    };
                }

                const systemName = buildApplicantName(matchedApplication);
                const nameMismatch = Boolean(
                    row.applicantName
                    && systemName
                    && normalizeApplicantName(row.applicantName) !== normalizeApplicantName(systemName)
                );

                const readyForRelease = supportsAttendance
                    ? hasCompletedAttendance(matchedApplication)
                    : String(matchedApplication.status || '') === 'Test Taken';

                if (isNatFinalizedStatus(matchedApplication.status)) {
                    return {
                        ...row,
                        appId: matchedApplication.id,
                        systemName,
                        currentStatus: matchedApplication.status,
                        routeLabel: getApplicantRouteLabel(matchedApplication),
                        matchStatus: 'already_finalized',
                        note: `Already tagged as ${matchedApplication.status}.${nameMismatch ? ' Uploaded name differs from the system record.' : ''}`
                    };
                }

                if (!readyForRelease) {
                    return {
                        ...row,
                        appId: matchedApplication.id,
                        systemName,
                        currentStatus: matchedApplication.status || 'Submitted',
                        routeLabel: getApplicantRouteLabel(matchedApplication),
                        matchStatus: 'not_ready',
                        note: `Applicant is still ${matchedApplication.status || 'Submitted'} and cannot be released yet.${nameMismatch ? ' Uploaded name differs from the system record.' : ''}`
                    };
                }

                return {
                    ...row,
                    appId: matchedApplication.id,
                    systemName,
                    currentStatus: matchedApplication.status || 'Test Taken',
                    routeLabel: getApplicantRouteLabel(matchedApplication),
                    matchStatus: 'ready',
                    note: nameMismatch
                        ? 'Reference ID matched. Uploaded name differs from the system record.'
                        : 'Ready to mark as passed.'
                };
            });

            const readyCount = previewRows.filter((row) => row.matchStatus === 'ready').length;
            setBulkPassRows(previewRows);
            setBulkPassFileName(file.name);
            setShowBulkPassModal(true);
            showToast(`${readyCount} applicant${readyCount !== 1 ? 's are' : ' is'} ready for bulk pass.`, readyCount > 0 ? 'success' : 'info');
        } catch (error: any) {
            showToast(error.message || 'Failed to parse the bulk pass file.', 'error');
        } finally {
            if (event?.target) {
                event.target.value = '';
            }
        }
    };

    const applyBulkPassList = async () => {
        const readyRows = bulkPassRows.filter((row) => row.matchStatus === 'ready' && row.appId);
        if (readyRows.length === 0) {
            showToast('No matched applicants are ready to be marked as passed.', 'info');
            return;
        }

        setBulkPassApplying(true);
        try {
            const applicationIds = [...new Set(readyRows.map((row) => row.appId).filter(Boolean))];
            for (let index = 0; index < applicationIds.length; index += 100) {
                const chunk = applicationIds.slice(index, index + 100);
                const { error } = await supabase
                    .from('applications')
                    .update({ status: PASS_STATUS })
                    .in('id', chunk);
                if (error) throw error;
            }

            showToast(`${applicationIds.length} applicant${applicationIds.length !== 1 ? 's were' : ' was'} marked as ${PASS_STATUS}.`, 'success');
            closeBulkPassModal();
            fetchData();
        } catch (error: any) {
            showToast(error.message || 'Bulk pass update failed.', 'error');
        } finally {
            setBulkPassApplying(false);
        }
    };

    const bulkPassSummary = useMemo(() => bulkPassRows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.matchStatus] = (acc[row.matchStatus] || 0) + 1;
        return acc;
    }, {}), [bulkPassRows]);

    const statusSections = useMemo(() => {
        const rows = summaryApplications || [];
        return [
            {
                id: 'awaiting_results',
                label: 'Awaiting Result Tagging',
                description: 'Applicants who finished the NAT and still need a release decision.',
                rows: rows.filter((app: any) => isCompletedNatRecord(app) && !isNatFinalizedStatus(app.status))
            },
            {
                id: 'passed_nat',
                label: 'Passed NAT',
                description: 'Applicants released as qualified for interview.',
                rows: rows.filter((app: any) => String(app.status || '') === PASS_STATUS || String(app.status || '') === 'Passed')
            },
            {
                id: 'interview_scheduled',
                label: 'Interview Scheduled',
                description: 'Applicants already endorsed to the department interview schedule.',
                rows: rows.filter((app: any) => String(app.status || '') === INTERVIEW_STATUS)
            },
            {
                id: 'approved_enrollment',
                label: 'Approved for Enrollment',
                description: 'Applicants fully cleared by the department for student activation.',
                rows: rows.filter((app: any) => String(app.status || '') === APPROVED_STATUS)
            },
            {
                id: 'forwarded_alternatives',
                label: 'Forwarded to Alternatives',
                description: 'Applicants redirected to 2nd or 3rd choice interviews.',
                rows: rows.filter((app: any) => isNatForwardedStatus(app.status))
            },
            {
                id: 'rejected_unsuccessful',
                label: 'Rejected / Unsuccessful',
                description: 'Applicants who failed the NAT or exhausted all course choices.',
                rows: rows.filter((app: any) => isNatRejectedStatus(app.status))
            }
        ];
    }, [summaryApplications, supportsAttendance]);

    const activeStatusSection = statusSections.find((section) => section.id === statusBoardFilter) || statusSections[0];

    return (
        <div className="space-y-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">NORSU ADMISSION TEST DASHBOARD</h1>
                    <p className="text-gray-500 text-sm">Manage NAT applications, schedules, and course quotas.</p>
                </div>
                <button
                    onClick={handleRefreshData}
                    disabled={isRefreshingData}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 shadow-sm hover:text-purple-600 disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />
                    <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
            </div>

            <input
                ref={bulkPassInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleBulkPassFileChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Total Applications</p><p className="text-xl font-bold">{summaryApplications.length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Submitted</p><p className="text-xl font-bold">{summaryApplications.filter(a => a.status === 'Scheduled' || a.status === 'Submitted').length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Test Takers</p><p className="text-xl font-bold">{summaryApplications.filter(isCompletedNatRecord).length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Processed Results</p><p className="text-xl font-bold">{summaryApplications.filter(a => isNatFinalizedStatus(a.status)).length}</p></div>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
                {['applications', 'test takers', 'status board', 'completed', 'schedules', 'requirements', 'limits'].map(t => (
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
                                        <tr key={app.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { void openApplicantDetails(app); }}>
                                            <td className="p-4 font-bold">{app.first_name} {app.last_name}<div className="text-xs text-gray-400 font-normal">{app.reference_id}</div></td>
                                            <td className="p-4"><StatusBadge status={app.status} /></td>
                                            <td className="p-4">{app.priority_course}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); void openApplicantDetails(app); }} className="text-blue-600 font-bold text-xs cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">View</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app, PASS_STATUS); }} className="text-green-600 font-bold text-xs cursor-pointer hover:bg-green-50 px-2 py-1 rounded transition-colors">Pass</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app, FAIL_STATUS); }} className="text-red-600 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Fail</button>
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
                            <div className="flex flex-wrap items-center justify-end gap-3">
                                <span className="text-xs text-gray-500 font-bold">{filteredResults.length} applicant{filteredResults.length !== 1 ? 's' : ''}</span>
                                <select value={testTakersCourseFilter} onChange={e => setTestTakersCourseFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-sm"><option value="All">All Courses</option>{courseLimits.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                                <button
                                    type="button"
                                    onClick={handleDownloadBulkPassTemplate}
                                    className="text-emerald-700 text-sm font-bold flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded"
                                >
                                    <FileText size={14} /> Template
                                </button>
                                <button
                                    type="button"
                                    onClick={() => bulkPassInputRef.current?.click()}
                                    className="text-purple-700 text-sm font-bold flex items-center gap-1 hover:bg-purple-50 px-2 py-1 rounded"
                                >
                                    <Upload size={14} /> Bulk Pass
                                </button>
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
                                        <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { void openApplicantDetails(r); }}>
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
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); void openApplicantDetails(r); }} className="text-blue-600 font-bold text-xs cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">View</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r, PASS_STATUS); }} className="text-green-600 font-bold text-xs cursor-pointer hover:bg-green-50 px-2 py-1 rounded transition-colors">Pass</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r, FAIL_STATUS); }} className="text-red-500 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Fail</button>
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
                ) : activeTab === 'status board' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {statusSections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => setStatusBoardFilter(section.id)}
                                    className={`text-left rounded-xl border p-4 shadow-sm transition ${activeStatusSection?.id === section.id
                                        ? 'border-purple-200 bg-purple-50 shadow-purple-100'
                                        : 'border-gray-100 bg-white hover:border-purple-100 hover:bg-purple-50/40'
                                        }`}
                                >
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{section.label}</p>
                                    <p className="mt-2 text-2xl font-extrabold text-gray-900">{section.rows.length}</p>
                                    <p className="mt-2 text-xs text-gray-500 leading-relaxed">{section.description}</p>
                                </button>
                            ))}
                        </div>

                        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="font-bold">{activeStatusSection?.label || 'Status Board'}</h3>
                                    <p className="text-xs text-gray-400">{activeStatusSection?.description || 'Review released NAT outcomes and admissions routing.'}</p>
                                </div>
                                <span className="text-xs text-gray-500 font-bold">{activeStatusSection?.rows.length || 0} applicant{(activeStatusSection?.rows.length || 0) !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="p-4">Applicant</th>
                                            <th className="p-4">Ref ID</th>
                                            <th className="p-4">Current Route</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Schedule / Test Date</th>
                                            <th className="p-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(activeStatusSection?.rows || []).length === 0 ? (
                                            <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">No applicants are in this NAT status yet.</td></tr>
                                        ) : (activeStatusSection?.rows || []).map((app: any) => (
                                            <tr key={app.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { void openApplicantDetails(app); }}>
                                                <td className="p-4 font-bold">
                                                    {buildApplicantName(app)}
                                                    <div className="text-xs text-gray-400 font-normal">{app.student_id || 'Student ID pending'}</div>
                                                </td>
                                                <td className="p-4 text-xs text-gray-400 font-mono">{app.reference_id}</td>
                                                <td className="p-4 text-gray-700">{getApplicantRouteLabel(app)}</td>
                                                <td className="p-4"><StatusBadge status={app.status} /></td>
                                                <td className="p-4 text-gray-600 text-xs">
                                                    {String(app.status || '') === INTERVIEW_STATUS
                                                        ? (app.interview_date || 'Interview date pending')
                                                        : formatDate(app.test_date)}
                                                </td>
                                                <td className="p-4">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); void openApplicantDetails(app); }} className="text-blue-600 font-bold text-xs cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">View</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'completed' ? (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold">Completed Logs</h3>
                                <p className="text-xs text-gray-400">Released NAT results and department admissions outcomes.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 font-bold">{completedApplications.length} record{completedApplications.length !== 1 ? 's' : ''}</span>
                                <select value={completedFilter} onChange={e => setCompletedFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
                                    <option value="All">All Status</option>
                                    <option value="Passed">Passed NAT (Legacy)</option>
                                    <option value="Qualified for Interview (1st Choice)">Passed NAT (Interview Prep)</option>
                                    <option value="Interview Scheduled">Interview Scheduled</option>
                                    <option value="Approved for Enrollment">Approved for Enrollment</option>
                                    <option value="Forwarded to 2nd Choice for Interview">Forwarded to 2nd Choice</option>
                                    <option value="Forwarded to 3rd Choice for Interview">Forwarded to 3rd Choice</option>
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
                                        <tr key={app.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { void openApplicantDetails(app); }}>
                                            <td className="p-4 font-bold">{app.first_name} {app.last_name}</td>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{app.reference_id}</td>
                                            <td className="p-4">{app.priority_course}</td>
                                            <td className="p-4"><StatusBadge status={app.status} /></td>
                                            <td className="p-4 text-gray-500 text-xs">{formatDate(app.created_at)}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); void openApplicantDetails(app); }} className="text-blue-600 font-bold text-xs cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">View</button>
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
                        <div className="flex justify-end"><button onClick={openAddScheduleModal} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold">+ Add Schedule</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {schedules.map(sch => (
                                <div key={sch.id} className="bg-white p-4 rounded-xl border shadow-sm">
                                    <div className="flex justify-between items-start gap-3 mb-2">
                                        <span className="font-bold text-gray-800">{formatDate(sch.date)}</span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleSchedule(sch)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${sch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{sch.is_active ? 'Active' : 'Closed'}</button>
                                            <button
                                                type="button"
                                                onClick={() => openEditScheduleModal(sch)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100"
                                            >
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSchedule(sch)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100"
                                            >
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
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
                ) : activeTab === 'requirements' ? (
                    <div className="space-y-4">
                        <div className="bg-white border rounded-xl p-4 shadow-sm">
                            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">NAT Requirements</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        These items appear in the applicant NAT portal dashboard and in the NAT application received email.
                                    </p>
                                </div>
                                <form onSubmit={handleAddRequirement} className="flex w-full gap-2 md:max-w-xl">
                                    <input
                                        value={newRequirementName}
                                        onChange={(e) => setNewRequirementName(e.target.value)}
                                        placeholder="Add a requirement name"
                                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!String(newRequirementName || '').trim() || isSavingRequirement}
                                        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold disabled:opacity-60"
                                    >
                                        {isSavingRequirement ? 'Adding...' : 'Add'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                            {natRequirements.length === 0 ? (
                                <div className="p-6 text-sm text-gray-500">No NAT requirements added yet.</div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="p-4">Requirement</th>
                                            <th className="p-4">Created</th>
                                            <th className="p-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {natRequirements.map((requirement: any) => (
                                            <tr key={requirement.id}>
                                                <td className="p-4 font-medium text-gray-800">{requirement.name}</td>
                                                <td className="p-4 text-xs text-gray-500">{formatDateTime(requirement.created_at)}</td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteRequirement(requirement)}
                                                        disabled={pendingRequirementDeleteId === requirement.id}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                    >
                                                        <Trash2 size={12} />
                                                        {pendingRequirementDeleteId === requirement.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
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
                                        <button onClick={closeSelectedAppModal} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                                    </div>
                                </div>

                                {isLoadingSelectedApp ? (
                                    <div className="py-16 text-center text-sm font-medium text-gray-500">Loading applicant details...</div>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 flex flex-wrap gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                                {!isNatFinalizedStatus(selectedApp.status) && (
                                    <>
                                        <button onClick={() => updateStatus(selectedApp, PASS_STATUS)} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-200/50 hover:shadow-xl transition-all">Pass</button>
                                        <button onClick={() => updateStatus(selectedApp, FAIL_STATUS)} className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200/50 hover:shadow-xl transition-all">Fail</button>
                                    </>
                                )}
                                <button onClick={closeSelectedAppModal} className="w-full py-2 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors">Close</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showBulkPassModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-purple-100">
                            <div className="p-6 border-b bg-gray-50 flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="font-extrabold text-lg text-gray-900">Bulk Pass Preview</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        File: <span className="font-semibold text-gray-700">{bulkPassFileName || 'Uploaded list'}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Matching uses <span className="font-bold">reference_id</span> only. Applicant name is shown only for checking.</p>
                                </div>
                                <button type="button" onClick={closeBulkPassModal} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                            </div>

                            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-148px)]">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-green-700">Ready to Pass</p>
                                        <p className="mt-2 text-2xl font-extrabold text-green-900">{bulkPassSummary.ready || 0}</p>
                                    </div>
                                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Already Finalized</p>
                                        <p className="mt-2 text-2xl font-extrabold text-amber-900">{bulkPassSummary.already_finalized || 0}</p>
                                    </div>
                                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Not Ready Yet</p>
                                        <p className="mt-2 text-2xl font-extrabold text-blue-900">{bulkPassSummary.not_ready || 0}</p>
                                    </div>
                                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Missing / Invalid</p>
                                        <p className="mt-2 text-2xl font-extrabold text-rose-900">{(bulkPassSummary.missing_reference || 0) + (bulkPassSummary.duplicate_reference || 0) + (bulkPassSummary.not_found || 0)}</p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-900 flex items-start gap-2">
                                    <ArrowRightLeft size={14} className="mt-0.5 shrink-0" />
                                    <p>
                                        Uploaded names will never override the system record. They are displayed only to help staff confirm that the uploaded reference list matches the intended applicants.
                                    </p>
                                </div>

                                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                            <tr>
                                                <th className="p-4">Row</th>
                                                <th className="p-4">Reference ID</th>
                                                <th className="p-4">Uploaded Name</th>
                                                <th className="p-4">Matched Applicant</th>
                                                <th className="p-4">Current Route</th>
                                                <th className="p-4">Current Status</th>
                                                <th className="p-4">Preview</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {bulkPassRows.length === 0 ? (
                                                <tr><td colSpan={7} className="p-8 text-center text-gray-400 text-sm">No parsed rows found in the uploaded file.</td></tr>
                                            ) : bulkPassRows.map((row: any) => (
                                                <tr key={`${row.referenceId || 'row'}-${row.rowNumber}`} className="hover:bg-gray-50">
                                                    <td className="p-4 text-xs text-gray-500 font-mono">{row.rowNumber}</td>
                                                    <td className="p-4 font-mono text-xs text-gray-700">{row.referenceId || '—'}</td>
                                                    <td className="p-4 text-gray-700">{row.applicantName || '—'}</td>
                                                    <td className="p-4 text-gray-800 font-medium">{row.systemName || 'No match found'}</td>
                                                    <td className="p-4 text-gray-600">{row.routeLabel || '—'}</td>
                                                    <td className="p-4">{row.currentStatus ? <StatusBadge status={row.currentStatus} /> : '—'}</td>
                                                    <td className="p-4">
                                                        <div className="space-y-1">
                                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${row.matchStatus === 'ready'
                                                                ? 'bg-green-100 text-green-700'
                                                                : row.matchStatus === 'already_finalized'
                                                                    ? 'bg-amber-100 text-amber-700'
                                                                    : row.matchStatus === 'not_ready'
                                                                        ? 'bg-blue-100 text-blue-700'
                                                                        : 'bg-rose-100 text-rose-700'
                                                                }`}>
                                                                {row.matchStatus === 'ready' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                {row.matchStatus === 'ready'
                                                                    ? 'Ready'
                                                                    : row.matchStatus === 'already_finalized'
                                                                        ? 'Finalized'
                                                                        : row.matchStatus === 'not_ready'
                                                                            ? 'Not Ready'
                                                                            : 'Needs Review'}
                                                            </span>
                                                            <p className="text-xs text-gray-500 leading-relaxed">{row.note}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
                                <button type="button" onClick={closeBulkPassModal} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-white">Close</button>
                                <button
                                    type="button"
                                    onClick={applyBulkPassList}
                                    disabled={bulkPassApplying || !(bulkPassSummary.ready > 0)}
                                    className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-60"
                                >
                                    {bulkPassApplying ? 'Applying...' : `Apply Bulk Pass (${bulkPassSummary.ready || 0})`}
                                </button>
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
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</h3>
                                    {isEditingLegacySchedule && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            This older schedule has no saved time blocks yet. Add one or more time slots below to convert it.
                                        </p>
                                    )}
                                    {isScheduleDateLocked && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            Date is locked because applicants are already assigned to this schedule. You can still update venue and time slots.
                                        </p>
                                    )}
                                </div>
                                <button type="button" onClick={closeScheduleModal} className="text-gray-400 hover:text-gray-600">
                                    <XCircle />
                                </button>
                            </div>
                            <form onSubmit={handleSaveSchedule} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold block mb-1">Date</label>
                                        <input
                                            type="date"
                                            className="w-full border rounded p-2 disabled:bg-gray-100 disabled:text-gray-500"
                                            value={scheduleForm.date}
                                            onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                                            disabled={isScheduleDateLocked}
                                            required
                                        />
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
                                <div className="flex gap-3">
                                    <button type="button" onClick={closeScheduleModal} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-bold">Cancel</button>
                                    <button disabled={isSavingSchedule} className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold disabled:opacity-60">
                                        {isSavingSchedule ? (editingSchedule ? 'Saving...' : 'Adding...') : (editingSchedule ? 'Save Changes' : 'Save')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default NATManagementPage;

