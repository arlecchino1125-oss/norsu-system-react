import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { createDeferredChannelCleanup } from '../../../../../lib/realtime';
import { formatAuditDetails, isTrackedStaffAuditRole } from '../../../../../lib/staffAudit';
import { supabase } from '../../../../../lib/supabase';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import DataTable, { DataTableColumn } from '../../../../../components/shared/tables/DataTable';

const AUDIT_LOG_COLUMNS = 'id, created_at, user_name, actor_role, action, details';

interface AuditLog {
    id: number;
    created_at: string;
    user_name: string;
    actor_role: string;
    action: string;
    details: any;
}

interface CareStaffAuditLogsPageProps {
    refreshSignal?: number;
}

const columns: DataTableColumn<AuditLog>[] = [
    {
        key: 'created_at',
        header: 'Timestamp',
        sortable: true,
        sortValue: (row) => new Date(row.created_at).getTime(),
        accessor: (row) => (
            <span className="text-gray-500 font-mono text-xs">{new Date(row.created_at).toLocaleString()}</span>
        ),
    },
    {
        key: 'user_name',
        header: 'User',
        sortable: true,
        sortValue: (row) => row.user_name,
        accessor: (row) => (
            <span className="font-bold text-gray-700">{row.user_name}</span>
        ),
    },
    {
        key: 'actor_role',
        header: 'Role',
        sortable: true,
        sortValue: (row) => row.actor_role || '',
        accessor: (row) => (
            <span className="text-gray-600">{row.actor_role || '-'}</span>
        ),
    },
    {
        key: 'action',
        header: 'Action',
        sortable: true,
        sortValue: (row) => row.action,
        accessor: (row) => (
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold border border-gray-200">{row.action}</span>
        ),
    },
    {
        key: 'details',
        header: 'Details',
        accessor: (row) => (
            <span className="text-gray-600">{formatAuditDetails(row.details)}</span>
        ),
    },
];

const CareStaffAuditLogsPage = ({ refreshSignal = 0 }: CareStaffAuditLogsPageProps) => {
    const queryClient = useQueryClient();
    const lastExternalRefreshSignalRef = useRef(refreshSignal);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // ponytail: cache audit logs to prevent redundant fetch on tab navigation
    const { data: logs = [], isLoading: loading, refetch: fetchLogs } = useQuery({
        queryKey: ['care-staff-audit-logs'],
        queryFn: async () => {
            const { data } = await supabase
                .from('audit_logs')
                .select(AUDIT_LOG_COLUMNS)
                .in('actor_role', ['Care Staff', 'Department Head'])
                .order('created_at', { ascending: false })
                .limit(100);
            return (data || []) as AuditLog[];
        },
        staleTime: 60000
    });

    useEffect(() => {
        return createDeferredChannelCleanup(
            () => supabase.channel('audit_realtime')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
                    if (!isTrackedStaffAuditRole(payload?.new?.actor_role)) return;
                    queryClient.setQueryData(['care-staff-audit-logs'], (old: AuditLog[] | undefined) => {
                        const newLog = payload.new as AuditLog;
                        if (!old) return [newLog];
                        if (old.some(l => l.id === newLog.id)) return old;
                        return [newLog, ...old].slice(0, 100);
                    });
                }).subscribe(),
            (channel) => supabase.removeChannel(channel)
        );
    }, [queryClient]);

    useEffect(() => {
        if (refreshSignal === lastExternalRefreshSignalRef.current) return;
        lastExternalRefreshSignalRef.current = refreshSignal;
        void fetchLogs();
    }, [refreshSignal, fetchLogs]);

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
                    <p className="text-gray-500 text-sm mt-1">Track system activity and staff actions for accountability.</p>
                </div>
                <button type="button" onClick={() => {
                    if (logs.length === 0) return;
                    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Details'];
                    const rows = logs.map(l => [new Date(l.created_at).toLocaleString(), l.user_name, l.actor_role || '', l.action, formatAuditDetails(l.details)]);
                    exportToExcel(headers, rows, 'audit_logs');
                }} disabled={logs.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download size={16} /> Export Excel
                </button>
            </div>
            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500">Loading logs...</div>
            ) : (
                <DataTable<AuditLog>
                    columns={columns}
                    rows={logs}
                    rowKey="id"
                    emptyMessage="No logs found."
                    pagination={{
                        page,
                        pageSize,
                        pageSizeOptions: [5, 10, 30],
                        onPageChange: setPage,
                        onPageSizeChange: (nextPageSize) => {
                            setPageSize(nextPageSize);
                            setPage(1);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default CareStaffAuditLogsPage;
