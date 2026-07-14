import { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, FileText, Pencil, Plus, RefreshCw, Trash2, Upload, XCircle } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import type { TablesUpdate } from '../../../../../types/database';
import { loadJsPdfAutoTable, loadXlsx } from '../../../../../lib/exportVendors';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { savePdf } from '../../../../../utils/dashboardUtils';
import { formatDate, formatDateTime, formatTime, generateExportFilename } from '../../../../../utils/formatters';
import { buildCsv } from '../../../../../utils/inputSecurity';
import StatusBadge from '../../../../../components/StatusBadge';
import { Button } from '../../../../../components/ui/Button';
import { getAdmissionSchedules, getApplicationsPage, getCompletedApplicationsPage, getCoursesForNat, getNatAttendanceSupport, getNatSummaryApplications } from '../../../../../services/natService';
import { getApplicationDetailsById } from '../../../../../services/applicationDetailsService';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';

import {
    PASS_STATUS,
    FAIL_STATUS,
    APPROVED_STATUS,
    ENROLLED_STATUS,
    INTERVIEW_STATUS,
    UNSUCCESSFUL_STATUS,
    BULK_PASS_TEMPLATE_HEADERS,
    NAT_PAGE_SIZE,
    NAT_TABLE_SHELL_CLASS
} from '../constants';
import {
    getTotalPages,
    paginateLocalRows,
    buildPaginationItems,
    renderTablePaddingRows,
    isNatFinalizedStatus,
    hasTakenNatStatus,
    isNatForwardedStatus,
    isNatRejectedStatus,
    isNatEnrolledStatus,
    normalizeReferenceId,
    normalizeApplicantName,
    buildApplicantName,
    getApplicantRouteLabel,
    getSheetColumnValue,
    createEmptyScheduleForm,
    canMarkNatPassed
} from '../utils';

