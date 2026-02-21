const DeptSupportApprovalsPage = ({
    data,
    supportRequests,
    filteredData,
    matchesCascadeFilters,
    cascadeFilterBar,
    openDecisionModal
}: any) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Support Request Approvals</h1>
                <p className="text-gray-500 text-sm mt-1">Review requests forwarded to {data.profile.department}</p>
            </header>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100/80 shadow-sm">
                {cascadeFilterBar}
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden card-hover">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                        <tr>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Student</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Type</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Date</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Description</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {supportRequests.filter(req => {
                            const stu = filteredData.students.find(s => s.id === req.student_id);
                            return matchesCascadeFilters(stu);
                        }).map(req => (
                            <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="p-4">
                                    <div className="font-bold text-gray-900 dark:text-white">{req.student_name}</div>
                                    <div className="text-xs text-gray-400">{req.student_id}</div>
                                </td>
                                <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">{req.support_type}</span></td>
                                <td className="p-4 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 max-w-xs" title={req.description}>{req.description}</div>
                                    {req.documents_url && <a href={req.documents_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">View Attachment</a>}
                                </td>
                                <td className="p-4 flex gap-2">
                                    <button onClick={() => openDecisionModal(req.id, 'Approved')} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200">Approve</button>
                                    <button onClick={() => openDecisionModal(req.id, 'Rejected')} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">Reject</button>
                                </td>
                            </tr>
                        ))}
                        {supportRequests.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No pending support requests.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DeptSupportApprovalsPage;
