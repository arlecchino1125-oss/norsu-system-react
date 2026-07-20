import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Search, User } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';
import { Button } from '../../../../../components/ui/Button';
import { Card } from '../../../../../components/ui/Card';
import { buildPeerFacilitatorStatusEmailPayload } from '../peerFacilitatorEmail';

interface CareStaffVolunteerFormsTableProps {
    functions: { showToast: (msg: string, type?: any) => void };
    refreshSignal?: number;
}

const getStatusStyle = (status: string) => {
    if (status === 'approved') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'rejected') return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
};

const ApplicationReviewModal = ({ application, isUpdating, onClose, onReject, onApprove }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent care-modal-overlay">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" /> Application Details
                </h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyle(application.status)}`}>
                    {application.status}
                </span>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
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

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between shrink-0">
                <Button variant="secondary" onClick={onClose} disabled={isUpdating}>
                    Close
                </Button>

                {application.status === 'pending' && (
                    <div className="flex gap-3">
                        <Button
                            variant="danger"
                            leftIcon={<XCircle size={16} />}
                            onClick={onReject}
                            isLoading={isUpdating}
                        >
                            Reject
                        </Button>
                        <Button
                            variant="primary"
                            leftIcon={<CheckCircle size={16} />}
                            onClick={onApprove}
                            isLoading={isUpdating}
                            className="!bg-emerald-600 hover:!bg-emerald-700"
                        >
                            Approve
                        </Button>
                    </div>
                )}
            </div>
        </div>
    </div>
);

export default function CareStaffVolunteerFormsTable({ functions, refreshSignal = 0 }: CareStaffVolunteerFormsTableProps) {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedApplication, setSelectedApplication] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [yearFilter, setYearFilter] = useState<string | null>(null);
    const [yearDraft, setYearDraft] = useState('');

    const { data: settings } = useQuery({
        queryKey: ['peer-facilitator-settings', refreshSignal],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_settings')
                .select('school_year')
                .eq('id', 1)
                .maybeSingle();
            if (error) throw error;
            return data;
        }
    });
    const activeYear = settings?.school_year || '';
    const selectedYear = yearFilter ?? activeYear;

    const saveYearMutation = useMutation({
        mutationFn: async (school_year: string) => {
            const { error } = await supabase
                .from('peer_facilitator_settings')
                .update({ school_year })
                .eq('id', 1);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['peer-facilitator-settings'] });
            setYearFilter(null);
            setYearDraft('');
            functions.showToast('Form year updated. New applications will be tagged with it.', 'success');
        },
        onError: () => {
            functions.showToast('Failed to update form year.', 'error');
        }
    });

    const { data: applications = [], isLoading } = useQuery({
        queryKey: ['care-staff-volunteer-apps', refreshSignal],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_applications')
                .select(`
                    *,
                    students:student_id (
                        first_name,
                        middle_name,
                        last_name,
                        suffix,
                        age,
                        sex,
                        course,
                        department,
                        year_level,
                        email,
                        mobile
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase
                .from('peer_facilitator_applications')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['care-staff-volunteer-apps'] });
            functions.showToast('Application status updated successfully.', 'success');
            void sendTransactionalEmailNotification(
                buildPeerFacilitatorStatusEmailPayload(selectedApplication, variables.status),
                'Failed to send Peer Facilitator email.'
            ).then((emailResult) => {
                if (emailResult.emailSent === false) {
                    functions.showToast(`Status updated, but email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
                }
            });
            setShowModal(false);
        },
        onError: () => {
            functions.showToast('Failed to update application status.', 'error');
        }
    });

    const yearOptions = Array.from(new Set(
        [activeYear, ...applications.map((app: any) => app.school_year)].filter(Boolean)
    ));

    const filteredApplications = applications.filter(app => {
        const studentName = `${app.students?.first_name || ''} ${app.students?.last_name || ''}`.toLowerCase();
        const matchesSearch = studentName.includes(searchQuery.toLowerCase()) ||
            app.student_id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        const matchesYear = !selectedYear || app.school_year === selectedYear;
        return matchesSearch && matchesStatus && matchesYear;
    });

    const openApplication = (app: any) => {
        setSelectedApplication(app);
        setShowModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label htmlFor="care-volunteer-form-year" className="text-xs font-bold text-gray-500 whitespace-nowrap">Form Year (active)</label>
                    <div className="flex items-center gap-2">
                        <input
                            id="care-volunteer-form-year"
                            type="text"
                            value={yearDraft}
                            onChange={(e) => setYearDraft(e.target.value)}
                            placeholder={activeYear || 'e.g., 2026-2027'}
                            className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => yearDraft.trim() && saveYearMutation.mutate(yearDraft.trim())}
                            isLoading={saveYearMutation.isPending}
                            disabled={!yearDraft.trim() || yearDraft.trim() === activeYear}
                        >
                            Save
                        </Button>
                    </div>
                </div>
                {yearOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="care-volunteer-viewing-year" className="text-xs font-bold text-gray-500 whitespace-nowrap">Viewing window</label>
                        <select
                            id="care-volunteer-viewing-year"
                            value={selectedYear}
                            onChange={(e) => setYearFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {yearOptions.map((year) => (
                                <option key={year} value={year}>{year}{year === activeYear ? ' (active)' : ''}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by student name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'pending', 'approved', 'rejected'].map(status => (
                        <button type="button"
                            key={status}
                            onClick={() => setStatusFilter(status)}
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

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                            <tr>
                                <th className="px-6 py-4 font-bold">Student</th>
                                <th className="px-6 py-4 font-bold">Course & Year</th>
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
                                filteredApplications.map(app => (
                                    <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{app.students?.first_name} {app.students?.last_name}</div>
                                            <div className="text-xs text-gray-500">{app.student_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {[app.students?.course, app.students?.year_level].filter(Boolean).join(' - ') || app.students?.department || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(app.created_at).toLocaleDateString()}
                                        </td>
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
            </Card>

            {showModal && selectedApplication && createPortal(
                <ApplicationReviewModal
                    application={selectedApplication}
                    isUpdating={updateStatusMutation.isPending}
                    onClose={() => setShowModal(false)}
                    onReject={() => updateStatusMutation.mutate({ id: selectedApplication.id, status: 'rejected' })}
                    onApprove={() => updateStatusMutation.mutate({ id: selectedApplication.id, status: 'approved' })}
                />,
                document.body
            )}
        </div>
    );
}
