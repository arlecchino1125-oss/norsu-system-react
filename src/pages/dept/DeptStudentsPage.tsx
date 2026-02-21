const DeptStudentsPage = ({
    filteredData,
    studentSearch,
    setStudentSearch,
    matchesCascadeFilters,
    cascadeFilterBar,
    setSelectedStudent,
    setShowStudentModal
}: any) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100/80 shadow-sm card-hover flex flex-col gap-3">
                <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="w-full pl-4 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" placeholder="Search students..." />
                {cascadeFilterBar}
            </div>
            <div className="space-y-4">
                {filteredData.students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) && matchesCascadeFilters(s)).map(s => (
                    <div key={s.id} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/80 shadow-sm flex justify-between items-center card-hover">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full bg-${s.status === 'Active' ? 'green' : 'gray'}-500 text-white flex items-center justify-center font-bold`}>{s.name.charAt(0)}</div>
                            <div><h3 className="font-bold text-gray-900 dark:text-white">{s.name}</h3><p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setSelectedStudent(s); setShowStudentModal(true); }} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">View Profile</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DeptStudentsPage;
