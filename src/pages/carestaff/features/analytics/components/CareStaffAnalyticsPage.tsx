import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, XCircle, Clock, Filter, ArrowUpDown,
    BarChart2, TrendingUp, RefreshCw, ChevronDown,
    Sparkles, Activity, FileBarChart, Eye
} from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import LoadingSkeleton from '../../../../../components/ui/LoadingSkeleton';
import QuestionChart from '../../../../../components/charts/QuestionChart';
import YearLevelChart from '../../../../../components/charts/YearLevelChart';
import TopQuestionsChart from '../../../../../components/charts/TopQuestionsChart';
import type { CareStaffDashboardFunctions } from '../../../types';

interface CareStaffAnalyticsPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

const FORM_COLUMNS = 'id, title, description, is_active, created_at';
const DEPARTMENT_COLUMNS = 'id, name';
const QUESTION_COLUMNS = 'id, form_id, question_text, question_type, scale_min, scale_max, order_index, created_at';
const SUBMISSION_COLUMNS = 'id, form_id, student_id, submitted_at';
const ANSWER_COLUMNS = 'id, submission_id, question_id, answer_text, answer_value';

const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } }
} as const;
const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 28 } }
} as const;

const processAnalyticsData = (subs: any[]) => ({ total: subs.length });

const ANALYTICS_TABS = ['Overview', 'Respondents'];

