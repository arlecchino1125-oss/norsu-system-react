import { useState, useEffect } from 'react';
import { Download, ListChecks, RefreshCw, XCircle, Trash2 } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { createDeferredChannelCleanup } from '../../lib/realtime';
import { managedArchiveService } from '../../services/managedArchiveService';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/dashboardUtils';
import { formatDateTime, generateExportFilename } from '../../utils/formatters';
import type { CareStaffDashboardFunctions } from './types';
import PaginationControls from '../../components/PaginationControls';

interface OfficeLogbookPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

const OFFICE_VISITS_PAGE_SIZE = 25;
const OFFICE_VISIT_COLUMNS = 'id, student_id, student_name, reason, time_in, time_out, status';
const OFFICE_VISIT_REASON_COLUMNS = 'id, reason, is_active, created_at';

const OfficeLogbookPage = ({ functions }: OfficeLogbookPageProps) => {
    const { canPerformAction } = usePermissions();
    const canArchiveRecords = canPerformAction('archive_records');
    const sortVisitsByTimeIn = (rows: any[]) =>
        [...rows].sort((a: any, b: any) => new Date(b.time_in || 0).getTime() - new Date(a.time_in || 0).getTime());

    const [visits, setVisits] = useState<any[]>([]);
    const [visitsTotal, setVisitsTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [reasons, setReasons] = useState<any[]>([]);
    const [inactiveReasons, setInactiveReasons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [newReason, setNewReason] = useState('');

    const fetchReasons = async () => {
        const [{ data: activeReasons }, { data: archivedReasons }] = await Promise.all([
            supabase.from('office_visit_reasons').select(OFFICE_VISIT_REASON_COLUMNS).eq('is_active', true).order('reason'),
            supabase.from('office_visit_reasons').select(OFFICE_VISIT_REASON_COLUMNS).eq('is_active', false).order('reason')
        ]);
        if (activeReasons) setReasons(activeReasons);
        if (archivedReasons) setInactiveReasons(archivedReasons);
    };

    const fetchVisits = async (page = currentPage) => {
        const from = (page - 1) * OFFICE_VISITS_PAGE_SIZE;
        const to = from + OFFICE_VISITS_PAGE_SIZE - 1;
        const { data, count, error } = await supabase
            .from('office_visits')
            .select(OFFICE_VISIT_COLUMNS, { count: 'exact' })
            .order('time_in', { ascending: false })
            .range(from, to);
        if (error) throw error;
        setVisits(sortVisitsByTimeIn(data || []));
        setVisitsTotal(count || 0);
    };

    useEffect(() => {
        fetchVisits()
            .catch((error: any) => functions.showToast(error.message || 'Failed to load office visits.', 'error'))
            .finally(() => setLoading(false));
        fetchReasons();
    }, [currentPage]);

    useEffect(() => {
        fetchReasons();

        return createDeferredChannelCleanup(
            () => supabase.channel('visits_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'office_visits' }, (payload: any) => {
                    if (payload.eventType === 'DELETE') {
                        fetchVisits().catch((error: any) => functions.showToast(error.message || 'Failed to refresh office visits.', 'error'));
                        return;
                    }

                    if (payload.new) {
                        fetchVisits().catch((error: any) => functions.showToast(error.message || 'Failed to refresh office visits.', 'error'));
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );
    }, []);

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            const [{ data: reasonsData }, { data: inactiveReasonsData }] = await Promise.all([
                supabase.from('office_visit_reasons').select(OFFICE_VISIT_REASON_COLUMNS).eq('is_active', true).order('reason'),
                supabase.from('office_visit_reasons').select(OFFICE_VISIT_REASON_COLUMNS).eq('is_active', false).order('reason')
            ]);
            await fetchVisits(currentPage);
            if (reasonsData) setReasons(reasonsData);
            if (inactiveReasonsData) setInactiveReasons(inactiveReasonsData);
            functions.showToast('Office logbook refreshed.');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const handleAddReason = async (e) => {
        e.preventDefault();
        if (!newReason.trim()) return;
        try {
            const { error } = await supabase.from('office_visit_reasons').insert([{ reason: newReason.trim(), is_active: true }]);
            if (error) throw error;
            functions.showToast("Reason added successfully!");
            setNewReason('');
            fetchReasons();
        } catch (err) { functions.showToast("Error: " + err.message, 'error'); }
    };

    const handleDeleteReason = async (id) => {
        if (!confirm("Deactivate this reason?")) return;
        try {
            await managedArchiveService.deactivateOfficeVisitReason(id);
            functions.showToast("Reason deactivated.");
            await fetchReasons();
        } catch (err: any) {
            functions.showToast(err.message || 'Failed to deactivate reason.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-gray-900">Office Logbook</h1><p className="text-gray-500 text-sm mt-1">Digital log of student visits and transactions.</p></div>
                <div className="flex gap-3">
                    <button onClick={handleRefreshData} disabled={isRefreshingData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} /> {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                    <button onClick={() => {
                        if (visits.length === 0) return;
                        const headers = ['Student Name', 'Student ID', 'Reason', 'Time In', 'Time Out', 'Status'];
                        const rows = visits.map(v => [v.student_name, v.student_id, v.reason, formatDateTime(v.time_in), v.time_out ? formatDateTime(v.time_out) : '-', v.status]);
                        exportToExcel(headers, rows, generateExportFilename('office_logbook', 'xlsx').replace('.xlsx', ''));
                    }} disabled={visits.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download size={16} /> Export Excel
                    </button>
                    <button onClick={() => setShowManageModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm">
                        <ListChecks size={16} /> Manage Reasons
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-3">Student</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3">Time In</th>
                            <th className="px-6 py-3">Time Out</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? <tr><td colSpan={5} className="p-6 text-center">Loading...</td></tr> :
                            visits.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">No visits recorded.</td></tr> :
                                visits.map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-bold text-gray-900">{v.student_name}<div className="text-xs text-gray-400 font-normal">{v.student_id}</div></td>
                                        <td className="px-6 py-3 text-gray-600">{v.reason}</td>
                                        <td className="px-6 py-3 text-gray-500">{formatDateTime(v.time_in)}</td>
                                        <td className="px-6 py-3 text-gray-500">{v.time_out ? formatDateTime(v.time_out) : '-'}</td>
                                        <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${v.status === 'Ongoing' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>{v.status}</span></td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
                <PaginationControls
                    page={currentPage}
                    pageSize={OFFICE_VISITS_PAGE_SIZE}
                    total={visitsTotal}
                    isLoading={loading || isRefreshingData}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Manage Reasons Modal */}
            {showManageModal && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-lg text-gray-900">Manage Visit Reasons</h3><button onClick={() => setShowManageModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" size={20} /></button></div>
                        <div className="p-6">
                            <form onSubmit={handleAddReason} className="flex gap-2 mb-6"><input value={newReason} onChange={e => setNewReason(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-600" placeholder="Enter new reason..." /><button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Add</button></form>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {reasons.map(r => (
                                    <div key={r.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"><span className="text-sm text-gray-700">{r.reason}</span>{canArchiveRecords && <button onClick={() => handleDeleteReason(r.id)} className="text-gray-400 hover:text-amber-700" title="Deactivate Reason"><Trash2 size={16} /></button>}</div>
                                ))}
                            </div>
                            <div className="mt-6 border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-sm text-gray-800">Inactive Reasons</h4>
                                    <span className="text-xs font-bold text-gray-500">{inactiveReasons.length}</span>
                                </div>
                                {inactiveReasons.length === 0 ? (
                                    <p className="text-sm text-gray-500">No inactive reasons yet.</p>
                                ) : (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {inactiveReasons.map((reason) => (
                                            <div key={`inactive-reason-${reason.id}`} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <span className="text-sm text-slate-600">{reason.reason}</span>
                                                <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">Inactive</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficeLogbookPage;
