const DeptCounseledPage = ({
    filteredData,
    counseledSearch,
    setCounseledSearch,
    counseledDate,
    setCounseledDate,
    matchesCascadeFilters,
    getStudentForRequest,
    cascadeFilterBar,
    setSelectedHistoryStudent,
    setShowHistoryModal
}: any) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col gap-3 card-hover">
                <div className="flex gap-4">
                    <input value={counseledSearch} onChange={(e) => setCounseledSearch(e.target.value)} className="flex-1 pl-4 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" placeholder="Search by name..." />
                    <input type="date" value={counseledDate} onChange={(e) => setCounseledDate(e.target.value)} className="w-48 pl-4 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" />
                </div>
                {cascadeFilterBar}
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden card-hover">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                        <tr>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Student Name</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Date</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Issue</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Status</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredData.requests
                            .filter(r => (r.status === 'Completed' || r.status === 'Referred') &&
                                r.student_name.toLowerCase().includes(counseledSearch.toLowerCase()) &&
                                (!counseledDate || r.created_at?.startsWith(counseledDate)) &&
                                matchesCascadeFilters(getStudentForRequest(r)))
                            .map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-4 font-medium text-gray-900 dark:text-white">{r.student_name}</td>
                                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{new Date(r.created_at).toLocaleDateString()}</td>
                                    <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold dark:bg-blue-900/30 dark:text-blue-300">{r.request_type}</span></td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>{r.status}</span></td>
                                    <td className="p-4">
                                        <button onClick={() => { setSelectedHistoryStudent(r); setShowHistoryModal(true); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium dark:text-blue-400 dark:hover:text-blue-300">View History</button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                {filteredData.requests.filter(r => r.status === 'Completed' || r.status === 'Referred').length === 0 && (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No counseled students found.</div>
                )}
            </div>
        </div>
    );
};

export default DeptCounseledPage;
