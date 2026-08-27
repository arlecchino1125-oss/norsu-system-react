import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import {
    ClipboardList, HeartHandshake, Clock, CheckCircle, XCircle, Search,
    UserPlus, Archive, Users, Download, NotebookPen, NotebookText, Undo2
} from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import { Card } from '../../../../../components/ui/Card';
import Modal from '../../../../../components/ui/Modal';
import PaginationControls from '../../../../../components/PaginationControls';
import DocxLogbookViewer from '../../../../../components/logbook/DocxLogbookViewer';
import type { PeerLogEntry } from '../../../../../components/peerLogbook/PeerLogEntryModal';
import type { CareActivityLogEntry } from '../../../../../utils/careActivitiesLogbook';
import { CARE_LOG_ENTRY_COLUMNS } from '../../../../../utils/careActivitiesLogbook';
import { facilitatorName, LOGBOOK_STATUS_TONE, monthLabelOf, sanitizeSearchTerm } from '../../../../../utils/peerLogbook';
import { exportLogbookPdf } from '../../../../../utils/peerLogbookPdf';
import { exportCareActivitiesLogbookPdf } from '../../../../../utils/careActivitiesLogbookPdf';
import { formatHours, sessionDate, sessionHours, splitAmPm, totalHours } from '../../../../../utils/volunteerHours';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';
import { buildPeerFacilitatorStatusEmailPayload } from '../../../../../utils/peerFacilitatorEmail';
import { toTitleCase } from '../../../../../utils/formatters';

/**
 * Live React Query implementation of the CARE staff Peer Facilitators page scoped
 * securely by RLS rules to the Department Head's department.
 */

type PeerTab = 'applications' | 'active' | 'hours';

const TABS: { key: PeerTab; label: string; icon: typeof ClipboardList }[] = [
    { key: 'applications', label: 'Applications', icon: ClipboardList },
    { key: 'active', label: 'Active Facilitators', icon: HeartHandshake },
    { key: 'hours', label: 'Facilitator Hours', icon: Clock }
];

const PAGE_SIZE = 10;
const APPS_QUERY_KEY = 'dept-peer-applications';
const ROSTER_QUERY_KEY = 'dept-peer-roster';
const LOGBOOKS_QUERY_KEY = 'dept-peer-logbooks';
const CARE_LOGBOOKS_QUERY_KEY = 'dept-care-logbooks';
const SETTINGS_QUERY_KEY = 'peer-settings';

const getStatusStyle = (status: string) => {
    if (status === 'approved') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'rejected') return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
};

const courseYear = (s: any) =>
    [s?.course, s?.year_level].filter(Boolean).join(' - ') || s?.department || 'N/A';

/* ─────────────────────────── Global Settings Fetcher ─────────────────────────── */

