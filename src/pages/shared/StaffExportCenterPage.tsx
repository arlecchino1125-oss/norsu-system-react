import React, { useCallback, useMemo, useState } from 'react';
import { Download, FileText, Loader2, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDepartmentInterviewQueue } from '../../services/deptService';
import { generateExportFilename } from '../../utils/formatters';
import { exportTablePdf, exportToCsv, printTableDocument } from '../../utils/dashboardUtils';

type StaffExportScope = 'department' | 'care';

interface StaffExportCenterPageProps {
    scope: StaffExportScope;
    departmentName?: string;
    accent?: 'emerald' | 'purple';
    showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface ExportPayload {
    title: string;
    fileBase: string;
    headers: string[];
    rows: any[][];
}

const ACCENT_STYLES = {
    emerald: {
        icon: 'text-emerald-600',
        card: 'border-emerald-100',
        button: 'border-emerald-200 hover:border-emerald-300 hover:text-emerald-700',
        active: 'bg-emerald-600 text-white border-emerald-600'
    },
    purple: {
        icon: 'text-purple-600',
        card: 'border-purple-100',
        button: 'border-purple-200 hover:border-purple-300 hover:text-purple-700',
        active: 'bg-purple-600 text-white border-purple-600'
    }
} as const;

const normalizeDateText = (value: unknown) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.replace('T', ' ');
};

const getApplicantName = (application: any) =>
    [
        application?.first_name,
        application?.middle_name,
        application?.last_name,
        application?.suffix
    ]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' ')
    || 'Applicant';

const getActiveCourseName = (application: any) => {
    const currentChoice = Number(application?.current_choice || 1);
    if (currentChoice === 2) return String(application?.alt_course_1 || '').trim() || '';
    if (currentChoice === 3) return String(application?.alt_course_2 || '').trim() || '';
    return String(application?.priority_course || '').trim() || '';
};

