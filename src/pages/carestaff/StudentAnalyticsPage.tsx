import { useState, useEffect } from 'react';
import {
    Users, XCircle, Clock, Filter, ArrowUpDown,
    BarChart2, TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import QuestionChart from '../../components/charts/QuestionChart';
import YearLevelChart from '../../components/charts/YearLevelChart';
import TopQuestionsChart from '../../components/charts/TopQuestionsChart';

const StudentAnalyticsPage = ({ functions }: any) => {
    const [forms, setForms] = useState<any[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<any>(null);
    const [allDepartments, setAllDepartments] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);

    const [currentTab, setCurrentTab] = useState('Overview');
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<any>({ submissions: [], answers: [] });
    const [filteredData, setFilteredData] = useState<any>({ submissions: [], answers: [] });



    const refreshForms = async () => {
        const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
        if (data) setForms(data);
    };


    useEffect(() => {
        const channel = supabase.channel('public:students_analytics')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forms' }, refreshForms)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Smart Date Logic & Filters
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [isComparisonMode, setIsComparisonMode] = useState(false);
    const [prevStats, setPrevStats] = useState(null);
    const [stats, setStats] = useState({ total: 0 });

    // Respondent Table Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [viewingStudent, setViewingStudent] = useState(null); // For "View Answers" modal

    // Top Questions Filter
    const [topQuestionScoreFilter, setTopQuestionScoreFilter] = useState('5');

    useEffect(() => {
        const loadForms = async () => {
            const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
            if (data && data.length > 0) {
                setForms(data);
                setSelectedFormId(data[0].id);
                // Smart Date Default for first form
                setDateFilter({
                    start: data[0].created_at ? data[0].created_at.split('T')[0] : '',
                    end: data[0].status === 'Closed' ? (data[0].updated_at ? data[0].updated_at.split('T')[0] : '') : ''
                });
            } else {
                setLoading(false);
            }
        };
        loadForms();

        const loadDepartments = async () => {
            const { data } = await supabase.from('departments').select('name').order('name');
            if (data) setAllDepartments(data);
        };
        loadDepartments();
    }, []);

    // Handle Form Change & Smart Dates
    const handleFormSelect = (id) => {
        setSelectedFormId(id);
        const form = forms.find(f => f.id === id);
        if (form) {
            setDateFilter({
                start: form.created_at ? form.created_at.split('T')[0] : '',
                end: form.status === 'Closed' ? (form.updated_at ? form.updated_at.split('T')[0] : '') : ''
            });
        }
    };

    useEffect(() => {
        if (selectedFormId) {
            fetchQuestions();
            fetchAnalytics();
        }
    }, [selectedFormId]);

    const fetchQuestions = async () => {
        const { data } = await supabase.from('questions').select('*').eq('form_id', selectedFormId).order('order_index');
        setQuestions(data || []);
    };

    const processAnalyticsData = (subs) => {
        return { total: subs.length };
    };

    // Client-side filtering
    useEffect(() => {
        // Safe check for submissions
        let subs = analyticsData.submissions || [];

        // Date Filter
        if (dateFilter.start) subs = subs.filter(s => s.submitted_at >= dateFilter.start);
        if (dateFilter.end) subs = subs.filter(s => s.submitted_at <= dateFilter.end + 'T23:59:59');

        // Dept Filter
        if (departmentFilter && departmentFilter !== 'All') subs = subs.filter(s => s.students?.department === departmentFilter);

        // Course Filter
        if (courseFilter && courseFilter !== 'All') subs = subs.filter(s => s.students?.course === courseFilter);

        const subIds = new Set(subs.map(s => s.id));
        const ans = (analyticsData.answers || []).filter(a => subIds.has(a.submission_id)); // Safe check

        setFilteredData({ submissions: subs, answers: ans });
        setStats(processAnalyticsData(subs));
    }, [analyticsData, dateFilter, departmentFilter, courseFilter]);

    const fetchAnalytics = async () => {
        if (!selectedFormId) return;
        try {
            setLoading(true);

            // 1. Fetch Submissions
            const { data: subs, error: subError } = await supabase
                .from('submissions')
                .select('*')
                .eq('form_id', selectedFormId);

            if (subError) throw subError;

            // 2. Fetch Students manually
            const studentIds = [...new Set(subs.map(s => s.student_id).filter(Boolean))];
            let studentMap = {};

            if (studentIds.length > 0) {
                const { data: students } = await supabase
                    .from('students')
                    .select('student_id, first_name, last_name, department, course, year_level, sex')
                    .in('student_id', studentIds);

                if (students) students.forEach(s => studentMap[s.student_id] = s);
            }

            const enrichedSubs = subs.map(s => ({ ...s, students: studentMap[s.student_id] || {} }));

            // 3. Fetch Answers
            const subIds = enrichedSubs.map(s => s.id);
            let answers = [];
            if (subIds.length > 0) {
                const { data: ans, error: ansError } = await supabase
                    .from('answers')
                    .select('*')
                    .in('submission_id', subIds);

                if (ansError) throw ansError;
                answers = ans;
            }

            setAnalyticsData({ submissions: enrichedSubs, answers });

        } catch (error) {
            console.error("Error fetching analytics:", error);
            functions.showToast("Error fetching analytics", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleComparisonToggle = async () => {
        if (isComparisonMode) {
            setIsComparisonMode(false);
            setPrevStats(null);
        } else {
            setIsComparisonMode(true);
            setLoading(true);
            try {
                const now = new Date();
                const end = dateFilter.end ? new Date(dateFilter.end) : now;
                const start = dateFilter.start ? new Date(dateFilter.start) : new Date(now.setDate(now.getDate() - 30));

                const duration = end.getTime() - start.getTime();
                const prevEnd = new Date(start.getTime());
                const prevStart = new Date(prevEnd.getTime() - duration);

                const { data: prevSubs } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('form_id', selectedFormId)
                    .gte('submitted_at', prevStart.toISOString())
                    .lte('submitted_at', prevEnd.toISOString());

                setPrevStats(processAnalyticsData(prevSubs || []));
            } catch (e) {
                console.error(e);
                functions.showToast("Error comparing periods", 'error');
            } finally { setLoading(false); }
        }
    };

    // Sorting Helper
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedRespondents = [...filteredData.submissions].sort((a, b) => {
        const { key, direction } = sortConfig;
        let aVal: any = '', bVal: any = '';

        if (key === 'name') {
            aVal = `${a.students?.last_name || ''} ${a.students?.first_name || ''}`.trim().toLowerCase();
            bVal = `${b.students?.last_name || ''} ${b.students?.first_name || ''}`.trim().toLowerCase();
        } else if (key === 'course') {
            aVal = (a.students?.course || '').toLowerCase();
            bVal = (b.students?.course || '').toLowerCase();
        } else if (key === 'date') {
            aVal = new Date(a.submitted_at).getTime();
            bVal = new Date(b.submitted_at).getTime();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const uniqueCourses = [...new Set(analyticsData.submissions.map((s: any) => s.students?.course).filter(Boolean))] as string[];

    const handleExportCharts = () => {
        // Implement export charts logic or simple alert
        functions.showToast("Use browser print/save as PDF to export charts.", 'info');
    };

    const handleExportData = () => {
        // Implement CSV export logic
        functions.showToast("Exporting data feature upcoming...", 'info');
    };

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart2 className="text-purple-600" /> Student Analytics</h1>
                        <p className="text-gray-500 text-sm mt-1">Deep dive into student responses and trends.</p>
                    </div>
                    {/* Form Select */}
                    <select
                        value={selectedFormId || ''}
                        onChange={e => handleFormSelect(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-purple-700 bg-purple-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-full md:w-auto"
                    >
                        {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                        {forms.length === 0 && <option>No Forms Available</option>}
                    </select>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Period Start</label>
                        <input type="date" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-36" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Period End</label>
                        <input type="date" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-36" />
                    </div>

                    <button
                        onClick={handleComparisonToggle}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold transition h-[38px] ${isComparisonMode ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                    >
                        <ArrowUpDown size={16} /> {isComparisonMode ? 'Exit Comparison' : 'Compare Period'}
                    </button>

                    {/* Department Filter (Global) */}
                    <div className="ml-auto">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Department Filter</label>
                        <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48">
                            <option value="All">All Departments</option>
                            {allDepartments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl"><Users /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Respondents</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        {isComparisonMode && prevStats && (
                            <p className={`text-xs font-bold flex items-center gap-1 ${stats.total >= prevStats.total ? 'text-green-600' : 'text-red-500'}`}>
                                {stats.total >= prevStats.total ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                                {stats.total - prevStats.total > 0 ? '+' : ''}{stats.total - prevStats.total} vs prev
                            </p>
                        )}
                    </div>
                </div>
                {/* Placeholder for Avg Time or Completion Rate if we had that data */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 opacity-70">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold text-xl"><Clock /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Avg. Completion</p>
                        <p className="text-2xl font-bold text-gray-900">--</p>
                        <p className="text-xs text-gray-400">Not tracked</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex gap-6">
                    {['Overview', 'Respondents'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setCurrentTab(tab)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {loading ? (
                <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading analytics data...</p>
                </div>
            ) : (
                <>
                    {/* OVERVIEW TAB */}
                    {currentTab === 'Overview' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <YearLevelChart submissions={filteredData.submissions} />

                                {/* Top Questions Chart */}
                                <div className="relative">
                                    <div className="absolute top-4 right-4 z-10">
                                        <select
                                            value={topQuestionScoreFilter}
                                            onChange={e => setTopQuestionScoreFilter(e.target.value)}
                                            className="text-xs font-bold border-gray-200 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            {[5, 4, 3, 2, 1].map(score => <option key={score} value={score}>{score} Star{score !== 1 ? 's' : ''}</option>)}
                                        </select>
                                    </div>
                                    <TopQuestionsChart questions={questions} answers={filteredData.answers} scoreFilter={topQuestionScoreFilter} />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800">Question Analysis</h3>
                                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">N = {filteredData.submissions.length}</span>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {questions.map((q) => (
                                        <QuestionChart key={q.id} question={q} answers={filteredData.answers} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RESPONDENTS TAB */}
                    {currentTab === 'Respondents' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Toolbar */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Filter size={16} className="text-gray-400" />
                                    <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="text-sm border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500">
                                        <option value="All">All Courses</option>
                                        {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <span className="text-sm text-gray-500">Showing {sortedRespondents.length} students</span>
                            </div>

                            {/* Table */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                                        <tr>
                                            <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>Student Name <ArrowUpDown size={12} className="inline ml-1 opacity-50" /></th>
                                            <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('course')}>Course & Year <ArrowUpDown size={12} className="inline ml-1 opacity-50" /></th>
                                            <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>Date Submitted <ArrowUpDown size={12} className="inline ml-1 opacity-50" /></th>
                                            <th className="p-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sortedRespondents.map(sub => (
                                            <tr key={sub.id} className="hover:bg-purple-50/30 transition-colors group">
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-900">{sub.students?.last_name}, {sub.students?.first_name}</div>
                                                    <div className="text-xs text-gray-400">{sub.students?.student_id || 'ID Unknown'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-gray-700">{sub.students?.course || 'Unknown Course'}</div>
                                                    <div className="text-xs text-gray-500">{sub.students?.year_level}</div>
                                                </td>
                                                <td className="p-4 text-gray-600">
                                                    {new Date(sub.submitted_at).toLocaleDateString()}
                                                    <span className="text-xs text-gray-400 ml-2">{new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => setViewingStudent(sub)} className="text-purple-600 hover:text-purple-800 font-bold text-xs bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border border-purple-100">
                                                        View Answers
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sortedRespondents.length === 0 && (
                                            <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No responses found match your filters.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* VIEW ANSWERS MODAL */}
            {viewingStudent && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{viewingStudent.students?.first_name}'s Response</h3>
                                <p className="text-xs text-gray-500">{new Date(viewingStudent.submitted_at).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setViewingStudent(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition"><XCircle size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {questions.map((q, idx) => {
                                const answer = filteredData.answers.find(a => a.submission_id === viewingStudent.id && a.question_id === q.id);
                                return (
                                    <div key={q.id} className="pb-4 border-b border-gray-100 last:border-0">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Question {idx + 1}</p>
                                        <p className="font-medium text-gray-800 mb-2">{q.question_text}</p>
                                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-purple-900 font-medium text-sm">
                                            {answer ? (answer.answer_text || answer.answer_value) : <span className="text-gray-400 italic">No answer provided</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                            <button onClick={() => setViewingStudent(null)} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentAnalyticsPage;