export function useCareStaffNat({ showToast }: any) {
    const { canPerformAction } = usePermissions();
    const canArchiveRecords = canPerformAction('archive_records');
    const [activeTab, setActiveTab] = useState('applications');
    const queryClient = useQueryClient();

    // Redundant state setters defined to maintain backwards-compatibility with destructuring components
    const setApplications = (val?: any) => { };
    const setCompletedApplications = (val?: any) => { };
    const setTestTakers = (val?: any) => { };
    const setSummaryApplications = (val?: any) => { };
    const setSchedules = (val?: any) => { };
    const setCourseLimits = (val?: any) => { };
    const setNatRequirements = (val?: any) => { };
    const setInactiveNatRequirements = (val?: any) => { };
    const setSupportsAttendance = (val?: any) => { };
    const setLoading = (val?: any) => { };
    const setApplicationsTotal = (val?: any) => { };
    const setCompletedTotal = (val?: any) => { };
    const setTestTakersTotal = (val?: any) => { };

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
    const [statusBoardPage, setStatusBoardPage] = useState(1);
    const [requirementsPage, setRequirementsPage] = useState(1);
    const [limitsPage, setLimitsPage] = useState(1);

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

    // React Query hooks for fetching data
    const { data: qApplicationsData, isLoading: qApplicationsLoading } = useQuery({
        queryKey: ['care_staff_nat_applications', searchTerm, applicationsPage],
        queryFn: () => getApplicationsPage(
            { mode: 'applications', search: searchTerm },
            { page: applicationsPage, pageSize: NAT_PAGE_SIZE }
        )
    });

    const { data: qCompletedData, isLoading: qCompletedLoading } = useQuery({
        queryKey: ['care_staff_nat_completed', completedFilter, completedPage],
        queryFn: () => getCompletedApplicationsPage(
            { mode: 'completed', status: completedFilter },
            { page: completedPage, pageSize: NAT_PAGE_SIZE }
        )
    });

    const { data: qTestTakersData, isLoading: qTestTakersLoading } = useQuery({
        queryKey: ['care_staff_nat_test_takers', testTakersCourseFilter, testTakersPage],
        queryFn: () => getApplicationsPage(
            { mode: 'test_takers', course: testTakersCourseFilter },
            { page: testTakersPage, pageSize: NAT_PAGE_SIZE }
        )
    });

    const { data: qLookupsData, isLoading: qLookupsLoading } = useQuery({
        queryKey: ['care_staff_nat_lookups'],
        queryFn: async () => {
            await getNatAttendanceSupport();
            const [scheds, courses, summaryRows, natRequirementsResult] = await Promise.all([
                getAdmissionSchedules(),
                getCoursesForNat(),
                getNatSummaryApplications(),
                supabase
                    .from('nat_requirements')
                    .select('id, name, created_at, is_active')
                    .order('created_at', { ascending: true })
            ]);
            if (natRequirementsResult.error) throw natRequirementsResult.error;
            return {
                schedules: scheds || [],
                courseLimits: courses || [],
                summaryApplications: summaryRows.rows || [],
                supportsAttendance: summaryRows.supportsAttendance,
                natRequirements: (natRequirementsResult.data || []).filter((row: any) => row.is_active !== false),
                inactiveNatRequirements: (natRequirementsResult.data || []).filter((row: any) => row.is_active === false)
            };
        }
    });

    // Mapped variables from React Query caching
    const applications = qApplicationsData?.rows || [];
    const applicationsTotal = qApplicationsData?.total || 0;

    const completedApplications = qCompletedData?.rows || [];
    const completedTotal = qCompletedData?.total || 0;

    const testTakers = qTestTakersData?.rows || [];
    const testTakersTotal = qTestTakersData?.total || 0;

    const schedules = qLookupsData?.schedules || [];
    const courseLimits = qLookupsData?.courseLimits || [];
    const natRequirements = qLookupsData?.natRequirements || [];
    const inactiveNatRequirements = qLookupsData?.inactiveNatRequirements || [];
    const supportsAttendance = qLookupsData?.supportsAttendance ?? true;
    const summaryApplications = qLookupsData?.summaryApplications || [];

    const loading = qApplicationsLoading || qCompletedLoading || qTestTakersLoading || qLookupsLoading;

    const invalidateNatData = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['care_staff_nat_applications'] }),
            queryClient.invalidateQueries({ queryKey: ['care_staff_nat_completed'] }),
            queryClient.invalidateQueries({ queryKey: ['care_staff_nat_test_takers'] }),
            queryClient.invalidateQueries({ queryKey: ['care_staff_nat_lookups'] })
        ]);
    };

    const fetchData = async () => {
        await invalidateNatData();
    };

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await invalidateNatData();
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
            showToast('Failed to load applicant details.', 'error');
        } finally {
            setIsLoadingSelectedApp(false);
        }
    };

    const updateStatus = async (application, newStatus) => {
        const id = application?.id;
        console.log(`[DEBUG] Attempting to update status for ID: ${id} to ${newStatus}`);
        if (!id) {
            showToast("Invalid application.", 'error');
            return;
        }

        if (newStatus === PASS_STATUS && !canMarkNatPassed(application)) {
            showToast('Record both Time In and Time Out before marking this applicant as passed.', 'error');
            return;
        }

        try {
            console.log("[DEBUG] Sending update request to Supabase...");
            let updateQuery = supabase
                .from('applications')
                .update({ status: newStatus })
                .eq('id', id);

            if (newStatus === PASS_STATUS) {
                updateQuery = updateQuery
                    .not('time_in', 'is', null)
                    .not('time_out', 'is', null);
            }

            const { data: updatedApplication, error } = await updateQuery
                .select('id')
                .maybeSingle();

            if (error) {
                console.error("[DEBUG] Supabase Error:", error);
                showToast(`Error.`, 'error');
                return;
            }

            if (!updatedApplication) {
                showToast('Attendance changed before the result was saved. Refresh and try again.', 'error');
                return;
            }

            console.log("[DEBUG] Update successful!");
            try {
                if (application?.email) {
                    const emailResult = await sendTransactionalEmailNotification({
                        type: 'NAT_RESULT',
                        email: application.email,
                        name: [application.first_name, application.last_name].filter(Boolean).join(' ') || 'Applicant',
                        status: newStatus
                    }, 'Failed to send NAT result email.');
                    if (!emailResult.emailSent) {
                        console.error('[DEBUG] NAT result email failed:', emailResult.emailError);
                    }
                }
            } catch (emailError) {
                console.error('[DEBUG] NAT result email failed:', emailError);
            }
            showToast(`Status updated to ${newStatus}`);
            fetchData();
            setShowModal(false);
        } catch (err) {
            console.error("[DEBUG] Unexpected Error:", err);
            showToast(`Something went wrong. Please try again..`, 'error');
        }
    };

    const archiveApplication = async (id) => {
        if (!window.confirm('Archive this application and move it out of the live NAT list?')) return;
        try {
            await managedArchiveService.archiveNatApplication(String(id || '').trim());
            showToast('Application archived.', 'success');
            await fetchData();
            setShowModal(false);
        } catch (error: any) {
            showToast('Failed to archive application.', 'error');
        }
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

                showToast('Schedule updated.', 'success');
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

            showToast('Schedule added.', 'success');
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

    useEffect(() => {
        setStatusBoardPage(1);
    }, [statusBoardFilter]);

    useEffect(() => {
        setApplicationsPage((prev) => Math.min(prev, getTotalPages(applicationsTotal)));
    }, [applicationsTotal]);

    useEffect(() => {
        setCompletedPage((prev) => Math.min(prev, getTotalPages(completedTotal)));
    }, [completedTotal]);

    useEffect(() => {
        setTestTakersPage((prev) => Math.min(prev, getTotalPages(testTakersTotal)));
    }, [testTakersTotal]);

    const toggleSchedule = async (sch) => {
        try {
            await managedArchiveService.setNatScheduleActive(Number(sch.id), !sch.is_active);
            showToast(`Schedule ${sch.is_active ? 'closed' : 'reopened'}.`, 'success');
            await fetchData();
        } catch (error: any) {
            showToast('Failed to update schedule.', 'error');
        }
    };

    const handleUpdateLimit = async (id, field, value) => {
        try {
            if (field === 'status') {
                const nextStatus = value === 'Closed' ? 'Closed' : 'Open';
                await managedArchiveService.setNatCourseStatus(Number(id), nextStatus);
                showToast(`Course ${nextStatus === 'Closed' ? 'closed' : 'reopened'}.`, 'success');
            } else {
                await supabase.from('courses').update({ [field]: value } as TablesUpdate<'courses'>).eq('id', id);
                showToast("Limit updated!");
            }
            await fetchData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const handleDeleteCourse = async (courseName: string, id: number) => {
        const confirmClose = window.confirm(
            `Close the course "${courseName}" for new NAT activity?\n\n` +
            `This keeps current records intact and hides the course from active use until it is reopened.`
        );
        if (!confirmClose) return;

        setLoading(true);
        try {
            await managedArchiveService.setNatCourseStatus(id, 'Closed');
            showToast(`Course "${courseName}" closed.`, 'success');
            await fetchData();
        } catch (err: any) {
            console.error("Close sequence failed:", err);
            showToast(`Couldn't close course..`, 'error');
        } finally {
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
                .insert({ name: nextName, is_active: true });

            if (error) throw error;

            setNewRequirementName('');
            showToast('NAT requirement added.', 'success');
            await fetchData();
        } catch (error: any) {
            showToast('Failed to add NAT requirement.', 'error');
        } finally {
            setIsSavingRequirement(false);
        }
    };

    const handleDeleteRequirement = async (requirement: any) => {
        const requirementId = Number(requirement?.id || 0);
        if (!requirementId || pendingRequirementDeleteId === requirementId) return;
        if (!window.confirm(`Deactivate requirement "${requirement?.name || 'this item'}"?`)) return;

        setPendingRequirementDeleteId(requirementId);
        try {
            await managedArchiveService.deactivateNatRequirement(requirementId);
            showToast('NAT requirement deactivated.', 'success');
            await fetchData();
        } catch (error: any) {
            showToast('Failed to deactivate NAT requirement.', 'error');
        } finally {
            setPendingRequirementDeleteId(null);
        }
    };

    const filteredApplications = applications;
    const filteredResults = testTakers;
    const isCompletedNatRecord = (app: any) => supportsAttendance ? canMarkNatPassed(app) : hasTakenNatStatus(app?.status);
    const getNatCompletedDateLabel = (app: any) => formatDate(app?.completed_at || app?.archived_at || app?.created_at);

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
        if (!window.confirm(`${sch.is_active ? 'Close' : 'Reopen'} the NAT schedule for ${formatDate(sch.date)} at ${sch.venue || 'the selected venue'}?`)) {
            return;
        }

        try {
            await managedArchiveService.setNatScheduleActive(Number(sch.id), !sch.is_active);
        } catch (error: any) {
            showToast('Failed to update schedule.', 'error');
            return;
        }

        if (editingSchedule?.id === sch.id) {
            closeScheduleModal();
        }

        showToast(`Schedule ${sch.is_active ? 'closed' : 'reopened'} successfully!`, 'success');
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
        if (filteredApplications.length === 0) { showToast("There are no applications to export.", 'info'); return; }
        const headers = ["Reference ID", "First Name", "Last Name", "Email", "Mobile", "Course Preference", "Status", "Test Date"];
        const rows = filteredApplications.map(app => [
            app.reference_id,
            app.first_name,
            app.last_name,
            app.email,
            app.mobile,
            app.priority_course,
            app.status,
            app.test_date || ''
        ]);
        const csvContent = buildCsv([headers, ...rows]);
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

                const readyForRelease = canMarkNatPassed(matchedApplication);

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
                const { data: updatedApplications, error } = await supabase
                    .from('applications')
                    .update({ status: PASS_STATUS })
                    .in('id', chunk)
                    .not('time_in', 'is', null)
                    .not('time_out', 'is', null)
                    .select('id');
                if (error) throw error;
                if ((updatedApplications || []).length !== chunk.length) {
                    throw new Error('Some attendance records changed. Refresh the list and try again.');
                }
            }

            showToast(`${applicationIds.length} applicants marked as ${PASS_STATUS}.`, 'success');
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
                id: 'enrolled_students',
                label: 'Enrolled Students',
                description: 'Applicants already activated and moved into archived NAT history.',
                rows: rows.filter((app: any) => isNatEnrolledStatus(app.status))
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
    const activeStatusRows = activeStatusSection?.rows || [];
    const paginatedStatusRows = useMemo(
        () => paginateLocalRows(activeStatusRows, statusBoardPage),
        [activeStatusRows, statusBoardPage]
    );
    const paginatedRequirements = useMemo(
        () => paginateLocalRows(natRequirements, requirementsPage),
        [natRequirements, requirementsPage]
    );
    const paginatedCourseLimits = useMemo(
        () => paginateLocalRows(courseLimits, limitsPage),
        [courseLimits, limitsPage]
    );

    useEffect(() => {
        setStatusBoardPage((prev) => Math.min(prev, getTotalPages(activeStatusRows.length)));
    }, [activeStatusRows.length]);

    useEffect(() => {
        setRequirementsPage((prev) => Math.min(prev, getTotalPages(natRequirements.length)));
    }, [natRequirements.length]);

    useEffect(() => {
        setLimitsPage((prev) => Math.min(prev, getTotalPages(courseLimits.length)));
    }, [courseLimits.length]);

    return {
        canPerformAction,
        canArchiveRecords,
        activeTab,
        setActiveTab,
        applications,
        setApplications,
        completedApplications,
        setCompletedApplications,
        testTakers,
        setTestTakers,
        summaryApplications,
        setSummaryApplications,
        schedules,
        setSchedules,
        courseLimits,
        setCourseLimits,
        natRequirements,
        setNatRequirements,
        inactiveNatRequirements,
        setInactiveNatRequirements,
        supportsAttendance,
        setSupportsAttendance,
        loading,
        setLoading,
        isRefreshingData,
        setIsRefreshingData,
        newRequirementName,
        setNewRequirementName,
        isSavingRequirement,
        setIsSavingRequirement,
        pendingRequirementDeleteId,
        setPendingRequirementDeleteId,
        searchTerm,
        setSearchTerm,
        testTakersCourseFilter,
        setTestTakersCourseFilter,
        completedFilter,
        setCompletedFilter,
        applicationsPage,
        setApplicationsPage,
        completedPage,
        setCompletedPage,
        testTakersPage,
        setTestTakersPage,
        statusBoardPage,
        setStatusBoardPage,
        requirementsPage,
        setRequirementsPage,
        limitsPage,
        setLimitsPage,
        applicationsTotal,
        setApplicationsTotal,
        completedTotal,
        setCompletedTotal,
        testTakersTotal,
        setTestTakersTotal,
        showModal,
        setShowModal,
        selectedApp,
        setSelectedApp,
        isLoadingSelectedApp,
        setIsLoadingSelectedApp,
        showScheduleModal,
        setShowScheduleModal,
        editingSchedule,
        setEditingSchedule,
        isScheduleDateLocked,
        setIsScheduleDateLocked,
        isSavingSchedule,
        setIsSavingSchedule,
        showBulkPassModal,
        setShowBulkPassModal,
        bulkPassRows,
        setBulkPassRows,
        bulkPassFileName,
        setBulkPassFileName,
        bulkPassApplying,
        setBulkPassApplying,
        statusBoardFilter,
        setStatusBoardFilter,
        scheduleForm,
        setScheduleForm,
        bulkPassInputRef,
        normalizeTimeSlots,
        parseTimeToMinutes,
        fetchData,
        handleRefreshData,
        closeSelectedAppModal,
        openApplicantDetails,
        updateStatus,
        archiveApplication,
        closeScheduleModal,
        handleSaveSchedule,
        addTimeSlotRow,
        updateTimeSlotRow,
        removeTimeSlotRow,
        toggleSchedule,
        handleUpdateLimit,
        handleDeleteCourse,
        handleAddRequirement,
        handleDeleteRequirement,
        filteredApplications,
        filteredResults,
        isCompletedNatRecord,
        getNatCompletedDateLabel,
        dateApplicantCounts,
        dateTimeApplicantCounts,
        openAddScheduleModal,
        openEditScheduleModal,
        handleDeleteSchedule,
        isEditingLegacySchedule,
        formatTime12h,
        formatAssignedSlot,
        handleExportPDF,
        handleExportCSV,
        handleDownloadBulkPassTemplate,
        closeBulkPassModal,
        handleBulkPassFileChange,
        applyBulkPassList,
        bulkPassSummary,
        statusSections,
        activeStatusSection,
        activeStatusRows,
        paginatedStatusRows,
        paginatedRequirements,
        paginatedCourseLimits
    };
}