const CareStaffAnalyticsPage = ({ functions }: CareStaffAnalyticsPageProps) => {
    const queryClient = useQueryClient();
    const [forms, setForms] = useState<any[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<any>(null);
    const [allDepartments, setAllDepartments] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentTab, setCurrentTab] = useState('Overview');
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<any>({ submissions: [], answers: [] });
    const [filteredData, setFilteredData] = useState<any>({ submissions: [], answers: [] });
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [isComparisonMode, setIsComparisonMode] = useState(false);
    const [prevStats, setPrevStats] = useState<any>(null);
    const [stats, setStats] = useState({ total: 0 });
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [viewingStudent, setViewingStudent] = useState<any>(null);
    const [topQuestionScoreFilter, setTopQuestionScoreFilter] = useState('5');

    const { data: qForms } = useQuery({
        queryKey: ['analytics_forms'],
        queryFn: async () => {
            const { data, error } = await supabase.from('forms').select(FORM_COLUMNS).order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const { data: qDepartments } = useQuery({
        queryKey: ['departments_list_analytics'],
        queryFn: async () => {
            const { data, error } = await supabase.from('departments').select(DEPARTMENT_COLUMNS).order('name');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: qQuestions, isLoading: questionsLoading } = useQuery({
        queryKey: ['analytics_questions', selectedFormId],
        queryFn: async () => {
            if (!selectedFormId) return [];
            const { data, error } = await supabase
                .from('questions')
                .select(QUESTION_COLUMNS)
                .eq('form_id', selectedFormId)
                .order('order_index');
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedFormId
    });

    const { data: qAnalyticsData, isLoading: analyticsLoading } = useQuery({
        queryKey: ['analytics_data', selectedFormId],
        queryFn: async () => {
            if (!selectedFormId) return { submissions: [], answers: [] };
            const { data: subs, error: subError } = await supabase
                .from('submissions')
                .select(SUBMISSION_COLUMNS)
                .eq('form_id', selectedFormId);
            if (subError) throw subError;

            const studentIds = [...new Set(subs.map(s => s.student_id).filter(Boolean))];
            const studentMap: Record<string, any> = {};

            if (studentIds.length > 0) {
                const { data: students } = await supabase
                    .from('students')
                    .select('student_id, first_name, last_name, department, course, year_level, sex')
                    .in('student_id', studentIds);
                if (students) students.forEach(s => studentMap[s.student_id] = s);
            }

            const enrichedSubs = subs.map(s => ({ ...s, students: studentMap[s.student_id] || {} }));
            const subIds = enrichedSubs.map(s => s.id);
            let answers: any[] = [];
            if (subIds.length > 0) {
                const { data: ans, error: ansError } = await supabase
                    .from('answers')
                    .select(ANSWER_COLUMNS)
                    .in('submission_id', subIds);
                if (ansError) throw ansError;
                answers = ans;
            }
            return { submissions: enrichedSubs, answers };
        },
        enabled: !!selectedFormId
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const queriesLoading = !qForms || !qDepartments || (!!selectedFormId && (analyticsLoading || questionsLoading));
        setLoading(queriesLoading);
    }, [qForms, qDepartments, analyticsLoading, questionsLoading, selectedFormId]);

    useEffect(() => { if (qQuestions) setQuestions(qQuestions); }, [qQuestions]);
    useEffect(() => { if (qAnalyticsData) setAnalyticsData(qAnalyticsData); }, [qAnalyticsData]);

    useEffect(() => {
        if (qForms && qForms.length > 0) {
            setForms(qForms);
            setSelectedFormId((current: any) => {
                const currentStillExists = qForms.some((form: any) => form.id === current);
                return currentStillExists ? current : qForms[0].id;
            });
            if (!selectedFormId) {
                setDateFilter({
                    start: qForms[0].created_at ? qForms[0].created_at.split('T')[0] : '',
                    end: ''
                });
            }
        }
    }, [qForms, selectedFormId]);

    useEffect(() => { if (qDepartments) setAllDepartments(qDepartments); }, [qDepartments]);

    const handleFormSelect = (id: string) => {
        setSelectedFormId(id);
        const form = forms.find(f => f.id === id);
        if (form) {
            setDateFilter({
                start: form.created_at ? form.created_at.split('T')[0] : '',
                end: ''
            });
        }
    };

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['analytics_forms'] }),
                queryClient.invalidateQueries({ queryKey: ['departments_list_analytics'] }),
                selectedFormId ? queryClient.invalidateQueries({ queryKey: ['analytics_questions', selectedFormId] }) : Promise.resolve(),
                selectedFormId ? queryClient.invalidateQueries({ queryKey: ['analytics_data', selectedFormId] }) : Promise.resolve()
            ]);
            functions.showToast('Analytics data refreshed.', 'success');
        } catch {
            functions.showToast("Couldn't refresh analytics.", 'error');
        } finally {
            setIsRefreshingData(false);
        }
    };

    useEffect(() => {
        let subs = analyticsData.submissions || [];
        if (dateFilter.start) subs = subs.filter((s: any) => s.submitted_at >= dateFilter.start);
        if (dateFilter.end) subs = subs.filter((s: any) => s.submitted_at <= dateFilter.end + 'T23:59:59');
        if (departmentFilter && departmentFilter !== 'All') subs = subs.filter((s: any) => s.students?.department === departmentFilter);
        if (courseFilter && courseFilter !== 'All') subs = subs.filter((s: any) => s.students?.course === courseFilter);
        const subIds = new Set(subs.map((s: any) => s.id));
        const ans = (analyticsData.answers || []).filter((a: any) => subIds.has(a.submission_id));
        setFilteredData({ submissions: subs, answers: ans });
        setStats(processAnalyticsData(subs));
    }, [analyticsData, dateFilter, departmentFilter, courseFilter]);

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
                    .select(SUBMISSION_COLUMNS)
                    .eq('form_id', selectedFormId)
                    .gte('submitted_at', prevStart.toISOString())
                    .lte('submitted_at', prevEnd.toISOString());
                setPrevStats(processAnalyticsData(prevSubs || []));
            } catch {
                functions.showToast("Error comparing periods", 'error');
            } finally { setLoading(false); }
        }
    };

    const handleSort = (key: string) => {
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

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 pb-10">

            {/* ── HEADER BENTO ── */}
            <motion.div variants={fadeUp} className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 p-8">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <BarChart2 size={22} className="text-white" />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Analytics</h1>
                        </div>
                        <p className="text-slate-500 font-medium ml-14">Deep dive into student responses and trends.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                        <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 border border-slate-200 shadow-sm hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw size={15} className={isRefreshingData ? 'animate-spin text-purple-500' : ''} />
                            {isRefreshingData ? 'Refreshing…' : 'Refresh Data'}
                        </motion.button>

                        <div className="relative">
                            <select
                                value={selectedFormId || ''}
                                onChange={e => handleFormSelect(e.target.value)}
                                className="appearance-none w-full sm:w-auto pl-4 pr-10 py-2.5 border border-purple-200 rounded-2xl font-bold text-purple-700 bg-purple-50 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-sm cursor-pointer shadow-sm"
                            >
                                {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                {forms.length === 0 && <option>No Forms Available</option>}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-end gap-5 p-5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Period Start</label>
                        <input
                            type="date"
                            value={dateFilter.start}
                            onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 w-40"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Period End</label>
                        <input
                            type="date"
                            value={dateFilter.end}
                            onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 w-40"
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={handleComparisonToggle}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border ${isComparisonMode
                            ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-700'
                            }`}
                    >
                        <ArrowUpDown size={14} /> {isComparisonMode ? 'Exit Comparison' : 'Compare Period'}
                    </motion.button>

                    <div className="flex flex-col gap-1.5 ml-auto">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Department Filter</label>
                        <div className="relative">
                            <select
                                value={departmentFilter}
                                onChange={e => setDepartmentFilter(e.target.value)}
                                className="appearance-none pl-4 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 w-52 cursor-pointer"
                            >
                                <option value="All">All Departments</option>
                                {allDepartments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── KPI BENTO CARDS ── */}
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Total Respondents */}
                <motion.div
                    variants={fadeUp}
                    whileHover={{ scale: 1.02, y: -3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-blue-500/5 ring-1 ring-slate-200/50 p-8"
                >
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                            <Users size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Respondents</p>
                            <p className="text-5xl font-black text-slate-900 leading-none">{stats.total}</p>
                            {isComparisonMode && prevStats && (
                                <p className={`text-xs font-bold flex items-center gap-1 mt-2 ${stats.total >= prevStats.total ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    <TrendingUp size={12} className={stats.total < prevStats.total ? 'rotate-180' : ''} />
                                    {stats.total - prevStats.total > 0 ? '+' : ''}{stats.total - prevStats.total} vs prev period
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Avg Completion placeholder */}
                <motion.div
                    variants={fadeUp}
                    whileHover={{ scale: 1.02, y: -3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-violet-500/5 ring-1 ring-slate-200/50 p-8 opacity-75"
                >
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-violet-400/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                            <Clock size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Completion</p>
                            <p className="text-5xl font-black text-slate-900 leading-none">--</p>
                            <p className="text-xs text-slate-400 mt-2 font-medium">Not tracked</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* ── TAB BAR ── */}
            <motion.div variants={fadeUp} className="flex gap-2 bg-slate-100/70 backdrop-blur-sm p-1.5 rounded-2xl w-fit">
                {ANALYTICS_TABS.map(tab => (
                    <motion.button
                        key={tab}
                        onClick={() => setCurrentTab(tab)}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className={`relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${currentTab === tab
                            ? 'bg-white text-purple-700 shadow-md shadow-slate-200/80'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab === 'Overview' ? <Activity size={13} className="inline mr-1.5 mb-0.5" /> : <FileBarChart size={13} className="inline mr-1.5 mb-0.5" />}
                        {tab}
                    </motion.button>
                ))}
            </motion.div>

            {/* ── CONTENT AREA ── */}
            {loading ? (
                <motion.div variants={fadeUp} className="space-y-8">
                    <LoadingSkeleton type="stats" count={4} />
                    <LoadingSkeleton type="card" count={2} />
                </motion.div>
            ) : (
                <AnimatePresence mode="wait">
                    {/* OVERVIEW TAB */}
                    {currentTab === 'Overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            className="space-y-8"
                        >
                            {/* Charts Row */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <motion.div
                                    whileHover={{ scale: 1.01 }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                    className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden"
                                >
                                    <YearLevelChart submissions={filteredData.submissions} />
                                </motion.div>

                                <motion.div
                                    whileHover={{ scale: 1.01 }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                    className="relative bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden"
                                >
                                    <div className="absolute top-5 right-5 z-10">
                                        <div className="relative">
                                            <select
                                                value={topQuestionScoreFilter}
                                                onChange={e => setTopQuestionScoreFilter(e.target.value)}
                                                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-purple-400 focus:border-purple-400 cursor-pointer"
                                            >
                                                {[5, 4, 3, 2, 1].map(score => <option key={score} value={score}>{score} Star{score !== 1 ? 's' : ''}</option>)}
                                            </select>
                                            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <TopQuestionsChart questions={questions} answers={filteredData.answers} scoreFilter={topQuestionScoreFilter} />
                                </motion.div>
                            </div>

                            {/* Question Analysis Grid */}
                            <motion.div
                                whileHover={{ scale: 1.005 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden"
                            >
                                <div className="px-8 py-6 border-b border-slate-100/60 flex justify-between items-center bg-slate-50/60">
                                    <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                                        <Sparkles size={18} className="text-purple-500" /> Question Analysis
                                    </h3>
                                    <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                        N = {filteredData.submissions.length}
                                    </span>
                                </div>
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {questions.map((q) => (
                                        <QuestionChart key={q.id} question={q} answers={filteredData.answers} />
                                    ))}
                                    {questions.length === 0 && (
                                        <div className="col-span-3 py-16 text-center text-slate-400 font-medium">
                                            No questions available for this form.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* RESPONDENTS TAB */}
                    {currentTab === 'Respondents' && (
                        <motion.div
                            key="respondents"
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            className="space-y-6"
                        >
                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
                                    <Filter size={14} className="text-purple-500" />
                                    <div className="relative">
                                        <select
                                            value={courseFilter}
                                            onChange={e => setCourseFilter(e.target.value)}
                                            className="appearance-none pl-1 pr-8 text-sm font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                                        >
                                            <option value="All">All Courses</option>
                                            {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                    <Users size={13} className="text-slate-400" />
                                    <span className="text-sm font-bold text-slate-600">{sortedRespondents.length} students</span>
                                </div>
                            </div>

                            {/* Respondents Table */}
                            <motion.div
                                whileHover={{ scale: 1.002 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden"
                            >
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-slate-50/80 border-b border-slate-200/60 text-[10px] uppercase text-slate-500 font-black tracking-widest">
                                        <tr>
                                            <th scope="col" aria-sort={sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0">
                                                <button type="button" className="w-full cursor-pointer px-7 py-5 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500" onClick={() => handleSort('name')}>
                                                    Student Name <ArrowUpDown size={11} className="inline ml-1 text-purple-400" />
                                                </button>
                                            </th>
                                            <th scope="col" aria-sort={sortConfig.key === 'course' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0">
                                                <button type="button" className="w-full cursor-pointer px-7 py-5 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500" onClick={() => handleSort('course')}>
                                                    Course & Year <ArrowUpDown size={11} className="inline ml-1 text-purple-400" />
                                                </button>
                                            </th>
                                            <th scope="col" aria-sort={sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0">
                                                <button type="button" className="w-full cursor-pointer px-7 py-5 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500" onClick={() => handleSort('date')}>
                                                    Date Submitted <ArrowUpDown size={11} className="inline ml-1 text-purple-400" />
                                                </button>
                                            </th>
                                            <th className="px-7 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/60">
                                        <AnimatePresence>
                                            {sortedRespondents.map((sub, idx) => (
                                                <motion.tr
                                                    key={sub.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    transition={{ delay: idx * 0.02, type: 'spring', stiffness: 380, damping: 28 }}
                                                    whileHover={{ scale: 1.005, backgroundColor: 'rgba(250, 245, 255, 0.6)' }}
                                                    className="cursor-pointer group"
                                                >
                                                    <td className="px-7 py-5">
                                                        <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                                            {sub.students?.last_name}, {sub.students?.first_name}
                                                        </div>
                                                        <div className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                                                            {sub.students?.student_id || 'ID Unknown'}
                                                        </div>
                                                    </td>
                                                    <td className="px-7 py-5">
                                                        <div className="font-medium text-slate-700">{sub.students?.course || 'Unknown Course'}</div>
                                                        <div className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{sub.students?.year_level}</div>
                                                    </td>
                                                    <td className="px-7 py-5">
                                                        <div className="font-medium text-slate-700">
                                                            {new Date(sub.submitted_at).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                                                            {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="px-7 py-5 text-right">
                                                        <motion.button
                                                            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                                                            onClick={() => setViewingStudent(sub)}
                                                            className="inline-flex items-center gap-1.5 text-purple-700 font-bold text-xs bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition-colors border border-purple-200/60"
                                                        >
                                                            <Eye size={13} /> View Answers
                                                        </motion.button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                            {sortedRespondents.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-7 py-20 text-center text-slate-400 font-medium italic">
                                                        No responses found matching your filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* ── VIEW ANSWERS MODAL ── */}
            <AnimatePresence>
                {viewingStudent && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                    >
                        <button type="button" aria-label="Close response details" className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400" onClick={() => setViewingStudent(null)} />
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                            className="relative z-10 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-purple-900/20 w-full max-w-2xl max-h-[85vh] flex flex-col ring-1 ring-slate-200/60 overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="px-8 py-7 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-violet-50/50">
                                <div>
                                    <h3 className="font-black text-xl text-slate-900">
                                        {viewingStudent.students?.first_name}&apos;s Response
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                        {new Date(viewingStudent.submitted_at).toLocaleString()}
                                    </p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                                    onClick={() => setViewingStudent(null)}
                                    className="p-2.5 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-700 transition-colors shadow-sm border border-transparent hover:border-slate-200"
                                >
                                    <XCircle size={20} />
                                </motion.button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                                {questions.map((q, idx) => {
                                    const answer = filteredData.answers.find((a: any) => a.submission_id === viewingStudent.id && a.question_id === q.id);
                                    return (
                                        <motion.div
                                            key={q.id}
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.04 }}
                                            className="pb-5 border-b border-slate-100 last:border-0"
                                        >
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Question {idx + 1}</p>
                                            <p className="font-bold text-slate-800 mb-3 text-sm leading-relaxed">{q.question_text}</p>
                                            <div className="bg-purple-50 px-5 py-3.5 rounded-2xl border border-purple-100/80 text-purple-900 font-semibold text-sm">
                                                {answer
                                                    ? (answer.answer_text || answer.answer_value)
                                                    : <span className="text-slate-400 italic font-normal">No answer provided</span>
                                                }
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/60 flex justify-end rounded-b-[2rem]">
                                <motion.button
                                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => setViewingStudent(null)}
                                    className="px-7 py-2.5 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-700 hover:bg-gray-50 hover:border-slate-400 shadow-sm transition-colors"
                                >
                                    Close
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CareStaffAnalyticsPage;