const usePeerSettings = () => {
    return useQuery({
        queryKey: [SETTINGS_QUERY_KEY],
        queryFn: async () => {
            const { data, error } = await supabase.from('peer_facilitator_settings').select('*').single();
            if (error) throw error;
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

/* ─────────────────────────── Hydration Helper ─────────────────────────── */

// In the department portal, we query the secure tables and hydrate manually from students_directory.
const hydrateStudents = async (records: any[], context: string) => {
    if (records.length === 0) return records;
    const studentIds = Array.from(new Set(records.map((r: any) => r.student_id)));

    // Fetch students directory
    const { data: students, error: dirError } = await supabase
        .from('students_directory')
        .select('*')
        .in('student_id', studentIds);

    if (dirError) {
        console.error(`Error hydrating ${context}:`, dirError);
        return records;
    }

    const studentMap = students.reduce((acc: any, s: any) => {
        acc[s.student_id] = s;
        return acc;
    }, {});

    return records.map((r: any) => ({
        ...r,
        students: studentMap[r.student_id] || { student_id: r.student_id, first_name: 'Unknown', last_name: 'Student' } // Fallback for unmatched
    }));
};

/* ─────────────────────────── Application Review ─────────────────────────── */

const ApplicationReviewModal = ({ application, onClose, onReject, onApprove, isMutating }: any) => (
    <Modal
        open
        anchorId="dept-content-region"
        title="Application Details"
        headerMeta={(
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${getStatusStyle(application.status)}`}>
                {application.status}
            </span>
        )}
        onClose={onClose}
        footer={(
            <div className="flex w-full items-center justify-between gap-3">
                <Button variant="secondary" onClick={onClose} disabled={isMutating}>Close</Button>
                {application.status === 'pending' && (
                    <div className="flex gap-3">
                        <Button variant="danger" leftIcon={<XCircle size={16} />} onClick={onReject} isLoading={isMutating} disabled={isMutating}>Reject</Button>
                        <Button variant="primary" leftIcon={<CheckCircle size={16} />} onClick={onApprove} isLoading={isMutating} disabled={isMutating} className="!bg-emerald-600 hover:!bg-emerald-700">Approve</Button>
                    </div>
                )}
            </div>
        )}
    >
        <div className="space-y-6">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">Applicant Details</h4>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {([
                        ['Name', [application.students?.first_name, application.students?.middle_name ? `${String(application.students.middle_name).charAt(0)}.` : '', application.students?.last_name, application.students?.suffix].filter(Boolean).join(' ')],
                        ['Student ID No.', application.student_id],
                        ['Email', application.students?.email],
                        ['Age', application.students?.age],
                        ['Sex', application.students?.sex],
                        ['College/Department', application.students?.department],
                        ['Program & Year', [application.students?.course, application.students?.year_level].filter(Boolean).join(' - ')],
                        ['Mobile', application.students?.mobile],
                        ['Form Year', application.school_year]
                    ] as [string, any][]).map(([label, value]) => (
                        <div key={label}>
                            <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
                            <p className="mt-1 text-sm font-bold text-slate-900 break-words">{value || 'N/A'}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="text-sm font-bold text-slate-900 border-b pb-2 mb-3">Submission Information</h4>
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Organizations</p>
                        <p className="mt-1 text-sm text-slate-700">{application.organizations || 'None provided'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Motivation</p>
                        <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{application.motivation}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Skills</p>
                        <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{application.skills || 'None provided'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Commitment</p>
                        <p className="mt-1 text-sm text-slate-700">{application.commitment}</p>
                    </div>
                </div>
            </div>
        </div>
    </Modal>
);

/* ──────────────────────── Applications tab ──────────────────────── */

const ApplicationsTab = ({ toolbarHost, showToastMessage }: { toolbarHost: HTMLElement | null, showToastMessage: (msg: string, type?: string) => void }) => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [page, setPage] = useState(1);

    // Readonly settings
    const { data: settings } = usePeerSettings();
    const activeYear = settings?.school_year;
    const applicationsOpen = settings?.applications_open;

    const { data: applications = [], isLoading } = useQuery({
        queryKey: [APPS_QUERY_KEY],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return await hydrateStudents(data || [], 'applications');
        }
    });

    const mutateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await supabase.rpc('department_evaluate_peer_application', {
                p_application_id: id,
                p_status: status
            });
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [APPS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [ROSTER_QUERY_KEY] });
            showToastMessage(`Application ${variables.status}.`, 'success');

            if (selectedApplication) {
                void sendTransactionalEmailNotification(
                    buildPeerFacilitatorStatusEmailPayload(selectedApplication, variables.status),
                    'Failed to send Peer Facilitator email.'
                ).then((emailResult) => {
                    if (emailResult.emailSent === false) {
                        showToastMessage(`Status updated, but email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
                    }
                });
            }

            setShowModal(false);
        },
        onError: (err: any) => {
            showToastMessage(err.message || 'Error updating application status.', 'error');
        }
    });

    const yearOptions = Array.from(new Set(
        [activeYear, ...applications.map((app: any) => app.school_year)].filter(Boolean)
    ));

    const filteredApplications = applications.filter((app: any) => {
        if (app.status === 'approved') return false;
        const studentName = `${app.students?.first_name || ''} ${app.students?.last_name || ''}`.toLowerCase();
        const matchesSearch = studentName.includes(searchQuery.toLowerCase()) ||
            app.student_id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedApplications = filteredApplications.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const openApplication = (app: any) => {
        setSelectedApplication(app);
        setShowModal(true);
    };

    const applicationControls = (
        <div className="flex flex-wrap items-center justify-end gap-2 2xl:flex-nowrap">
            <span className="whitespace-nowrap font-bold text-slate-500 text-xs">Application Year:</span>
            <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{activeYear || 'N/A'}</span>

            <span className="whitespace-nowrap border-l border-slate-200 pl-3 text-xs font-bold text-gray-500">Application form</span>
            <div
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${applicationsOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-gray-50 text-slate-500'}`}
            >
                <span className={`h-2 w-2 rounded-full ${applicationsOpen ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                {applicationsOpen ? 'Open' : 'Closed'}
            </div>

            {yearOptions.length > 0 && (
                <>
                    <label htmlFor="dept-volunteer-viewing-year" className="whitespace-nowrap border-l border-slate-200 pl-3 text-xs font-bold text-gray-500">Viewing window</label>
                    <select
                        id="dept-volunteer-viewing-year"
                        value={activeYear || ''}
                        onChange={() => { setPage(1); }}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:opacity-50"
                        disabled // Disabled since departments rely on global settings instead of toggling windows
                    >
                        {yearOptions.map((year) => (
                            <option key={year as string} value={year as string}>{year}{year === activeYear ? ' (Global Active)' : ''}</option>
                        ))}
                    </select>
                </>
            )}
        </div>
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-6">
            {toolbarHost && createPortal(applicationControls, toolbarHost)}

            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <label htmlFor="dept-peer-application-search" className="sr-only">Search applications by student name or ID</label>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        id="dept-peer-application-search"
                        type="text"
                        placeholder="Search by student name or ID..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'pending', 'approved', 'rejected'].map(status => (
                        <button type="button"
                            key={status}
                            onClick={() => { setStatusFilter(status); setPage(1); }}
                            className={`px-4 py-2 text-xs font-bold rounded-lg border capitalize transition-all ${statusFilter === status
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                            <tr>
                                <th className="px-6 py-4 font-bold">Student</th>
                                <th className="px-6 py-4 font-bold">Course &amp; Year</th>
                                <th className="px-6 py-4 font-bold">Date Applied</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading applications...</td></tr>
                            ) : filteredApplications.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No applications found.</td></tr>
                            ) : (
                                pagedApplications.map((app: any) => (
                                    <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{toTitleCase(`${app.students?.first_name || ''} ${app.students?.last_name || ''}`.trim())}</div>
                                            <div className="text-xs text-gray-500">{app.student_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{courseYear(app.students)}</td>
                                        <td className="px-6 py-4 text-gray-600">{new Date(app.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyle(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="secondary" size="sm" onClick={() => openApplication(app)}>
                                                Review
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredApplications.length > 0 && (
                    <PaginationControls
                        page={safePage}
                        pageSize={PAGE_SIZE}
                        total={filteredApplications.length}
                        onPageChange={setPage}
                    />
                )}
            </Card>

            {showModal && selectedApplication && createPortal(
                <ApplicationReviewModal
                    application={selectedApplication}
                    isMutating={mutateStatus.isPending}
                    onClose={() => setShowModal(false)}
                    onReject={() => mutateStatus.mutate({ id: selectedApplication.id, status: 'rejected' })}
                    onApprove={() => mutateStatus.mutate({ id: selectedApplication.id, status: 'approved' })}
                />,
                document.body
            )}
        </div>
    );
};

/* ──────────────────────── Active roster tab ──────────────────────── */

const AddFacilitatorModal = ({
    existingIds, defaultYear, isSaving, onClose, onAdd
}: {
    existingIds: Set<string>;
    defaultYear: string;
    isSaving: boolean;
    onClose: () => void;
    onAdd: (studentId: string, peerYear: string) => void;
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [year, setYear] = useState(defaultYear || new Date().getFullYear().toString());

    // Reuse the search query logic since we hydrate against students_directory
    const term = sanitizeSearchTerm(searchQuery);
    const { data: searchResults = [], isLoading: isSearching } = useQuery({
        queryKey: ['dept-student-search', term],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students_directory')
                .select('*')
                .eq('is_archived', false)
                .or(`student_id.ilike.%${term}%,last_name.ilike.%${term}%,first_name.ilike.%${term}%`)
                .limit(5);

            if (error) throw error;
            return data || [];
        },
        enabled: term.length >= 3,
    });

    // Already-active facilitators are hidden: re-adding one rewrites its source
    // to 'manual' and leaves the application it came from dangling on the row.
    const available = searchResults.filter((s: any) => !existingIds.has(String(s.student_id)));

    const isSelecting = !selectedStudent;

    return (
        <Modal
            open
            anchorId="dept-content-region"
            title="Add Peer Facilitator"
            subtitle="Find a student in your department and add them directly to the active roster."
            onClose={onClose}
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button
                        variant="primary"
                        leftIcon={<UserPlus size={16} />}
                        isLoading={isSaving}
                        disabled={!selectedStudent || !year.trim()}
                        onClick={() => selectedStudent && year.trim() && onAdd(selectedStudent.student_id, year.trim())}
                    >
                        Add to Active
                    </Button>
                </>
            )}
        >
            <div className="mx-auto w-full max-w-2xl space-y-4 min-h-[300px]">
                {isSelecting ? (
                    <div>
                        <label htmlFor="dept-facilitator-add-search" className="block text-xs font-bold text-gray-700 mb-1">Search Student</label>
                        <input
                            id="dept-facilitator-add-search"
                            type="text"
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter Name or ID (at least 3 characters)..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="mt-4">
                            {isSearching ? (
                                <p className="text-sm text-gray-500">Searching...</p>
                            ) : available.length > 0 ? (
                                <ul className="border border-slate-200 rounded-lg divide-y">
                                    {available.map((s: any) => (
                                        <li key={s.student_id}>
                                            <button
                                                type="button"
                                                className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex justify-between items-center"
                                                onClick={() => setSelectedStudent(s)}
                                            >
                                                <div>
                                                    <span className="font-bold text-sm text-slate-800">{toTitleCase(`${s.first_name || ''} ${s.last_name || ''}`.trim())}</span>
                                                    <br />
                                                    <span className="text-xs text-slate-500">{s.student_id} • {s.course}</span>
                                                </div>
                                                <UserPlus size={16} className="text-slate-400" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : term.length >= 3 ? (
                                <p className="text-sm text-gray-500">No students found in your department (already-active ones are hidden).</p>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 mb-4 flex justify-between items-center">
                            <div>
                                <span className="block font-bold text-sm text-slate-900">{toTitleCase(`${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim())}</span>
                                <span className="block text-xs text-slate-600">{selectedStudent.student_id} • {selectedStudent.course}</span>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => setSelectedStudent(null)}>Change</Button>
                        </div>
                        <div>
                            <label htmlFor="dept-facilitator-add-year" className="block text-xs font-bold text-gray-700 mb-1">Peer year</label>
                            <input
                                id="dept-facilitator-add-year"
                                type="text"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="e.g., 2025"
                                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">A label for which year they served — it does not limit their access.</p>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const ActiveRosterTab = ({ showToastMessage }: { showToastMessage: (msg: string, type?: string) => void }) => {
    const queryClient = useQueryClient();
    const [sourceFilter, setSourceFilter] = useState<'all' | 'application' | 'manual'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
    const [openFacilitator, setOpenFacilitator] = useState<any>(null);
    const [page, setPage] = useState(1);

    const { data: settings } = usePeerSettings();
    const timeInEnabled = settings?.time_in_enabled;
    const defaultYear = settings?.school_year || '';

    const { data: facilitators = [], isLoading } = useQuery({
        queryKey: [ROSTER_QUERY_KEY],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitators')
                .select('*')
                .is('archived_at', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return await hydrateStudents(data || [], 'roster');
        }
    });

    const mutateArchive = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('peer_facilitators')
                .update({ archived_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ROSTER_QUERY_KEY] });
            showToastMessage('Facilitator archived successfully.', 'success');
            setPendingArchiveId(null);
        },
        onError: (err: any) => showToastMessage(err.message, 'error')
    });

    const mutateAdd = useMutation({
        mutationFn: async ({ studentId, peerYear }: { studentId: string; peerYear: string }) => {
            const { error } = await supabase
                .from('peer_facilitators')
                .upsert({
                    student_id: studentId,
                    peer_year: peerYear,
                    source: 'manual',
                    archived_at: null
                }, { onConflict: 'student_id' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ROSTER_QUERY_KEY] });
            showToastMessage('Added to active facilitators.', 'success');
            setShowAdd(false);
        },
        onError: (err: any) => showToastMessage(err.message, 'error')
    });

    const filtered = facilitators.filter((f: any) => {
        const matchesSource = sourceFilter === 'all' || f.source === sourceFilter;
        const name = facilitatorName(f.students).toLowerCase();
        const q = searchQuery.toLowerCase();
        const matchesSearch = name.includes(q) || String(f.student_id).toLowerCase().includes(q);
        return matchesSource && matchesSearch;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedFacilitators = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const existingIds = new Set(facilitators.map((f: any) => String(f.student_id)));

    const pendingArchive = facilitators.find((f: any) => f.id === pendingArchiveId);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Global Student hours logging</span>
                    <div
                        aria-disabled
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:opacity-60 overflow-hidden ${timeInEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                    >
                        <span className={`h-2 w-2 rounded-full ${timeInEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {timeInEnabled ? 'Master Enabled' : 'Master Paused'}
                    </div>
                </div>
                <Button variant="primary" leftIcon={<UserPlus size={16} />} onClick={() => setShowAdd(true)}>
                    Add Facilitator
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <label htmlFor="dept-active-facilitator-search" className="sr-only">Search active facilitators by name or ID</label>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        id="dept-active-facilitator-search"
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {([['all', 'All'], ['application', 'Applied'], ['manual', 'Added by staff']] as const).map(([value, label]) => (
                        <button
                            type="button"
                            key={value}
                            onClick={() => { setSourceFilter(value); setPage(1); }}
                            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${sourceFilter === value
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                            <tr>
                                <th className="px-6 py-4 font-bold">Facilitator</th>
                                <th className="px-6 py-4 font-bold">Course &amp; Year</th>
                                <th className="px-6 py-4 font-bold">Peer Year</th>
                                <th className="px-6 py-4 font-bold">Source</th>
                                <th className="px-6 py-4 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading roster...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Users className="h-6 w-6 text-slate-300" />
                                        No active facilitators found.
                                    </div>
                                </td></tr>
                            ) : (
                                pagedFacilitators.map((f: any) => (
                                    <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => setOpenFacilitator(f)}
                                                className="text-left font-bold text-gray-900 transition hover:text-blue-700 hover:underline"
                                            >
                                                {facilitatorName(f.students)}
                                            </button>
                                            <div className="text-xs text-gray-500">{f.student_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{courseYear(f.students)}</td>
                                        <td className="px-6 py-4 text-gray-600">{f.peer_year || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${f.source === 'manual'
                                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                {f.source === 'manual' ? 'Added by staff' : 'Applied'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setPendingArchiveId(f.id)}
                                                title="Archive facilitator"
                                                aria-label="Archive facilitator"
                                                className="inline-flex items-center justify-center rounded-lg p-2 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
                                            >
                                                <Archive size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <PaginationControls
                        page={safePage}
                        pageSize={PAGE_SIZE}
                        total={filtered.length}
                        onPageChange={setPage}
                    />
                )}
            </Card>

            {openFacilitator && (
                <DeptPeerSupportModal
                    facilitator={openFacilitator}
                    onClose={() => setOpenFacilitator(null)}
                />
            )}

            {showAdd && (
                <AddFacilitatorModal
                    existingIds={existingIds}
                    defaultYear={defaultYear}
                    isSaving={mutateAdd.isPending}
                    onClose={() => setShowAdd(false)}
                    onAdd={(studentId, peerYear) => mutateAdd.mutate({ studentId, peerYear })}
                />
            )}

            {pendingArchive && (
                <Modal
                    open
                    anchorId="dept-content-region"
                    title="Archive Facilitator"
                    subtitle="Remove this student from the active roster without deleting their record."
                    onClose={() => setPendingArchiveId(null)}
                    footer={(
                        <>
                            <Button variant="secondary" onClick={() => setPendingArchiveId(null)} disabled={mutateArchive.isPending}>Cancel</Button>
                            <Button variant="primary" leftIcon={<Archive size={14} />} isLoading={mutateArchive.isPending} disabled={mutateArchive.isPending} onClick={() => mutateArchive.mutate((pendingArchive as any).id)}>
                                Archive
                            </Button>
                        </>
                    )}
                >
                    <div className="mx-auto w-full max-w-2xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Archive size={20} /></div>
                            <p className="text-sm text-gray-600">They come off the active roster and hours logging pauses. You can restore them anytime by adding them again.</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <p className="text-sm font-bold text-slate-800">{facilitatorName((pendingArchive as any).students)}</p>
                            <p className="text-xs text-slate-500 mt-1">Nothing is deleted — the record is kept.</p>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

/* ──────────────────────── Hours tab ──────────────────────── */

const formatClock = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatDayLabel = (day: string) =>
    new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

const spanLabel = (sessions: any[]) => {
    if (sessions.length === 0) return '—';
    const last = sessions[sessions.length - 1];
    return `${formatClock(sessions[0].time_in)} – ${last.time_out ? formatClock(last.time_out) : 'ongoing'}`;
};

const DtrColumn = ({ label, sessions }: { label: string; sessions: any[] }) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</h4>
            <span className="text-xs font-black text-slate-900">{formatHours(totalHours(sessions))}</span>
        </div>
        {sessions.length === 0 ? (
            <p className="py-4 text-center text-xs font-semibold text-slate-400">No time logged</p>
        ) : (
            <ul className="mt-2 space-y-1.5">
                {sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-600">
                            {formatClock(session.time_in)} – {session.time_out ? formatClock(session.time_out) : <span className="font-bold text-amber-600">ongoing</span>}
                        </span>
                        <span className="font-bold text-slate-900">
                            {session.time_out ? formatHours(sessionHours(session)) : '—'}
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

const FacilitatorDtrModal = ({ entry, day, onClose }: any) => {
    const { morning, afternoon } = splitAmPm(entry.sessions);
    return (
        <Modal
            open
            anchorId="dept-content-region"
            title={entry.name}
            subtitle={`${entry.student_id} · ${formatDayLabel(day)}`}
            onClose={onClose}
        >
            <div className="mx-auto w-full max-w-4xl space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <DtrColumn label="Morning" sessions={morning} />
                    <DtrColumn label="Afternoon" sessions={afternoon} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Total for the day</span>
                    <span className="text-base font-black text-emerald-800">{formatHours(totalHours(entry.sessions))}</span>
                </div>
            </div>
        </Modal>
    );
};

const HoursTab = () => {
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [openEntry, setOpenEntry] = useState<any>(null);

    const { data: attendanceData = [], isLoading } = useQuery({
        queryKey: ['dept-peer-attendance'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_attendance')
                .select('*')
                .order('time_in', { ascending: false });
            if (error) throw error;
            return await hydrateStudents(data || [], 'attendance');
        }
    });

    const days = Array.from(new Set(attendanceData.map((s: any) => sessionDate(s.time_in))));
    const activeDay = selectedDay && days.includes(selectedDay) ? selectedDay : days[0];

    const entries = Array.from(
        attendanceData
            .filter((s: any) => sessionDate(s.time_in) === activeDay)
            .reduce((acc: Map<string, any>, session: any) => {
                const entry = acc.get(session.student_id) ?? {
                    student_id: session.student_id,
                    name: [session.students?.first_name, session.students?.last_name].filter(Boolean).join(' ') || session.student_id,
                    course: [session.students?.course, session.students?.year_level].filter(Boolean).join(' - ') || session.students?.department || 'N/A',
                    sessions: []
                };
                entry.sessions.push(session);
                return acc.set(session.student_id, entry);
            }, new Map()).values()
    ).toSorted((a: any, b: any) => a.name.localeCompare(b.name));

    if (isLoading) {
        return <Card className="p-12 text-center text-gray-500">Loading hours...</Card>;
    }

    if (days.length === 0) {
        return (
            <Card className="p-12 text-center text-gray-500">
                No volunteer hours logged yet. Approved peer facilitators log their own time in and time out from the student portal.
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                    <label htmlFor="dept-facilitator-hours-day" className="text-xs font-bold whitespace-nowrap text-gray-500">Date</label>
                    <select
                        id="dept-facilitator-hours-day"
                        value={activeDay || ''}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                        {days.map((day) => (
                            <option key={day as string} value={day as string}>{formatDayLabel(day as string)}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-bold text-gray-900">{entries.length}</span>
                        <span className="text-xs text-gray-500">facilitator{entries.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-900">
                            {formatHours(entries.reduce((sum: number, entry: any) => sum + totalHours(entry.sessions), 0))}
                        </span>
                        <span className="text-xs text-gray-500">volunteered</span>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-bold">Facilitator</th>
                                <th className="px-6 py-4 font-bold">Course &amp; Year</th>
                                <th className="px-6 py-4 font-bold">Morning</th>
                                <th className="px-6 py-4 font-bold">Afternoon</th>
                                <th className="px-6 py-4 text-right font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {entries.map((entry: any) => {
                                const { morning, afternoon } = splitAmPm(entry.sessions);
                                return (
                                    <tr
                                        key={entry.student_id}
                                        onClick={() => setOpenEntry(entry)}
                                        className="cursor-pointer transition-colors hover:bg-blue-50/50"
                                    >
                                        <td className="px-6 py-4">
                                            <button type="button" className="text-left font-bold text-gray-900 hover:text-blue-700 hover:underline">
                                                {entry.name}
                                            </button>
                                            <div className="text-xs text-gray-500">{entry.student_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{entry.course}</td>
                                        <td className="px-6 py-4 text-gray-600">{spanLabel(morning)}</td>
                                        <td className="px-6 py-4 text-gray-600">{spanLabel(afternoon)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            {formatHours(totalHours(entry.sessions))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {openEntry && (
                <FacilitatorDtrModal entry={openEntry} day={activeDay} onClose={() => setOpenEntry(null)} />
            )}
        </div>
    );
};

/* ──────────────────────── Peer Support (logbook) modal ──────────────────────── */

const DeptPeerSupportModal = ({ facilitator, onClose }: {
    facilitator: any;
    onClose: () => void;
}) => {
    const [tab, setTab] = useState<'peer' | 'care'>('peer');
    const [openBookId, setOpenBookId] = useState<string | null>(null);
    const [openCareBookId, setOpenCareBookId] = useState<string | null>(null);

    const { data: books = [], isLoading: loadingBooks } = useQuery({
        queryKey: [LOGBOOKS_QUERY_KEY, facilitator.student_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_logbooks')
                .select('*')
                .eq('student_id', facilitator.student_id)
                .order('month', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const { data: careBooks = [], isLoading: loadingCareBooks } = useQuery({
        queryKey: [CARE_LOGBOOKS_QUERY_KEY, facilitator.student_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('care_activities_logbooks')
                .select('*')
                .eq('student_id', facilitator.student_id)
                .order('month', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const effectiveBookId = openBookId ?? (books[0] as any)?.id ?? null;
    const effectiveCareBookId = openCareBookId ?? (careBooks[0] as any)?.id ?? null;
    const openBook = books.find((b: any) => b.id === effectiveBookId) || null;
    const openCareBook = careBooks.find((b: any) => b.id === effectiveCareBookId) || null;

    const { data: entries = [], isLoading: loadingEntries } = useQuery<PeerLogEntry[]>({
        queryKey: ['dept-peer-log-entries', effectiveBookId],
        queryFn: async () => {
            if (!effectiveBookId) return [];
            const { data, error } = await supabase
                .from('peer_facilitator_log_entries')
                .select('*')
                .eq('logbook_id', effectiveBookId)
                .order('entry_date', { ascending: true })
                .order('logged_at', { ascending: true });

            if (error) throw error;
            return (data || []) as unknown as PeerLogEntry[];
        },
        enabled: !!effectiveBookId
    });

    const { data: careEntries = [], isLoading: loadingCareEntries } = useQuery<CareActivityLogEntry[]>({
        queryKey: ['dept-care-log-entries', effectiveCareBookId],
        queryFn: async () => {
            if (!effectiveCareBookId) return [];
            const { data, error } = await supabase
                .from('care_activities_log_entries')
                .select(CARE_LOG_ENTRY_COLUMNS)
                .eq('logbook_id', effectiveCareBookId)
                .order('entry_date', { ascending: true })
                .order('logged_at', { ascending: true });

            if (error) throw error;
            return (data || []) as unknown as CareActivityLogEntry[];
        },
        enabled: !!effectiveCareBookId
    });

    const activeOpenBook = tab === 'peer' ? openBook : openCareBook;

    const exportOpenBook = async () => {
        if (tab === 'peer') {
            if (!openBook) return;
            await exportLogbookPdf({
                peerName: facilitatorName(facilitator.students),
                programYearSection: [facilitator.students?.course, facilitator.students?.year_level].filter(Boolean).join(' / '),
                monthKey: String(openBook.month).slice(0, 7),
                entries
            });
        } else {
            if (!openCareBook) return;
            await exportCareActivitiesLogbookPdf({
                peerName: facilitatorName(facilitator.students),
                programYearSection: [facilitator.students?.course, facilitator.students?.year_level].filter(Boolean).join(' / '),
                monthKey: String(openCareBook.month).slice(0, 7),
                entries: careEntries
            });
        }
    };

    return (
        <Modal
            open
            anchorId="dept-content-region"
            title={facilitatorName(facilitator.students)}
            subtitle={tab === 'peer' ? 'Peer Support' : 'CARE Activities'}
            onClose={onClose}
            footer={activeOpenBook ? (
                <>
                    <Button variant="secondary" leftIcon={<Download size={14} />} onClick={exportOpenBook}>
                        Export PDF
                    </Button>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </>
            ) : (
                <Button variant="secondary" onClick={onClose}>Close</Button>
            )}
        >
            <div className="mx-auto w-full max-w-6xl">
                <div role="tablist" aria-label="Facilitator sections" className="mb-4 flex gap-1 border-b border-gray-200">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'peer'}
                        onClick={() => { setTab('peer'); setOpenBookId(null); }}
                        className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-bold transition ${tab === 'peer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><NotebookPen size={16} /> Peer Support</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'care'}
                        onClick={() => { setTab('care'); setOpenCareBookId(null); }}
                        className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-bold transition ${tab === 'care' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><NotebookText size={16} /> CARE Activities</span>
                    </button>
                </div>

                {tab === 'peer' ? (
                    loadingBooks ? (
                        <p className="py-8 text-center text-sm text-slate-400">Loading logbooks...</p>
                    ) : books.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">This facilitator has no peer support logbooks yet.</p>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                    Month
                                    <select
                                        value={effectiveBookId ?? ''}
                                        onChange={(e) => setOpenBookId(e.target.value)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    >
                                        {books.map((book: any) => (
                                            <option key={book.id} value={book.id}>
                                                {monthLabelOf(String(book.month).slice(0, 7))}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {openBook && (
                                    <>
                                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${LOGBOOK_STATUS_TONE[openBook.status]}`}>
                                            {openBook.status}
                                        </span>
                                        {openBook.submitted_at && (
                                            <span className="text-[11px] font-semibold text-slate-500">
                                                Submitted {new Date(openBook.submitted_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            {openBook && (
                                <DocxLogbookViewer key={openBook.id} type="peer" entries={entries} isLoading={loadingEntries} />
                            )}
                        </>
                    )
                ) : (
                    loadingCareBooks ? (
                        <p className="py-8 text-center text-sm text-slate-400">Loading logbooks...</p>
                    ) : careBooks.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">This facilitator has no CARE activities logbooks yet.</p>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                    Month
                                    <select
                                        value={effectiveCareBookId ?? ''}
                                        onChange={(e) => setOpenCareBookId(e.target.value)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                                    >
                                        {careBooks.map((book: any) => (
                                            <option key={book.id} value={book.id}>
                                                {monthLabelOf(String(book.month).slice(0, 7))}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {openCareBook && (
                                    <>
                                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${LOGBOOK_STATUS_TONE[openCareBook.status]}`}>
                                            {openCareBook.status}
                                        </span>
                                        {openCareBook.submitted_at && (
                                            <span className="text-[11px] font-semibold text-slate-500">
                                                Submitted {new Date(openCareBook.submitted_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            {openCareBook && (
                                <DocxLogbookViewer key={openCareBook.id} type="care" entries={careEntries} isLoading={loadingCareEntries} />
                            )}
                        </>
                    )
                )}
            </div>
        </Modal>
    );
};

/* ──────────────────────── Page shell ──────────────────────── */

export interface DeptPeerFacilitatorsPageProps {
    showToastMessage: (msg: string, type?: string) => void;
}

const DeptPeerFacilitatorsPage = ({ showToastMessage }: DeptPeerFacilitatorsPageProps) => {
    const [activeTab, setActiveTab] = useState<PeerTab>('applications');
    const [applicationToolbarHost, setApplicationToolbarHost] = useState<HTMLDivElement | null>(null);

    return (
        <div className="flex h-full min-h-0 flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Peer Facilitators</h1>
                <p className="mt-1 text-sm text-gray-500">Review applications, manage the active roster, and track volunteer hours.</p>
            </div>

            <div className="flex flex-col gap-2 border-b border-gray-200 2xl:flex-row 2xl:items-end 2xl:justify-between">
                <div role="tablist" aria-label="Peer facilitator sections" className="flex min-w-0 gap-1 overflow-x-auto">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === key}
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-bold transition-colors ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <span className="flex items-center gap-2">
                                <Icon size={16} /> {label}
                            </span>
                        </button>
                    ))}
                </div>
                {activeTab === 'applications' && (
                    <div
                        ref={setApplicationToolbarHost}
                        aria-label="Application controls"
                        className="min-w-0 pb-2 2xl:ml-auto"
                    />
                )}
            </div>

            {activeTab === 'applications' ? (
                <ApplicationsTab
                    toolbarHost={applicationToolbarHost}
                    showToastMessage={showToastMessage}
                />
            ) : activeTab === 'active' ? (
                <ActiveRosterTab
                    showToastMessage={showToastMessage}
                />
            ) : (
                <HoursTab />
            )}
        </div>
    );
};

export default DeptPeerFacilitatorsPage;
