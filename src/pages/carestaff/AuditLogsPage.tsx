import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/dashboardUtils';

const AuditLogsPage = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
            if (data) setLogs(data);
            setLoading(false);
        };
        fetchLogs();

        const channel = supabase.channel('audit_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
                setLogs(prev => [payload.new, ...prev]);
            }).subscribe();
        return () => { supabase.removeChannel(channel).catch(console.error); };
    }, []);

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
                    <p className="text-gray-500 text-sm mt-1">Track system activity and staff actions for accountability.</p>
                </div>
                <button onClick={() => {
                    if (logs.length === 0) return;
                    const headers = ['Timestamp', 'User', 'Action', 'Details'];
                    const rows = logs.map(l => [new Date(l.created_at as string).toLocaleString(), l.user_name, l.action, l.details || '']);
                    exportToExcel(headers, rows, 'audit_logs');
                }} disabled={logs.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download size={16} /> Export Excel
                </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-3">Timestamp</th>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Action</th>
                                <th className="px-6 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading logs...</td></tr> :
                                logs.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">No logs found.</td></tr> :
                                    logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-500 font-mono text-xs">{new Date(log.created_at as string).toLocaleString()}</td>
                                            <td className="px-6 py-3 font-bold text-gray-700">{log.user_name}</td>
                                            <td className="px-6 py-3"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold border border-gray-200">{log.action}</span></td>
                                            <td className="px-6 py-3 text-gray-600">{log.details}</td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogsPage;