const StaffExportCenterPage = ({
    scope,
    departmentName,
    accent = 'emerald',
    showToast
}: StaffExportCenterPageProps) => {
    const [interviewDateFilter, setInterviewDateFilter] = useState('');
    const [exportingKey, setExportingKey] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const styles = ACCENT_STYLES[accent];

    const notify = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        if (typeof showToast === 'function') {
            showToast(msg, type);
        }
    }, [showToast]);

    const applyInterviewDateFilter = useCallback((rows: any[]) => {
        if (!interviewDateFilter) return rows;
        return rows.filter((row: any) => String(row?.interview_date || '').startsWith(interviewDateFilter));
    }, [interviewDateFilter]);

    const getDepartmentAdmissionsPayload = useCallback(async (
        status: 'Interview Scheduled' | 'Approved for Enrollment'
    ): Promise<ExportPayload> => {
        const normalizedDepartment = String(departmentName || '').trim();
        if (!normalizedDepartment) {
            throw new Error('Department name is required for admissions exports.');
        }

        const queueRows = await getDepartmentInterviewQueue(normalizedDepartment);
        const filteredRows = applyInterviewDateFilter(queueRows).filter((row: any) => String(row?.status || '').trim() === status);

        return {
            title: status === 'Interview Scheduled' ? 'Scheduled Interviews' : 'Approved for Enrollment',
            fileBase: status === 'Interview Scheduled' ? 'department_scheduled_interviews' : 'department_approved_for_enrollment',
            headers: ['Applicant', 'Reference ID', 'Course', 'Email', 'Interview Date', 'Venue', 'Panel', 'Status'],
            rows: filteredRows.map((row: any) => [
                getApplicantName(row),
                String(row?.reference_id || '').trim(),
                getActiveCourseName(row),
                String(row?.email || '').trim(),
                normalizeDateText(row?.interview_date),
                String(row?.interview_venue || '').trim(),
                String(row?.interview_panel || '').trim(),
                String(row?.status || '').trim()
            ])
        };
    }, [applyInterviewDateFilter, departmentName]);

    const getPrintableMasterListPayload = useCallback(async (): Promise<ExportPayload> => {
        const normalizedDepartment = String(departmentName || '').trim();
        if (!normalizedDepartment) {
            throw new Error('Department name is required for the printable master list.');
        }
        if (!interviewDateFilter) {
            throw new Error('Select an interview date first for the printable master list.');
        }

        const queueRows = await getDepartmentInterviewQueue(normalizedDepartment, interviewDateFilter);
        const filteredRows = queueRows.filter((row: any) => String(row?.status || '').trim() === 'Interview Scheduled');

        return {
            title: 'Interview Master List',
            fileBase: `interview_master_list_${interviewDateFilter}`,
            headers: ['#', 'Applicant', 'Reference ID', 'Course', 'Schedule', 'Venue', 'Panel', 'Signature'],
            rows: filteredRows.map((row: any, index: number) => [
                index + 1,
                getApplicantName(row),
                String(row?.reference_id || '').trim(),
                getActiveCourseName(row),
                normalizeDateText(row?.interview_date),
                String(row?.interview_venue || '').trim(),
                String(row?.interview_panel || '').trim(),
                ''
            ])
        };
    }, [departmentName, interviewDateFilter]);

    const getDepartmentCounselingPayload = useCallback(async (): Promise<ExportPayload> => {
        const normalizedDepartment = String(departmentName || '').trim();
        if (!normalizedDepartment) {
            throw new Error('Department name is required for counseling exports.');
        }

        const { data, error } = await supabase
            .from('counseling_requests')
            .select('student_name, student_id, request_type, status, scheduled_date, created_at')
            .eq('department', normalizedDepartment)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            title: 'Department Counseling Requests',
            fileBase: 'department_counseling_requests',
            headers: ['Student', 'Student ID', 'Request Type', 'Status', 'Scheduled Date', 'Created At'],
            rows: (data || []).map((row: any) => [
                String(row?.student_name || '').trim(),
                String(row?.student_id || '').trim(),
                String(row?.request_type || '').trim(),
                String(row?.status || '').trim(),
                normalizeDateText(row?.scheduled_date),
                normalizeDateText(row?.created_at)
            ])
        };
    }, [departmentName]);

    const getDepartmentSupportPayload = useCallback(async (): Promise<ExportPayload> => {
        const normalizedDepartment = String(departmentName || '').trim();
        if (!normalizedDepartment) {
            throw new Error('Department name is required for support exports.');
        }

        const { data, error } = await supabase
            .from('support_requests')
            .select('student_name, student_id, support_type, status, created_at, resolution_notes')
            .eq('department', normalizedDepartment)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            title: 'Department Support Requests',
            fileBase: 'department_support_requests',
            headers: ['Student', 'Student ID', 'Support Type', 'Status', 'Created At', 'Resolution Notes'],
            rows: (data || []).map((row: any) => [
                String(row?.student_name || '').trim(),
                String(row?.student_id || '').trim(),
                String(row?.support_type || '').trim(),
                String(row?.status || '').trim(),
                normalizeDateText(row?.created_at),
                String(row?.resolution_notes || '').trim()
            ])
        };
    }, [departmentName]);

    const getEventsPayload = useCallback(async (): Promise<ExportPayload> => {
        const { data, error } = await supabase
            .from('events')
            .select('title, type, location, event_date, event_time, created_at')
            .order('event_date', { ascending: true });

        if (error) throw error;

        return {
            title: scope === 'department' ? 'Department Events' : 'CARE Staff Events',
            fileBase: scope === 'department' ? 'department_events' : 'care_events',
            headers: ['Title', 'Type', 'Location', 'Event Date', 'Event Time', 'Created At'],
            rows: (data || []).map((row: any) => [
                String(row?.title || '').trim(),
                String(row?.type || '').trim(),
                String(row?.location || '').trim(),
                String(row?.event_date || '').trim(),
                String(row?.event_time || '').trim(),
                normalizeDateText(row?.created_at)
            ])
        };
    }, [scope]);

    const getCareNatPayload = useCallback(async (): Promise<ExportPayload> => {
        const { data, error } = await supabase
            .from('applications')
            .select('reference_id, first_name, middle_name, last_name, suffix, email, priority_course, alt_course_1, alt_course_2, current_choice, status, created_at, test_date, test_time, interview_date')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            title: 'NAT Applications',
            fileBase: 'nat_applications',
            headers: ['Applicant', 'Reference ID', 'Email', 'Current Course', 'Status', 'Test Date', 'Test Time', 'Interview Date', 'Applied At'],
            rows: (data || []).map((row: any) => [
                getApplicantName(row),
                String(row?.reference_id || '').trim(),
                String(row?.email || '').trim(),
                getActiveCourseName(row),
                String(row?.status || '').trim(),
                String(row?.test_date || '').trim(),
                String(row?.test_time || '').trim(),
                normalizeDateText(row?.interview_date),
                normalizeDateText(row?.created_at)
            ])
        };
    }, []);

    const getCareCounselingPayload = useCallback(async (): Promise<ExportPayload> => {
        const { data, error } = await supabase
            .from('counseling_requests')
            .select('student_name, student_id, department, request_type, status, scheduled_date, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            title: 'CARE Counseling Requests',
            fileBase: 'care_counseling_requests',
            headers: ['Student', 'Student ID', 'Department', 'Request Type', 'Status', 'Scheduled Date', 'Created At'],
            rows: (data || []).map((row: any) => [
                String(row?.student_name || '').trim(),
                String(row?.student_id || '').trim(),
                String(row?.department || '').trim(),
                String(row?.request_type || '').trim(),
                String(row?.status || '').trim(),
                normalizeDateText(row?.scheduled_date),
                normalizeDateText(row?.created_at)
            ])
        };
    }, []);

    const getCareSupportPayload = useCallback(async (): Promise<ExportPayload> => {
        const { data, error } = await supabase
            .from('support_requests')
            .select('student_name, student_id, department, support_type, status, created_at, resolution_notes')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return {
            title: 'CARE Support Requests',
            fileBase: 'care_support_requests',
            headers: ['Student', 'Student ID', 'Department', 'Support Type', 'Status', 'Created At', 'Resolution Notes'],
            rows: (data || []).map((row: any) => [
                String(row?.student_name || '').trim(),
                String(row?.student_id || '').trim(),
                String(row?.department || '').trim(),
                String(row?.support_type || '').trim(),
                String(row?.status || '').trim(),
                normalizeDateText(row?.created_at),
                String(row?.resolution_notes || '').trim()
            ])
        };
    }, []);

    const handleExport = useCallback(async (
        moduleKey: string,
        format: 'csv' | 'pdf',
        getPayload: () => Promise<ExportPayload>
    ) => {
        const busyKey = `${moduleKey}-${format}`;
        setExportingKey(busyKey);
        setPageError(null);

        try {
            const payload = await getPayload();
            if (!payload.rows.length) {
                notify('No records available for that export.', 'info');
                return;
            }

            if (format === 'csv') {
                await exportToCsv(payload.headers, payload.rows, generateExportFilename(payload.fileBase, 'csv'));
            } else {
                await exportTablePdf(payload.title, payload.headers, payload.rows, generateExportFilename(payload.fileBase, 'pdf'));
            }

            notify(`${payload.title} exported successfully.`, 'success');
        } catch (error: any) {
            const message = error?.message || 'Failed to export records.';
            setPageError(message);
            notify(message, 'error');
        } finally {
            setExportingKey(null);
        }
    }, [notify]);

    const handlePrintMasterList = useCallback(async () => {
        const busyKey = 'printable-master-list-print';
        setExportingKey(busyKey);
        setPageError(null);

        try {
            const payload = await getPrintableMasterListPayload();
            if (!payload.rows.length) {
                notify('No scheduled interview applicants found for that date.', 'info');
                return;
            }

            printTableDocument(
                payload.title,
                payload.headers,
                payload.rows,
                `Interview date: ${interviewDateFilter}`
            );
            notify('Printable master list opened.', 'success');
        } catch (error: any) {
            const message = error?.message || 'Failed to open printable master list.';
            setPageError(message);
            notify(message, 'error');
        } finally {
            setExportingKey(null);
        }
    }, [getPrintableMasterListPayload, interviewDateFilter, notify]);

    const modules = useMemo(() => {
        if (scope === 'department') {
            return [
                {
                    id: 'scheduled-interviews',
                    title: 'Scheduled Interviews',
                    description: 'Export scheduled interview applicants for your department.',
                    note: 'Uses the optional interview date filter below.',
                    getPayload: () => getDepartmentAdmissionsPayload('Interview Scheduled')
                },
                {
                    id: 'approved-applicants',
                    title: 'Approved for Enrollment',
                    description: 'Export approved interview applicants for your department.',
                    note: 'Uses the optional interview date filter below.',
                    getPayload: () => getDepartmentAdmissionsPayload('Approved for Enrollment')
                },
                {
                    id: 'department-counseling',
                    title: 'Counseling Requests',
                    description: 'Export department counseling request records.',
                    note: 'Includes student, status, and schedule details.',
                    getPayload: getDepartmentCounselingPayload
                },
                {
                    id: 'department-support',
                    title: 'Support Requests',
                    description: 'Export department support request records.',
                    note: 'Includes support type, status, and resolution notes.',
                    getPayload: getDepartmentSupportPayload
                },
                {
                    id: 'department-events',
                    title: 'Events',
                    description: 'Export event records visible to the department.',
                    note: 'Simple event list export.',
                    getPayload: getEventsPayload
                }
            ];
        }

        return [
            {
                id: 'nat-applications',
                title: 'NAT Applications',
                description: 'Export NAT application records.',
                note: 'Includes applicant, course, and status details.',
                getPayload: getCareNatPayload
            },
            {
                id: 'care-counseling',
                title: 'Counseling Requests',
                description: 'Export counseling request records across departments.',
                note: 'Includes department and schedule details.',
                getPayload: getCareCounselingPayload
            },
            {
                id: 'care-support',
                title: 'Support Requests',
                description: 'Export support request records across departments.',
                note: 'Includes department and resolution details.',
                getPayload: getCareSupportPayload
            },
            {
                id: 'care-events',
                title: 'Events',
                description: 'Export institution event records.',
                note: 'Simple event list export.',
                getPayload: getEventsPayload
            }
        ];
    }, [
        getCareCounselingPayload,
        getCareNatPayload,
        getCareSupportPayload,
        getDepartmentAdmissionsPayload,
        getDepartmentCounselingPayload,
        getDepartmentSupportPayload,
        getEventsPayload,
        scope
    ]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Export Center</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Simple CSV and PDF exports by module.
                    </p>
                </div>

                {scope === 'department' && (
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <label htmlFor="interview-export-date" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Interview Date
                        </label>
                        <input
                            id="interview-export-date"
                            type="date"
                            value={interviewDateFilter}
                            onChange={(event) => setInterviewDateFilter(event.target.value)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 outline-none focus:border-gray-300"
                        />
                    </div>
                )}
            </div>

            {pageError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {pageError}
                </div>
            )}

            {scope === 'department' && (
                <div className={`rounded-2xl border bg-white p-5 shadow-sm ${styles.card}`}>
                    <div className="flex items-start gap-3">
                        <div className={`rounded-xl bg-gray-50 p-3 ${styles.icon}`}>
                            <Printer size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-semibold text-gray-900">Printable Master List</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Interview-day attendance list for scheduled applicants only.
                            </p>
                            <p className="mt-2 text-xs text-gray-500">
                                Requires the interview date filter and includes a blank signature column for check-in.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => void handlePrintMasterList()}
                            disabled={exportingKey !== null}
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60 ${styles.button}`}
                        >
                            {exportingKey === 'printable-master-list-print'
                                ? <Loader2 size={16} className="animate-spin" />
                                : <Printer size={16} />}
                            <span>Print List</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleExport('printable-master-list', 'pdf', getPrintableMasterListPayload)}
                            disabled={exportingKey !== null}
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${styles.active}`}
                        >
                            {exportingKey === 'printable-master-list-pdf'
                                ? <Loader2 size={16} className="animate-spin" />
                                : <FileText size={16} />}
                            <span>Export PDF</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {modules.map((module) => (
                    <div key={module.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${styles.card}`}>
                        <div className="flex items-start gap-3">
                            <div className={`rounded-xl bg-gray-50 p-3 ${styles.icon}`}>
                                <FileText size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-semibold text-gray-900">{module.title}</h2>
                                <p className="mt-1 text-sm text-gray-600">{module.description}</p>
                                <p className="mt-2 text-xs text-gray-500">{module.note}</p>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => void handleExport(module.id, 'csv', module.getPayload)}
                                disabled={exportingKey !== null}
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60 ${styles.button}`}
                            >
                                {exportingKey === `${module.id}-csv`
                                    ? <Loader2 size={16} className="animate-spin" />
                                    : <Download size={16} />}
                                <span>Export CSV</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleExport(module.id, 'pdf', module.getPayload)}
                                disabled={exportingKey !== null}
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${styles.active}`}
                            >
                                {exportingKey === `${module.id}-pdf`
                                    ? <Loader2 size={16} className="animate-spin" />
                                    : <FileText size={16} />}
                                <span>Export PDF</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StaffExportCenterPage;
