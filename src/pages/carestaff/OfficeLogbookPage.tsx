import { useState, useEffect } from 'react';
import { Download, ListChecks, XCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/dashboardUtils';

const OfficeLogbookPage = ({ functions }: any) => {
    const [visits, setVisits] = useState<any[]>([]);
    const [reasons, setReasons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManageModal, setShowManageModal] = useState(false);
    const [newReason, setNewReason] = useState('');

    useEffect(() => {
        const fetchVisits = async () => {
            const { data } = await supabase.from('office_visits').select('*').order('time_in', { ascending: false });
            if (data) setVisits(data);
            setLoading(false);
        };
        fetchVisits();
        fetchReasons();

        const channel = supabase.channel('visits_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'office_visits' }, fetchVisits)
            .subscribe();
        return () => { supabase.removeChannel(channel).catch(console.error); };
    }, []);

    const fetchReasons = async () => {
        const { data } = await supabase.from('office_visit_reasons').select('*').order('reason');
        if (data) setReasons(data);
    };

    const handleAddReason = async (e) => {
        e.preventDefault();
        if (!newReason.trim()) return;
        try {
            const { error } = await supabase.from('office_visit_reasons').insert([{ reason: newReason.trim() }]);
            if (error) throw error;
            functions.showToast("Reason added successfully!");
            setNewReason('');
            fetchReasons();
        } catch (err) { functions.showToast("Error: " + err.message, 'error'); }
    };

    const handleDeleteReason = async (id) => {
        if (!confirm("Remove this reason?")) return;
        await supabase.from('office_visit_reasons').delete().eq('id', id);
        functions.showToast("Reason removed.");
        fetchReasons();
    };

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-gray-900">Office Logbook</h1><p className="text-gray-500 text-sm mt-1">Digital log of student visits and transactions.</p></div>
                <div className="flex gap-3">
                    <button onClick={() => {
                        if (visits.length === 0) return;
                        const headers = ['Student Name', 'Student ID', 'Reason', 'Time In', 'Time Out', 'Status'];
                        const rows = visits.map(v => [v.student_name, v.student_id, v.reason, new Date(v.time_in).toLocaleString(), v.time_out ? new Date(v.time_out).toLocaleString() : '-', v.status]);
                        exportToExcel(headers, rows, 'office_logbook');
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
                                        <td className="px-6 py-3 text-gray-500">{new Date(v.time_in).toLocaleString()}</td>
                                        <td className="px-6 py-3 text-gray-500">{v.time_out ? new Date(v.time_out).toLocaleString() : '-'}</td>
                                        <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${v.status === 'Ongoing' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>{v.status}</span></td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>

            {/* Manage Reasons Modal */}
            {showManageModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-lg text-gray-900">Manage Visit Reasons</h3><button onClick={() => setShowManageModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" size={20} /></button></div>
                        <div className="p-6">
                            <form onSubmit={handleAddReason} className="flex gap-2 mb-6"><input value={newReason} onChange={e => setNewReason(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-600" placeholder="Enter new reason..." /><button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Add</button></form>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {reasons.map(r => (
                                    <div key={r.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"><span className="text-sm text-gray-700">{r.reason}</span><button onClick={() => handleDeleteReason(r.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficeLogbookPage;
