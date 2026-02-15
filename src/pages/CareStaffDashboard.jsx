import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
    LayoutDashboard, Users, ClipboardList, Calendar, CheckCircle,
    XCircle, Clock, Search, Filter, Download, User, MapPin,
    Phone, Mail, FileText, ChevronRight, Menu, LogOut, Bell,
    ArrowUpDown, Edit, Trash2, UploadCloud, AlertTriangle, Key, Plus,
    BarChart2, PieChart, List, Activity, Settings, Book, GraduationCap,
    TrendingUp, ClipboardCheck, CalendarCheck, Award, Rocket, ListChecks, Shield, Star, BookOpen,
    Send, Paperclip, MessageCircle, Info, Lock
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);
import { Chart } from 'chart.js/auto'; // Ensure Chart is imported if not already handled by react-chartjs-2 imports

const STORAGE_KEY = 'norsu_care_data_v2';

// Shared Excel export utility
const exportToExcel = async (headers, rows, filename) => {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Auto-size columns
    ws['!cols'] = headers.map((h, i) => {
        const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length));
        return { wch: Math.min(maxLen + 2, 50) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const defaultName = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Use native Save As dialog for reliable filename
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultName,
                types: [{ description: 'Excel Spreadsheet', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            if (err.name === 'AbortError') return; // user cancelled
        }
    }
    // Fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Helper Component for Individual Question Charts
const QuestionChart = ({ question, answers }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        if (chartRef.current) chartRef.current.destroy();

        // Filter answers for this specific question
        const relevantAnswers = answers.filter(a => a.question_id === question.id);

        // Count responses 1-5
        const counts = [0, 0, 0, 0, 0];
        let total = 0;
        relevantAnswers.forEach(a => {
            const val = parseInt(a.answer_value);
            if (val >= 1 && val <= 5) {
                counts[val - 1]++;
                total++;
            }
        });

        chartRef.current = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels: ['1', '2', '3', '4', '5'],
                datasets: [{
                    label: 'Count',
                    data: counts,
                    backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `${question.question_text} (n=${total})`,
                        font: { size: 11, weight: 'bold' },
                        padding: { bottom: 10 }
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                }
            }
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [question, answers]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-64 shadow-sm">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

// Helper Component for Year Level Chart
const YearLevelChart = ({ submissions }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const counts = {};
        submissions.forEach(s => {
            const year = s.students?.year_level || 'Unknown';
            counts[year] = (counts[year] || 0) + 1;
        });

        const labels = Object.keys(counts).sort();
        const data = labels.map(l => counts[l]);

        chartRef.current = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Respondents',
                    data: data,
                    backgroundColor: '#6366f1',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Respondents by Year Level', font: { size: 14, weight: 'bold' } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                }
            }
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [submissions]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-80 shadow-sm mb-6">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

// Helper Component for Top Questions Chart
const TopQuestionsChart = ({ questions, answers, scoreFilter }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        // Count occurrences of the selected score for each question
        const questionCounts = questions.map(q => {
            const count = answers.filter(a => a.question_id === q.id && parseInt(a.answer_value) === parseInt(scoreFilter)).length;
            return { question: q.question_text, count };
        });

        // Sort by count desc and take top 10
        const sorted = questionCounts.sort((a, b) => b.count - a.count).slice(0, 10);

        chartRef.current = new Chart(canvasRef.current, {
            type: 'bar',
            indexAxis: 'y', // Horizontal bar chart
            data: {
                labels: sorted.map(i => i.question.length > 40 ? i.question.substring(0, 40) + '...' : i.question),
                datasets: [{
                    label: `Respondents giving score ${scoreFilter}`,
                    data: sorted.map(i => i.count),
                    backgroundColor: '#8b5cf6', // Violet-500
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: `Top Questions with Score "${scoreFilter}"`, font: { size: 14, weight: 'bold' } }
                },
                scales: {
                    x: { beginAtZero: true, ticks: { precision: 0 } },
                    y: { grid: { display: false } }
                }
            }
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [questions, answers, scoreFilter]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-80 shadow-sm mb-6">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

// PAGE 4: Student Analytics (Adapted from carestaff.html)
const StudentAnalyticsPage = ({ showToast }) => {
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState(null);
    const [allDepartments, setAllDepartments] = useState([]);
    const [questions, setQuestions] = useState([]);

    const [currentTab, setCurrentTab] = useState('Overview');
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState({ submissions: [], answers: [] });
    const [filteredData, setFilteredData] = useState({ submissions: [], answers: [] });

    // Shared Student Management State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [studentsList, setStudentsList] = useState([]); // Lifted for shared access
    const [allCourses, setAllCourses] = useState([]); // Lifted for shared dropdowns

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setStudentsList(data || []);
        } catch (error) { console.error("Error fetching students:", error); }
    };

    const fetchCourses = async () => {
        const { data } = await supabase.from('courses').select('id, name, departments(id, name)').order('name');
        if (data) setAllCourses(data);
    };

    const refreshForms = async () => {
        const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
        if (data) setForms(data);
    };


    useEffect(() => {
        fetchStudents();
        fetchCourses();
        const channel = supabase.channel('public:students_analytics')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchStudents)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forms' }, refreshForms)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const openEditModal = (student) => {
        setEditForm(student);
        setShowEditModal(true);
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('students').update(editForm).eq('id', editForm.id);
            if (error) throw error;
            functions.showToast("Student profile updated successfully!");
            setShowEditModal(false);
            fetchStudents();
        } catch (err) { functions.showToast("Error updating profile: " + err.message, 'error'); }
    };

    const confirmDeleteStudent = async () => {
        if (!studentToDelete) return;
        try {
            const { error: err1 } = await supabase.from('students').delete().eq('id', studentToDelete.id);
            if (err1) throw err1;
            functions.logAudit("Deleted Student", `Removed student ${studentToDelete.first_name} ${studentToDelete.last_name} (${studentToDelete.student_id})`);
            if (studentToDelete.student_id) {
                await supabase.from('enrolled_students').delete().eq('student_id', studentToDelete.student_id);
                await supabase.from('applications').delete().eq('student_id', studentToDelete.student_id);
            }
            functions.showToast("Student record deleted successfully.");
            setShowDeleteModal(false);
            setStudentToDelete(null);
            fetchStudents();
        } catch (error) { functions.showToast("Error deleting record: " + error.message, 'error'); }
    };

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
            showToast("Error fetching analytics", 'error');
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

                const duration = end - start;
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
                showToast("Error comparing periods", 'error');
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
        let aVal = '', bVal = '';

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

    const uniqueCourses = [...new Set(analyticsData.submissions.map(s => s.students?.course).filter(Boolean))];

    const handleExportCharts = () => {
        // Implement export charts logic or simple alert
        showToast("Use browser print/save as PDF to export charts.", 'info');
    };

    const handleExportData = () => {
        // Implement CSV export logic
        showToast("Exporting data feature upcoming...", 'info');
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
                                            <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">No responses found match your filters.</td></tr>
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

// Helper Component for Counseling Calendar
const CalendarView = ({ requests }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getEventsForDay = (day) => {
        return requests.filter(r => {
            if (r.status !== 'Scheduled' || !r.schedule_date) return false;
            const d = new Date(r.schedule_date);
            return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-gray-50">
                <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Calendar size={20} className="text-purple-600" /> {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition"><ChevronRight className="rotate-180" size={16} /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Today</button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 text-center bg-white border-b border-gray-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>))}
            </div>
            <div className="grid grid-cols-7 bg-gray-50 gap-px border-b border-gray-200">
                {[...Array(firstDay)].map((_, i) => (<div key={`empty-${i}`} className="h-32 bg-gray-50"></div>))}
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const events = getEventsForDay(day);
                    const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                    return (
                        <div key={day} className={`h-32 bg-white p-2 transition hover:bg-purple-50/30 flex flex-col ${isToday ? 'bg-purple-50/20' : ''}`}>
                            <div className={`text-xs font-bold mb-2 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-purple-600 text-white' : 'text-gray-700'}`}>{day}</div>
                            <div className="flex-1 overflow-y-auto space-y-1">
                                {events.map(ev => (
                                    <div key={ev.id} className="text-[10px] bg-purple-50 text-purple-700 p-1.5 rounded border border-purple-100 truncate cursor-pointer hover:bg-purple-100 transition" title={`${ev.student_name} - ${new Date(ev.schedule_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
                                        <span className="font-bold block">{new Date(ev.schedule_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{ev.student_name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Shared Render Helper (module-scoped so all page components can use it)
const StatusBadge = ({ status }) => {
    const colors = {
        'Pending': 'bg-yellow-100 text-yellow-700',
        'Approved': 'bg-green-100 text-green-700',
        'Rejected': 'bg-red-100 text-red-700',
        'Referred': 'bg-purple-100 text-purple-700',
        'Scheduled': 'bg-blue-100 text-blue-700',
        'Forwarded to Dept': 'bg-orange-100 text-orange-700',
        'Passed': 'bg-green-100 text-green-700',
        'Failed': 'bg-red-100 text-red-700',
        'Completed': 'bg-green-100 text-green-700',
        'Submitted': 'bg-blue-100 text-blue-700'
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
};

// PAGE 5: NAT Management
const NATManagementPage = ({ showToast }) => {
    const [activeTab, setActiveTab] = useState('applications');
    const [applications, setApplications] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [courseLimits, setCourseLimits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [resultFilter, setResultFilter] = useState('All');
    const [completedFilter, setCompletedFilter] = useState('All');

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ date: '', venue: '', slots: '' });

    useEffect(() => {
        fetchData();
        const sub1 = supabase.channel('nat_apps').on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchData).subscribe();
        const sub2 = supabase.channel('nat_scheds').on('postgres_changes', { event: '*', schema: 'public', table: 'admission_schedules' }, fetchData).subscribe();
        const sub3 = supabase.channel('nat_courses').on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchData).subscribe();
        return () => { supabase.removeChannel(sub1); supabase.removeChannel(sub2); supabase.removeChannel(sub3); };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: apps } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
        const { data: scheds } = await supabase.from('admission_schedules').select('*').order('date', { ascending: true });
        const { data: courses } = await supabase.from('courses').select('*');
        setApplications(apps || []);
        setSchedules(scheds || []);
        setCourseLimits(courses || []);
        setLoading(false);
    };

    const updateStatus = async (id, newStatus) => {
        console.log(`[DEBUG] Attempting to update status for ID: ${id} to ${newStatus}`);
        if (!id) {
            alert("Error: Invalid Application ID");
            return;
        }

        /*
        if (!window.confirm(`Are you sure you want to update status to "${newStatus}"?`)) {
            console.log("[DEBUG] User cancelled update");
            return;
        }
        */

        try {
            console.log("[DEBUG] Sending update request to Supabase...");
            const { error } = await supabase
                .from('applications')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) {
                console.error("[DEBUG] Supabase Error:", error);
                throw error;
            }

            console.log("[DEBUG] Update successful!");
            showToast("Status updated successfully!");
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error("[DEBUG] Catch Block Error:", error);
            alert("Error updating status: " + error.message);
            showToast("Error updating status: " + error.message, 'error');
        }
    };

    const deleteApplication = async (id) => {
        console.log(`[DEBUG] Attempting to delete application ID: ${id}`);
        if (!id) {
            alert("Error: Invalid Application ID");
            return;
        }

        /*
        if (!window.confirm("Are you sure you want to delete this application? This action cannot be undone.")) {
            console.log("[DEBUG] User cancelled delete");
            return;
        }
        */

        try {
            console.log("[DEBUG] Sending delete request to Supabase...");
            const { error } = await supabase
                .from('applications')
                .delete()
                .eq('id', id);

            if (error) {
                console.error("[DEBUG] Supabase Error:", error);
                throw error;
            }

            console.log("[DEBUG] Delete successful!");
            showToast("Application deleted successfully!");
            fetchData();
        } catch (error) {
            console.error("[DEBUG] Catch Block Error:", error);
            alert("Error deleting application: " + error.message);
            showToast("Error deleting application: " + error.message, 'error');
        }
    };

    const handleAddSchedule = async (e) => {
        e.preventDefault();
        try {
            await supabase.from('admission_schedules').insert([scheduleForm]);
            showToast("Schedule added!");
            setShowScheduleModal(false);
            setScheduleForm({ date: '', venue: '', slots: '' });
            fetchData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const toggleSchedule = async (sch) => {
        await supabase.from('admission_schedules').update({ is_active: !sch.is_active }).eq('id', sch.id);
        fetchData();
    };

    const handleUpdateLimit = async (id, field, value) => {
        try {
            await supabase.from('courses').update({ [field]: value }).eq('id', id);
            showToast("Limit updated!");
            fetchData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const filteredApplications = applications.filter(app =>
        (app.first_name + ' ' + app.last_name + ' ' + app.reference_id).toLowerCase().includes(searchTerm.toLowerCase()) &&
        app.status !== 'Passed' && app.status !== 'Failed'
    );

    const completedApplications = applications.filter(app =>
        (app.status === 'Passed' || app.status === 'Failed') &&
        (completedFilter === 'All' || app.status === completedFilter)
    );

    const testTakers = applications.filter(app => app.time_in && app.time_out);
    const filteredResults = testTakers.filter(app => resultFilter === 'All' || app.priority_course === resultFilter);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("NAT Attendance Log", 14, 20);
        doc.autoTable({
            startY: 30,
            head: [["Student Name", "Ref ID", "Status", "Test Date", "Course", "In", "Out"]],
            body: filteredApplications.map(app => [
                `${app.first_name} ${app.last_name}`, app.reference_id, app.status, app.test_date, app.priority_course,
                app.time_in ? new Date(app.time_in).toLocaleTimeString() : '-', app.time_out ? new Date(app.time_out).toLocaleTimeString() : '-'
            ])
        });
        doc.save("NAT_Log.pdf");
    };

    const handleExportCSV = () => {
        if (filteredApplications.length === 0) { showToast("No applications to export.", 'info'); return; }
        const headers = ["Reference ID", "First Name", "Last Name", "Email", "Mobile", "Course Preference", "Status", "Test Date"];
        const rows = filteredApplications.map(app => [
            `"${app.reference_id}"`, `"${app.first_name}"`, `"${app.last_name}"`, `"${app.email}"`, `"${app.mobile}"`,
            `"${app.priority_course}"`, `"${app.status}"`, `"${app.test_date || ''}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nat_applications_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">NAT Management</h1>
                <p className="text-gray-500 text-sm">Manage NAT applications and course quotas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Total Applications</p><p className="text-xl font-bold">{applications.length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Submitted</p><p className="text-xl font-bold">{applications.filter(a => a.status === 'Scheduled' || a.status === 'Submitted').length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Test Takers</p><p className="text-xl font-bold">{testTakers.length}</p></div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-xs text-gray-500">Passed</p><p className="text-xl font-bold">{applications.filter(a => a.status === 'Passed').length}</p></div>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
                {['applications', 'test takers', 'completed', 'schedules', 'limits'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition ${activeTab === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>{t === 'completed' ? 'Completed Logs' : t}</button>
                ))}
            </div>

            {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> :
                activeTab === 'applications' ? (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="border rounded-lg px-3 py-1.5 text-sm w-64" />
                            <div className="flex gap-2">
                                <button onClick={handleExportCSV} className="text-green-600 text-sm font-bold flex items-center gap-1 hover:bg-green-50 px-2 py-1 rounded"><Download size={14} /> CSV</button>
                                <button onClick={handleExportPDF} className="text-red-600 text-sm font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"><FileText size={14} /> PDF</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Student</th><th className="p-4">Status</th><th className="p-4">Course</th><th className="p-4">Action</th></tr></thead>
                                <tbody className="divide-y">
                                    {filteredApplications.map(app => (
                                        <tr key={app.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold">{app.first_name} {app.last_name}<div className="text-xs text-gray-400 font-normal">{app.reference_id}</div></td>
                                            <td className="p-4"><StatusBadge status={app.status} /></td>
                                            <td className="p-4">{app.priority_course}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedApp(app); setShowModal(true); }} className="text-blue-600 font-bold text-xs cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">View</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app.id, 'Passed'); }} className="text-green-600 font-bold text-xs cursor-pointer hover:bg-green-50 px-2 py-1 rounded transition-colors">Pass</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app.id, 'Failed'); }} className="text-red-600 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Fail</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteApplication(app.id); }} className="text-slate-400 font-bold text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 px-2 py-1 rounded transition-colors">Del</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeTab === 'test takers' ? (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold">Test Takers</h3>
                                <p className="text-xs text-gray-400">Applicants who completed the test (timed in & timed out)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 font-bold">{filteredResults.length} applicant{filteredResults.length !== 1 ? 's' : ''}</span>
                                <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-sm"><option value="All">All Courses</option>{courseLimits.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Student</th><th className="p-4">Ref ID</th><th className="p-4">Course</th><th className="p-4">Test Date</th><th className="p-4">Time In</th><th className="p-4">Time Out</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
                                <tbody className="divide-y">
                                    {filteredResults.length === 0 ? (
                                        <tr><td colSpan="8" className="p-8 text-center text-gray-400 text-sm">No test takers yet. Applicants appear here once they time in and time out on test day.</td></tr>
                                    ) : filteredResults.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold">{r.first_name} {r.last_name}</td>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{r.reference_id}</td>
                                            <td className="p-4">{r.priority_course}</td>
                                            <td className="p-4 text-gray-600">{r.test_date ? new Date(r.test_date).toLocaleDateString() : '—'}</td>
                                            <td className="p-4 text-green-600 font-mono text-xs">{r.time_in ? new Date(r.time_in).toLocaleTimeString() : '—'}</td>
                                            <td className="p-4 text-red-500 font-mono text-xs">{r.time_out ? new Date(r.time_out).toLocaleTimeString() : '—'}</td>
                                            <td className="p-4"><StatusBadge status={r.status} /></td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'Passed'); }} className="text-green-600 font-bold text-xs cursor-pointer hover:bg-green-50 px-2 py-1 rounded transition-colors">Pass</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteApplication(r.id); }} className="text-red-500 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeTab === 'completed' ? (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold">Completed Logs</h3>
                                <p className="text-xs text-gray-400">Archived applications (Passed & Failed)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 font-bold">{completedApplications.length} record{completedApplications.length !== 1 ? 's' : ''}</span>
                                <select value={completedFilter} onChange={e => setCompletedFilter(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
                                    <option value="All">All Status</option>
                                    <option value="Passed">Passed</option>
                                    <option value="Failed">Failed</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="p-4">Student</th>
                                        <th className="p-4">Ref ID</th>
                                        <th className="p-4">Course</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Date Completed</th>
                                        <th className="p-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {completedApplications.length === 0 ? (
                                        <tr><td colSpan="6" className="p-8 text-center text-gray-400 text-sm">No completed logs yet.</td></tr>
                                    ) : completedApplications.map(app => (
                                        <tr key={app.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold">{app.first_name} {app.last_name}</td>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{app.reference_id}</td>
                                            <td className="p-4">{app.priority_course}</td>
                                            <td className="p-4"><StatusBadge status={app.status} /></td>
                                            <td className="p-4 text-gray-500 text-xs">{new Date(app.created_at).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <button onClick={(e) => { e.stopPropagation(); deleteApplication(app.id); }} className="text-red-500 font-bold text-xs cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeTab === 'schedules' ? (
                    <div className="space-y-4">
                        <div className="flex justify-end"><button onClick={() => setShowScheduleModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold">+ Add Schedule</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {schedules.map(sch => (
                                <div key={sch.id} className="bg-white p-4 rounded-xl border shadow-sm">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-gray-800">{new Date(sch.date).toDateString()}</span>
                                        <button onClick={() => toggleSchedule(sch)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${sch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{sch.is_active ? 'Active' : 'Closed'}</button>
                                    </div>
                                    <div className="text-sm text-gray-600 text-center py-4">{sch.venue} • {sch.slots} Slots</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Course</th><th className="p-4 text-center">Applicants</th><th className="p-4 text-center">Limit</th><th className="p-4 text-center">Status</th></tr></thead>
                            <tbody className="divide-y">
                                {courseLimits.map(c => (
                                    <tr key={c.id}>
                                        <td className="p-4 font-bold">{c.name}</td>
                                        <td className="p-4 text-center font-mono font-bold text-blue-600">{applications.filter(a => a.priority_course === c.name).length}</td>
                                        <td className="p-4 text-center"><input type="number" className="border rounded w-20 text-center" defaultValue={c.application_limit || 200} onBlur={e => handleUpdateLimit(c.id, 'application_limit', e.target.value)} /></td>
                                        <td className="p-4 text-center"><button onClick={() => handleUpdateLimit(c.id, 'status', c.status === 'Closed' ? 'Open' : 'Closed')} className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'Closed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{c.status || 'Open'}</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

            {/* Application Modal */}
            {
                showModal && selectedApp && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">Application Details</h3><button onClick={() => setShowModal(false)}><XCircle className="text-gray-400" /></button></div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-500">Name</label><p className="font-bold">{selectedApp.first_name} {selectedApp.last_name}</p></div>
                                    <div><label className="text-xs font-bold text-gray-500">Ref ID</label><p className="font-mono">{selectedApp.reference_id}</p></div>
                                    <div><label className="text-xs font-bold text-gray-500">Email</label><p>{selectedApp.email}</p></div>
                                    <div><label className="text-xs font-bold text-gray-500">Mobile</label><p>{selectedApp.mobile}</p></div>
                                    <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Course Preference</label><p className="font-bold text-purple-600">{selectedApp.priority_course}</p></div>
                                </div>
                                <div className="pt-4 border-t flex justify-end gap-2">
                                    <button onClick={() => updateStatus(selectedApp.id, 'Passed')} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm">Pass</button>
                                    <button onClick={() => updateStatus(selectedApp.id, 'Failed')} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm">Fail</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Schedule Modal */}
            {
                showScheduleModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                            <h3 className="font-bold text-lg mb-4">Add Schedule</h3>
                            <form onSubmit={handleAddSchedule} className="space-y-4">
                                <div><label className="text-xs font-bold block mb-1">Date</label><input type="date" className="w-full border rounded p-2" value={scheduleForm.date} onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} required /></div>
                                <div><label className="text-xs font-bold block mb-1">Venue</label><input className="w-full border rounded p-2" value={scheduleForm.venue} onChange={e => setScheduleForm({ ...scheduleForm, venue: e.target.value })} required /></div>
                                <div><label className="text-xs font-bold block mb-1">Slots</label><input type="number" className="w-full border rounded p-2" value={scheduleForm.slots} onChange={e => setScheduleForm({ ...scheduleForm, slots: e.target.value })} required /></div>
                                <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold">Save</button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

// PAGE 10: Scholarship Management (Basic Implementation)
const ScholarshipPage = ({ functions }) => {
    const [scholarships, setScholarships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', amount: '', deadline: '' });

    useEffect(() => {
        fetchScholarships();
        const channel = supabase
            .channel('public:scholarships')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scholarships' }, fetchScholarships)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchScholarships = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('scholarships')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setScholarships(data || []);
        } catch (error) {
            console.error("Error fetching scholarships:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('scholarships').insert([form]);
            if (error) throw error;
            functions.showToast("Scholarship added!");
            setShowModal(false);
            setForm({ title: '', amount: '', deadline: '' });
            fetchScholarships();
        } catch (error) {
            functions.showToast("Error: " + error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this scholarship?")) return;
        try {
            const { error } = await supabase.from('scholarships').delete().eq('id', id);
            if (error) throw error;
            fetchScholarships();
        } catch (error) {
            functions.showToast("Error: " + error.message, 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div><h1 className="text-2xl font-bold text-gray-900">Scholarship Management</h1><p className="text-gray-500 text-sm mt-1">Manage scholarship programs and view applications.</p></div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md transition"><Plus size={16} /> Add Scholarship</button>
            </div>

            {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scholarships.map(s => (
                        <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4"><div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl"><GraduationCap size={20} /></div><span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${s.status === 'Closed' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{s.status || 'Open'}</span></div>
                            <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3><p className="text-sm text-gray-500 mb-4">Deadline: {s.deadline}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100"><span className="font-bold text-gray-900">₱{s.amount}</span><button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 text-sm"><Trash2 size={16} /></button></div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"><div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-lg text-gray-900">Add Scholarship</h3><button onClick={() => setShowModal(false)}><XCircle size={20} /></button></div><form onSubmit={handleSubmit} className="p-6 space-y-4"><div><label className="block text-xs font-bold text-gray-700 mb-1">Title</label><input required className="w-full border rounded-lg p-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div><div><label className="block text-xs font-bold text-gray-700 mb-1">Amount</label><input required className="w-full border rounded-lg p-2 text-sm" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div><div><label className="block text-xs font-bold text-gray-700 mb-1">Deadline</label><input required type="date" className="w-full border rounded-lg p-2 text-sm" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div><button className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm">Save</button></form></div>
                </div>
            )}
        </div>
    );
};

const FormManagementPage = ({ functions }) => {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchForms = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('forms')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            setForms(data.map(f => ({
                ...f,
                lastUpdated: new Date(f.created_at || Date.now()).toLocaleDateString()
            })));
        }
        setLoading(false);
    };

    useEffect(() => { fetchForms(); }, []);

    const [editingForm, setEditingForm] = useState(null);
    const [editingQuestions, setEditingQuestions] = useState([]);
    const [showEditor, setShowEditor] = useState(false);
    const [previewForm, setPreviewForm] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handlePreview = async (form) => {
        const { data: questions } = await supabase
            .from('questions')
            .select('*')
            .eq('form_id', form.id)
            .order('order_index', { ascending: true });

        setPreviewForm({ ...form, questions: questions || [] });
        setShowPreview(true);
    };

    const handleEdit = async (form) => {
        setEditingForm({ ...form });
        const { data: questions } = await supabase
            .from('questions')
            .select('*')
            .eq('form_id', form.id)
            .order('order_index', { ascending: true });

        setEditingQuestions(questions || []);
        setShowEditor(true);
    };

    const handleCreate = () => {
        setEditingForm({ title: '', description: '' });
        setEditingQuestions([]);
        setShowEditor(true);
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        try {
            // 1. Upsert Form
            const formPayload = {
                title: editingForm.title,
                description: editingForm.description
            };
            if (editingForm.id) formPayload.id = editingForm.id;

            const { data: savedForm, error: formError } = await supabase
                .from('forms')
                .upsert([formPayload])
                .select()
                .single();

            if (formError) throw formError;

            // 2. Upsert Questions
            if (editingQuestions.length > 0) {
                const questionsPayload = editingQuestions.map((q, idx) => {
                    const qData = {
                        form_id: savedForm.id,
                        question_text: q.question_text,
                        order_index: idx,
                        question_type: 'scale'
                    };
                    if (q.id) qData.id = q.id;
                    return qData;
                });

                const { error: qError } = await supabase
                    .from('questions')
                    .upsert(questionsPayload);

                if (qError) throw qError;
            }

            functions.showToast("Form saved successfully!");
            setShowEditor(false);
            fetchForms();
        } catch (err) { functions.showToast("Error: " + err.message, 'error'); }
    };

    const handleQuestionChange = (idx, val) => {
        const newQs = [...editingQuestions];
        newQs[idx] = { ...newQs[idx], question_text: val };
        setEditingQuestions(newQs);
    };

    const addQuestion = () => {
        setEditingQuestions([...editingQuestions, { question_text: '' }]);
    };

    const removeQuestion = async (idx) => {
        const q = editingQuestions[idx];
        if (q.id) {
            await supabase.from('questions').delete().eq('id', q.id);
        }
        const newQs = editingQuestions.filter((_, i) => i !== idx);
        setEditingQuestions(newQs);
    };

    const handleBulkQuestionsUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

            if (lines.length === 0) { functions.showToast("No questions found in file.", 'error'); return; }

            const newQuestions = lines.map(line => ({ question_text: line.trim() }));
            setEditingQuestions(prev => [...prev, ...newQuestions]);
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const content = "I feel stressed often\nI have trouble sleeping\nI need financial assistance";
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "questions_template.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleDeleteForm = async () => {
        if (!deleteConfirm) return;
        setIsDeleting(true);
        try {
            // 1. Get all submission IDs for this form
            const { data: submissions } = await supabase
                .from('submissions')
                .select('id')
                .eq('form_id', deleteConfirm.id);

            // 2. Delete all answers for those submissions
            if (submissions && submissions.length > 0) {
                const subIds = submissions.map(s => s.id);
                const { error: ansErr } = await supabase
                    .from('answers')
                    .delete()
                    .in('submission_id', subIds);
                if (ansErr) throw ansErr;
            }

            // 3. Delete all submissions for this form
            const { error: subErr } = await supabase
                .from('submissions')
                .delete()
                .eq('form_id', deleteConfirm.id);
            if (subErr) throw subErr;

            // 4. Delete all questions for this form
            const { error: qErr } = await supabase
                .from('questions')
                .delete()
                .eq('form_id', deleteConfirm.id);
            if (qErr) throw qErr;

            // 5. Delete the form itself
            const { error: fErr } = await supabase
                .from('forms')
                .delete()
                .eq('id', deleteConfirm.id);
            if (fErr) throw fErr;

            functions.showToast('Form and all related data deleted successfully.');
            setDeleteConfirm(null);
            fetchForms();
        } catch (err) {
            functions.showToast('Error deleting form: ' + err.message, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Form Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage normalized survey forms and questions.</p>
                </div>
                <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md transition">
                    <Plus size={16} /> Create New Form
                </button>
            </div>

            {loading ? <div className="text-center py-12 text-gray-500">Loading forms...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {forms.map(form => (
                        <div key={form.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl"><ClipboardList size={24} /></div>
                                <span className="text-xs text-gray-400">Updated: {form.lastUpdated}</span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-2">{form.title}</h3>
                            <p className="text-sm text-gray-500 mb-6 h-10 line-clamp-2">{form.description}</p>
                            <div className="flex gap-3">
                                <button onClick={() => handleEdit(form)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm">Edit Form</button>
                                <button onClick={() => handlePreview(form)} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition" title="Preview"><CheckCircle size={16} /></button>
                                <button onClick={() => setDeleteConfirm(form)} className="px-4 py-2.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition" title="Delete Form"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Editor Modal */}
            {showEditor && editingForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">{editingForm.id ? 'Edit Form' : 'Create Form'}</h3>
                            <button onClick={() => setShowEditor(false)}><XCircle className="text-gray-400 hover:text-gray-600" size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-6"><label className="block text-xs font-bold text-gray-700 mb-1">Form Title</label><input value={editingForm.title} onChange={e => setEditingForm({ ...editingForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Student Satisfaction Survey" /></div>
                            <div className="mb-6"><label className="block text-xs font-bold text-gray-700 mb-1">Description</label><textarea value={editingForm.description} onChange={e => setEditingForm({ ...editingForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows="2" placeholder="Purpose of this form..."></textarea></div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-bold text-gray-700">Questions (Likert Scale 1-5)</label>
                                <div className="flex gap-3">
                                    <button onClick={handleDownloadTemplate} className="text-xs text-gray-500 hover:text-gray-700 font-bold hover:underline flex items-center"><Download size={14} className="mr-1" /> Template</button>
                                    <label className="text-xs text-purple-600 font-bold hover:underline cursor-pointer flex items-center"><UploadCloud size={14} className="mr-1" /> Upload List<input type="file" accept=".txt,.csv" className="hidden" onChange={handleBulkQuestionsUpload} /></label>
                                    <button onClick={addQuestion} className="text-xs text-blue-600 font-bold hover:underline">+ Add Question</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {editingQuestions.map((q, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <div className="bg-gray-100 px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 text-gray-500 text-xs flex items-center h-full">{idx + 1}</div>
                                        <input value={q.question_text} onChange={e => handleQuestionChange(idx, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600 rounded-r-none" placeholder="Enter question text..." />
                                        <button onClick={() => removeQuestion(idx)} className="px-3 py-2 bg-red-50 text-red-500 border border-l-0 border-red-100 rounded-r-lg hover:bg-red-100 h-full"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                                {editingQuestions.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No questions added yet.</p>}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"><button onClick={() => setShowEditor(false)} className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Cancel</button><button onClick={handleSaveForm} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">Save Changes</button></div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && previewForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Preview: {previewForm.title}</h3>
                            <button onClick={() => setShowPreview(false)}><XCircle className="text-gray-400 hover:text-gray-600" size={20} /></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{previewForm.title}</h2>
                                <p className="text-gray-500 mb-8">{previewForm.description}</p>
                                <div className="space-y-6">
                                    {previewForm.questions && previewForm.questions.map((q, idx) => (
                                        <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
                                            <label className="block text-sm font-bold text-gray-700 mb-3">{idx + 1}. {q.question_text}</label>
                                            <div className="flex justify-between px-2">
                                                {[1, 2, 3, 4, 5].map(val => (
                                                    <div key={val} className="flex flex-col items-center gap-1">
                                                        <div className="w-4 h-4 rounded-full border border-gray-300 bg-gray-50"></div>
                                                        <span className="text-[10px] text-gray-400">{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <button disabled className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold opacity-50 cursor-not-allowed">Submit Form</button>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setShowPreview(false)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Close Preview</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0"><Trash2 size={24} /></div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Delete Form</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-700 font-medium mb-1">You are about to permanently delete:</p>
                            <p className="text-sm font-bold text-red-800">&ldquo;{deleteConfirm.title}&rdquo;</p>
                            <ul className="text-xs text-red-600 mt-2 space-y-1 list-disc list-inside">
                                <li>All questions in this form</li>
                                <li>All student submissions</li>
                                <li>All recorded answers</li>
                            </ul>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleDeleteForm} disabled={isDeleting} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-sm flex items-center justify-center gap-2">
                                {isDeleting ? (<><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Deleting...</>) : (<><Trash2 size={14} /> Delete Everything</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FeedbackPage = ({ functions }) => {
    const [currentView, setCurrentView] = useState('Counseling');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] });

    const fetchData = async () => {
        setLoading(true);
        try {
            let rawData = [];
            if (currentView === 'Counseling') {
                const { data, error } = await supabase
                    .from('counseling_requests')
                    .select('*')
                    .not('rating', 'is', null)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                rawData = data.map(d => ({
                    id: d.id,
                    student: d.student_name,
                    rating: d.rating,
                    comment: d.feedback,
                    date: d.created_at,
                    context: d.request_type
                }));
            } else {
                const { data, error } = await supabase
                    .from('event_feedback')
                    .select('*, events(title)')
                    .order('submitted_at', { ascending: false });
                if (error) throw error;
                rawData = data.map(d => ({
                    id: d.id,
                    student: d.student_name,
                    rating: d.rating,
                    comment: d.feedback,
                    date: d.submitted_at,
                    context: d.events?.title || 'Event'
                }));
            }

            setItems(rawData);

            if (rawData.length > 0) {
                const total = rawData.length;
                const sum = rawData.reduce((acc, curr) => acc + (curr.rating || 0), 0);
                const dist = [0, 0, 0, 0, 0];
                rawData.forEach(r => {
                    if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
                });
                setStats({ avg: (sum / total).toFixed(1), total, distribution: dist });
            } else {
                setStats({ avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] });
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentView]);

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feedback Center</h1>
                    <p className="text-gray-500 text-sm mt-1">Review student satisfaction and feedback.</p>
                </div>
                <button onClick={() => {
                    if (items.length === 0) return;
                    const headers = ['Student', 'Rating', 'Comment', 'Date', currentView === 'Counseling' ? 'Request Type' : 'Event'];
                    const rows = items.map(i => [i.student, i.rating, i.comment || '', new Date(i.date).toLocaleString(), i.context]);
                    exportToExcel(headers, rows, `${currentView.toLowerCase()}_feedback`);
                }} disabled={items.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download size={16} /> Export Excel
                </button>
            </div>

            <div className="flex gap-4 mb-8">
                <button onClick={() => setCurrentView('Counseling')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${currentView === 'Counseling' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>Counseling Services</button>
                <button onClick={() => setCurrentView('Events')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${currentView === 'Events' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>Events & Activities</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <h3 className="text-5xl font-bold text-gray-900 mb-2">{stats.avg}</h3>
                    <div className="flex text-yellow-400 text-sm mb-2">
                        {[1, 2, 3, 4, 5].map(n => <span key={n} className={`text-lg ${n <= Math.round(stats.avg) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
                    </div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Average Rating</p>
                </div>
                <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-end gap-4 h-40">
                    {stats.distribution.map((count, idx) => {
                        const pct = stats.total ? (count / stats.total) * 100 : 0;
                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                <div className="w-full bg-blue-100 rounded-t-lg relative group transition-all duration-500" style={{ height: `${pct}%`, minHeight: '4px' }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{count} reviews</div>
                                </div>
                                <span className="text-xs font-bold text-gray-600">{idx + 1} <span className="text-gray-400">★</span></span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {loading ? <div className="text-center py-12 text-gray-500">Loading feedback...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {items.map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">{item.student.charAt(0)}</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{item.student}</h4>
                                        <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex text-yellow-400 text-xs">
                                    {[1, 2, 3, 4, 5].map(n => <span key={n} className={`text-sm ${n <= item.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
                                </div>
                            </div>
                            <div className="mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Context</span>
                                <p className="text-xs font-bold text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded">{item.context}</p>
                            </div>
                            <p className="text-sm text-gray-600 italic">"{item.comment || 'No written comment.'}"</p>
                        </div>
                    ))}
                    {items.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No feedback found for this category.</div>}
                </div>
            )}
        </div>
    );
};

const AuditLogsPage = () => {
    const [logs, setLogs] = useState([]);
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
        return () => supabase.removeChannel(channel);
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
                    const rows = logs.map(l => [new Date(l.created_at).toLocaleString(), l.user_name, l.action, l.details || '']);
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
                            {loading ? <tr><td colSpan="4" className="p-6 text-center text-gray-500">Loading logs...</td></tr> :
                                logs.length === 0 ? <tr><td colSpan="4" className="p-6 text-center text-gray-500">No logs found.</td></tr> :
                                    logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-500 font-mono text-xs">{new Date(log.created_at).toLocaleString()}</td>
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

const OfficeLogbookPage = ({ functions }) => {
    const [visits, setVisits] = useState([]);
    const [reasons, setReasons] = useState([]);
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
        return () => supabase.removeChannel(channel);
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
                        {loading ? <tr><td colSpan="5" className="p-6 text-center">Loading...</td></tr> :
                            visits.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-gray-500">No visits recorded.</td></tr> :
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

// Standalone live clock — isolated re-renders so parent doesn't flicker
const useLiveClock = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = currentTime.getHours();
    const greeting = hours < 12 ? 'Good Morning' : hours < 18 ? 'Good Afternoon' : 'Good Evening';
    const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const [timePart, ampm] = timeString.split(' ');
    const [h, m, s] = timePart.split(':');

    return { greeting, h, m, s, ampm, dateString };
};

const ClockDisplay = () => {
    const { h, m, s, ampm, dateString } = useLiveClock();
    return (
        <div className="relative">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-8 py-6 min-w-[260px]">
                <div className="flex items-baseline justify-center gap-1 mb-3">
                    <span className="text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums">{h}</span>
                    <span className="text-5xl md:text-6xl font-light text-purple-300 animate-pulse">:</span>
                    <span className="text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums">{m}</span>
                    <span className="text-5xl md:text-6xl font-light text-purple-300 animate-pulse">:</span>
                    <span className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums text-purple-300">{s}</span>
                    <span className="text-lg font-bold text-purple-400 ml-2 self-start mt-2">{ampm}</span>
                </div>
                <p className="text-purple-300/70 text-sm font-medium">{dateString}</p>
            </div>
            <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-3xl -z-10" />
        </div>
    );
};

const GreetingText = () => {
    const { greeting } = useLiveClock();
    return <p className="text-purple-300/80 text-sm font-medium tracking-wide uppercase mb-2 animate-fade-in-up">{greeting}</p>;
};

const HomeAdminTools = ({ functions }) => {
    const tools = [
        { title: 'Student Analytics', desc: 'Deep dive into student population trends and wellness metrics.', icon: <Search />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200/50' },
        { title: 'Form Management', desc: 'Build and analyze Needs Assessment forms with real-time feedback.', icon: <ClipboardCheck />, color: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-200/50' },
        { title: 'Event Broadcasting', desc: 'Schedule campus events and monitor live attendance check-ins.', icon: <CalendarCheck />, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-200/50' },
        { title: 'Scholarship Tracking', desc: 'Manage grant applications and review student eligibility.', icon: <Award />, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200/50' },
    ];

    return (
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Settings size={18} className="text-purple-500" /> Quick Launch</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tools.map((tool, idx) => (
                    <button
                        key={idx}
                        onClick={() => functions.handleLaunchModule(tool.title)}
                        className="card-hover bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/80 text-left group animate-fade-in-up"
                        style={{ animationDelay: `${idx * 80}ms` }}
                    >
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} text-white flex items-center justify-center mb-3 shadow-lg ${tool.shadow} group-hover:scale-105 transition-transform`}>
                            {tool.icon}
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">{tool.title}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{tool.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

const HomePage = ({ functions }) => {

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Hero with Live Clock */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-8 md:p-10 text-white shadow-2xl shadow-purple-900/20">
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl -mr-20 -mt-20 animate-float" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl -ml-16 -mb-16" />
                <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-violet-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
                    {/* Left: Greeting */}
                    <div className="text-center lg:text-left flex-1">
                        <GreetingText />
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            Welcome to <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">Care Staff Portal</span>
                        </h1>
                        <p className="text-purple-200/70 text-base mb-6 max-w-md animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            Streamlined student care management and comprehensive analytics at your fingertips.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <button onClick={functions.handleGetStarted} className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 hover:scale-[1.02] transition-all duration-200">
                                <Rocket size={18} /> Get Started
                            </button>
                            <button onClick={functions.handleOpenAnalytics} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] transition-all duration-200">
                                <BarChart2 size={18} /> Analytics
                            </button>
                        </div>
                    </div>

                    {/* Right: Live Clock */}
                    <div className="text-center flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                        <ClockDisplay />
                    </div>
                </div>
            </div>

            {/* Admin Tools */}
            <HomeAdminTools functions={functions} />

            {/* Pro Tip Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden shadow-xl shadow-indigo-200/30">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                <div className="flex-1 relative z-10">
                    <h3 className="text-lg font-bold mb-1">💡 Pro Tip: Deep Analytics</h3>
                    <p className="text-sm text-indigo-100/80">Use the Student Analytics dashboard to identify at-risk students early and deploy targeted interventions.</p>
                </div>
                <button
                    onClick={functions.handleOpenAnalytics}
                    className="mt-4 md:mt-0 ml-0 md:ml-6 px-6 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/25 transition-all whitespace-nowrap"
                >
                    Launch Analytics
                </button>
            </div>
        </div>
    );
};

const StudentPopulationPage = ({ functions, sharedState }) => {
    const {
        studentsList, allCourses, fetchStudents,
        showEditModal, setShowEditModal,
        editForm, setEditForm,
        showDeleteModal, setShowDeleteModal,
        studentToDelete, setStudentToDelete,
        openEditModal, handleUpdateStudent, confirmDeleteStudent
    } = sharedState;

    const [showModal, setShowModal] = useState(false);
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // const [showEditModal, setShowEditModal] = useState(false); // Lifted
    // const [editForm, setEditForm] = useState({}); // Lifted
    // const [studentsList, setStudentsList] = useState([]); // Lifted
    // const [allCourses, setAllCourses] = useState([]); // Lifted
    // const [showDeleteModal, setShowDeleteModal] = useState(false); // Lifted
    // const [studentToDelete, setStudentToDelete] = useState(null); // Lifted
    const [loading, setLoading] = useState(false); // Used for local loading states if needed
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'stats'
    const itemsPerPage = 10;
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [enrollmentKeys, setEnrollmentKeys] = useState([]);
    /* Lifted to Parent
    const fetchStudents = async () => { ... };
    const fetchCourses = async () => { ... };
    useEffect(() => { fetchStudents(); fetchCourses(); ... }, []);
    */

    const fetchEnrollmentKeys = async () => {
        try {
            const { data, error } = await supabase
                .from('enrolled_students')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEnrollmentKeys(data || []);
        } catch (error) {
            console.error('Error fetching enrollment keys:', error);
            functions.showToast('Failed to fetch enrollment keys', 'error');
        }
    };

    useEffect(() => {
        if (showEnrollmentModal) fetchEnrollmentKeys();
    }, [showEnrollmentModal]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const [studentForm, setStudentForm] = useState({
        firstName: '', lastName: '', studentId: '', course: '', year: '1st Year', status: 'Active'
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setStudentForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const selectedCourseData = allCourses.find(c => c.name === studentForm.course);
        const departmentName = selectedCourseData?.departments?.name || 'Unassigned';

        try {
            const { error } = await supabase
                .from('students')
                .insert([{
                    first_name: studentForm.firstName,
                    last_name: studentForm.lastName,
                    student_id: studentForm.studentId,
                    course: studentForm.course,
                    year_level: studentForm.year,
                    status: studentForm.status,
                    department: departmentName
                }]);

            if (error) throw error;

            await supabase.from('enrolled_students').upsert([
                { student_id: studentForm.studentId, course: studentForm.course, is_used: false }
            ], { onConflict: 'student_id' });

            functions.showToast("Student saved successfully!");
            setShowModal(false);
            setStudentForm({ firstName: '', lastName: '', studentId: '', course: '', year: '1st Year', status: 'Active' });
            fetchStudents();
        } catch (error) {
            functions.showToast("Error saving student: " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* handlers lifted */

    const handleDeleteKey = async (studentId) => {
        if (!window.confirm(`Delete enrollment key for ${studentId}?`)) return;
        try {
            const { error } = await supabase.from('enrolled_students').delete().eq('student_id', studentId);
            if (error) throw error;
            functions.showToast("Enrollment key deleted.");
            fetchEnrollmentKeys();
        } catch (err) {
            functions.showToast(err.message, 'error');
        }
    };

    const handleGenerateKey = async (e) => {
        e.preventDefault();
        const id = e.target.enrollmentId.value;
        const course = e.target.enrollmentCourse.value;
        try {
            const { error } = await supabase
                .from('enrolled_students')
                .upsert([{ student_id: id, course: course, is_used: false }], { onConflict: 'student_id' });

            if (error) throw error;
            functions.showToast(`Enrollment Key Added/Updated: ${id} (${course})`);
            e.target.reset();
            fetchEnrollmentKeys();
        } catch (error) {
            functions.showToast("Error: " + error.message, 'error');
        }
    };

    // Note: Bulk Upload logic requires FileReader, similar to html version.
    // Simplifying for brevity - could be a separate utility if complex.
    const handleBulkUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split(/\r?\n/)
                .map(line => {
                    const [id, course] = line.split(',');
                    return { id: id?.trim(), course: course?.trim() };
                })
                .filter(row => row.id && row.id.toLowerCase() !== 'student_id');

            const rawIds = rows.map(r => r.id);
            if (rawIds.length === 0) { functions.showToast("No valid IDs found.", 'error'); return; }

            const uniqueIds = [...new Set(rawIds)];

            try {
                const { data: existing, error: checkError } = await supabase
                    .from('enrolled_students')
                    .select('student_id')
                    .in('student_id', uniqueIds);

                if (checkError) throw checkError;

                const existingIds = existing.map(row => row.student_id);
                const newIds = uniqueIds.filter(id => !existingIds.includes(id));

                if (newIds.length === 0) { functions.showToast("All IDs in this file already exist.", 'info'); e.target.value = ''; return; }

                if (!confirm(`Found ${newIds.length} new IDs to upload. Proceed?`)) { e.target.value = ''; return; }

                const validCourses = new Set(allCourses.map(c => c.name));
                const updates = rows.filter(r => newIds.includes(r.id)).map(r => ({
                    student_id: r.id,
                    course: validCourses.has(r.course) ? r.course : null,
                    is_used: false
                })).filter(r => r.course); // Remove rows with invalid courses to prevent FK violation
                const { error } = await supabase.from('enrolled_students').insert(updates);
                if (error) throw error;
                functions.showToast(`Successfully added ${newIds.length} new enrollment keys!`);
                fetchEnrollmentKeys();
                e.target.value = '';
            } catch (error) { functions.showToast("Upload failed: " + error.message, 'error'); e.target.value = ''; }
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const csvContent = "Student ID,Course\n2026-1001,BS Information Technology\n2026-1002,BS Civil Engineering\n2026-1003,BS Nursing";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "student_ids_template.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const filteredStudents = studentsList.filter(s => {
        const matchesSearch = (s.first_name + ' ' + s.last_name + ' ' + s.student_id).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCourse = courseFilter === 'All' || s.course === courseFilter;
        return matchesSearch && matchesCourse;
    });

    const handleExportCSV = () => {
        if (filteredStudents.length === 0) { functions.showToast("No students to export.", 'info'); return; }
        const headers = ["First Name", "Last Name", "Student ID", "Course", "Year Level", "Status"];
        const rows = filteredStudents.map(s => [`"${s.first_name}"`, `"${s.last_name}"`, `"${s.student_id}"`, `"${s.course}"`, `"${s.year_level}"`, `"${s.status}"`]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `student_list_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sortedStudents = [...filteredStudents].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'name') {
            aVal = `${a.last_name} ${a.first_name}`.toLowerCase();
            bVal = `${b.last_name} ${b.first_name}`.toLowerCase();
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = sortedStudents.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Student Population</h1>
                    <p className="text-slate-500 text-sm mt-1">Comprehensive management and analytics for the student body.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition">
                        <Download size={16} /> Export
                    </button>
                    <button onClick={() => setShowEnrollmentModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 shadow-md shadow-purple-200 transition">
                        <Key size={16} /> Enrollment Keys
                    </button>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-200 transition">
                        <Plus size={16} /> Add Student
                    </button>
                    <button onClick={() => setViewMode(viewMode === 'list' ? 'stats' : 'list')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition">
                        {viewMode === 'list' ? <PieChart size={16} /> : <List size={16} />} {viewMode === 'list' ? 'View Stats' : 'View List'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4"><Users size={24} /></div>
                    <p className="text-slate-600 text-sm mb-1">Total Population</p>
                    <p className="text-2xl font-bold text-slate-900">{studentsList.length}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-4"><TrendingUp size={24} /></div>
                    <p className="text-slate-600 text-sm mb-1">Active Students</p>
                    <p className="text-2xl font-bold text-slate-900">{studentsList.filter(s => s.status === 'Active').length}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4"><Activity size={24} /></div>
                    <p className="text-slate-600 text-sm mb-1">Support Requests</p>
                    <p className="text-2xl font-bold text-slate-900">-</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input type="text" placeholder="Search by Name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Filter:</label>
                    <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600 bg-white text-slate-700 max-w-[200px]">
                        <option value="All">All Courses</option>
                        {allCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    {(searchTerm || courseFilter !== 'All') && (
                        <button onClick={() => { setSearchTerm(''); setCourseFilter('All'); }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 font-medium">Reset</button>
                    )}
                </div>
            </div>

            {viewMode === 'stats' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                    <h3 className="font-bold text-lg text-slate-900 mb-4">Live Student Population Counter</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-3 font-bold text-slate-600">Course</th>
                                    <th className="p-3 font-bold text-slate-600 text-center">1st Year</th>
                                    <th className="p-3 font-bold text-slate-600 text-center">2nd Year</th>
                                    <th className="p-3 font-bold text-slate-600 text-center">3rd Year</th>
                                    <th className="p-3 font-bold text-slate-600 text-center">4th Year</th>
                                    <th className="p-3 font-bold text-slate-600 text-center bg-blue-50 text-blue-700">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allCourses.map(course => {
                                    const courseStudents = studentsList.filter(s => s.course === course.name && s.status === 'Active');
                                    const y1 = courseStudents.filter(s => s.year_level === '1st Year').length;
                                    const y2 = courseStudents.filter(s => s.year_level === '2nd Year').length;
                                    const y3 = courseStudents.filter(s => s.year_level === '3rd Year').length;
                                    const y4 = courseStudents.filter(s => s.year_level === '4th Year').length;
                                    const total = y1 + y2 + y3 + y4;
                                    return (
                                        <tr key={course.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-900">{course.name}</td>
                                            <td className="p-3 text-center text-slate-600">{y1}</td>
                                            <td className="p-3 text-center text-slate-600">{y2}</td>
                                            <td className="p-3 text-center text-slate-600">{y3}</td>
                                            <td className="p-3 text-center text-slate-600">{y4}</td>
                                            <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/30">{total}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                loading ? <div className="p-12 text-center text-slate-500">Loading students...</div> :
                    studentsList.length === 0 ? <div className="p-12 text-center text-slate-500">No students found.</div> :
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                    <tr>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>Student <ArrowUpDown size={12} className="inline ml-1" /></th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('student_id')}>ID <ArrowUpDown size={12} className="inline ml-1" /></th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('course')}>Course & Year <ArrowUpDown size={12} className="inline ml-1" /></th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>Status <ArrowUpDown size={12} className="inline ml-1" /></th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedStudents.map(student => (
                                        <tr key={student.id} onClick={() => openEditModal(student)} className="hover:bg-slate-50 cursor-pointer">
                                            <td className="px-6 py-4"><span className="font-bold text-slate-900">{student.first_name} {student.last_name}</span></td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{student.student_id}</td>
                                            <td className="px-6 py-4"><div>{student.course}</div><div className="text-xs text-slate-500">{student.year_level}</div></td>
                                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{student.status}</span></td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); openEditModal(student); }} className="text-blue-600 hover:text-blue-800 p-2"><Edit size={16} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); setShowDeleteModal(true); }} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* Pagination Controls */}
                            {filteredStudents.length > 0 && (
                                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                                    <span className="text-xs text-slate-500">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded border border-slate-300 bg-white text-xs disabled:opacity-50">Previous</button>
                                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded border border-slate-300 bg-white text-xs disabled:opacity-50">Next</button>
                                    </div>
                                </div>
                            )}
                        </div>
            )}

            {/* Add Student Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-lg">Add New Student</h3><button onClick={() => setShowModal(false)}><XCircle size={24} className="text-slate-400" /></button></div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold mb-1">First Name</label><input required name="firstName" value={studentForm.firstName} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                                <div><label className="block text-xs font-bold mb-1">Last Name</label><input required name="lastName" value={studentForm.lastName} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            </div>
                            <div><label className="block text-xs font-bold mb-1">Student ID</label><input required name="studentId" value={studentForm.studentId} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-bold mb-1">Course</label><select required name="course" value={studentForm.course} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Select...</option>{allCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold mb-1">Year Level</label><select name="year" value={studentForm.year} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm"><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select></div>
                                <div><label className="block text-xs font-bold mb-1">Status</label><select name="status" value={studentForm.status} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm"><option>Active</option><option>Inactive</option><option>Probation</option></select></div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{isSubmitting ? 'Saving...' : 'Save Student'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Enrollment Keys Modal */}
            {showEnrollmentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">Manage Enrollment Keys</h3>
                            <button onClick={() => setShowEnrollmentModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                        </div>
                        <div className="p-6">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-xs text-blue-800">
                                <p className="font-bold mb-1"><Info size={12} className="inline mr-1" /> How this works:</p>
                                <p>This list acts as a <strong>whitelist of valid IDs</strong>. Student profiles will only appear in the main list <strong>after</strong> the student successfully activates their account using one of these IDs.</p>
                            </div>

                            <div className="mb-6 border-b border-slate-100 pb-6">
                                <label className="block text-xs font-bold text-slate-700 mb-2">Option 1: Manual Entry</label>
                                <form onSubmit={handleGenerateKey} className="flex gap-2">
                                    <input required name="enrollmentId" className="w-1/3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600" placeholder="ID (2026-XXXX)" />
                                    <select required name="enrollmentCourse" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white">
                                        <option value="">Select Course</option>
                                        {allCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <button type="submit" className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition shadow-md"><Plus size={16} /></button>
                                </form>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-700">Option 2: Bulk Upload (CSV)</label>
                                    <button onClick={handleDownloadTemplate} className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                                        <Download size={12} /> Download Template
                                    </button>
                                </div>
                                <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition group cursor-pointer">
                                    <input type="file" accept=".csv,.txt" onChange={handleBulkUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className="group-hover:scale-110 transition-transform duration-200"><UploadCloud size={32} className="text-purple-600 mb-2 mx-auto" /></div>
                                    <p className="text-sm text-slate-700 font-medium">Click to upload CSV file</p>
                                    <p className="text-xs text-slate-400 mt-1">Format: Student ID, Course</p>
                                </div>
                            </div>

                            <div className="mb-3 mt-6">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Status</label>
                                <select value={enrollmentStatusFilter} onChange={e => setEnrollmentStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white"><option value="All">All Statuses</option><option value="Pending">Pending</option><option value="Activated">Activated</option></select>
                            </div>

                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <h4 className="font-bold text-sm text-slate-700 mb-3">Existing Keys ({enrollmentKeys.length})</h4>
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                    {enrollmentKeys.filter(key => enrollmentStatusFilter === 'All' || (key.status || 'Pending') === enrollmentStatusFilter).map(key => (
                                        <div key={key.student_id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100 text-xs">
                                            <div>
                                                <span className="font-mono font-bold text-slate-700">{key.student_id}</span>
                                                <span className="block text-slate-500 truncate max-w-[150px]" title={key.course}>{key.course}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded font-bold ${key.is_used ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{key.is_used ? 'Activated' : 'Pending'}</span>
                                                <button onClick={() => handleDeleteKey(key.student_id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Key">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {enrollmentKeys.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No keys generated yet.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function CareStaffDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Session guard — redirect to login if no session
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/care-staff');
        }
    }, [isAuthenticated, navigate]);

    // Data States
    // Removed stats state in favor of useMemo
    const [applications, setApplications] = useState([]);
    const [counselingReqs, setCounselingReqs] = useState([]);
    const [supportReqs, setSupportReqs] = useState([]);
    const [events, setEvents] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [students, setStudents] = useState([]);
    const [allCourses, setAllCourses] = useState([]);

    // Derived Stats (Performance Optimization: Removed extra re-render)
    const stats = React.useMemo(() => ({
        totalApplications: (applications?.length || 0),
        pending: (applications?.filter(a => a.status === 'Pending').length || 0),
        approved: (applications?.filter(a => a.status === 'Approved').length || 0),
        counseling: (counselingReqs?.filter(c => c.status === 'Pending' || c.status === 'Referred').length || 0),
        support: (supportReqs?.filter(s => s.status === 'Pending' || s.status === 'Forwarded to Dept').length || 0)
    }), [applications, counselingReqs, supportReqs]);

    // Modals
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleData, setScheduleData] = useState({ date: '', time: '', notes: '' });
    const [showEventModal, setShowEventModal] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', event_time: '', end_time: '', location: '', latitude: '', longitude: '', type: 'Event' });
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completionForm, setCompletionForm] = useState({ id: null, student_id: null, publicNotes: '', privateNotes: '' });
    const [toast, setToast] = useState(null);
    const [showResetModal, setShowResetModal] = useState(false);

    // Student Management State (Lifted from StudentPopulationPage)
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);

    // Scholarship State (New)
    const [scholarships, setScholarships] = useState([]);
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [showApplicantModal, setShowApplicantModal] = useState(false);
    const [selectedScholarship, setSelectedScholarship] = useState(null);
    const [scholarshipForm, setScholarshipForm] = useState({ title: '', description: '', requirements: '', deadline: '' });
    const [applicantsList, setApplicantsList] = useState([]);

    // Command Hub (FAB Panel)
    const [showCommandHub, setShowCommandHub] = useState(false);
    const [commandHubTab, setCommandHubTab] = useState('actions');
    const [staffNotes, setStaffNotes] = useState(() => {
        try { return JSON.parse(localStorage.getItem('care_staff_notes') || '[]'); } catch { return []; }
    });

    // Sub-tabs
    const [counselingTab, setCounselingTab] = useState('Submitted');
    const [supportTab, setSupportTab] = useState('queue');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [supportCategory, setSupportCategory] = useState('All');

    // Support Modal
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [selectedSupportReq, setSelectedSupportReq] = useState(null);
    const [supportForm, setSupportForm] = useState({ care_notes: '', resolution_notes: '' });
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Events Extras
    const [showAttendeesModal, setShowAttendeesModal] = useState(false);
    const [attendees, setAttendees] = useState([]);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackList, setFeedbackList] = useState([]);
    const [selectedEventTitle, setSelectedEventTitle] = useState('');
    const [attendeeFilter, setAttendeeFilter] = useState('All');
    const [yearLevelFilter, setYearLevelFilter] = useState('All');
    const [eventFilter, setEventFilter] = useState('All Items');
    const [editingEventId, setEditingEventId] = useState(null);

    useEffect(() => {
        // Authenticate (Simple check as per original)
        // In real app, we should have a proper login page for Care Staff too, 
        // but for now we assume they access this route directly or via existing methods.
        // We can check if a "care_session" exists or similar, but original code used 
        // local storage key 'norsu_care_data_v2' primarily for some settings.
        // We'll proceed with data fetching.
        fetchData();

        // Realtime Subscription
        const channel = supabase.channel('care_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchData(true))
            // Counseling requests handled by separate channel now
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, (payload) => {
                fetchData(true);
                if (payload.eventType === 'INSERT') {
                    showToastMessage(`New Support Request Received`, 'info');
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendance' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scholarships' }, () => fetchData(true))
            .subscribe();

        // Real-time feedback notifications (matches HTML App shell)
        const feedbackChannel = supabase.channel('care_staff_notifications')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'counseling_requests' }, (payload) => {
                if (payload.new.feedback && payload.new.status === 'Completed') {
                    setToast({ msg: `Counseling feedback received from ${payload.new.student_name}`, type: 'success' });
                    setTimeout(() => setToast(null), 6000);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_feedback' }, (payload) => {
                setToast({ msg: `New event rating received from ${payload.new.student_name}`, type: 'info' });
                setTimeout(() => setToast(null), 6000);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); supabase.removeChannel(feedbackChannel); };
    }, []);

    const fetchData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            // 1. Fetch Applications (NAT)
            const { data: apps } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
            setApplications(apps || []);

            // 2. Fetch Counseling - MOVED TO SEPARATE EFFECT
            // const { data: couns } = await supabase.from('counseling_requests').select('*').order('created_at', { ascending: false });
            // setCounselingReqs(couns || []);

            // 3. Fetch Support - MOVED TO SEPARATE EFFECT
            // const { data: supp } = await supabase.from('support_requests').select('*').order('created_at', { ascending: false });
            // setSupportReqs(supp || []);

            // 4. Events
            const { data: evts } = await supabase.from('events').select('*').order('created_at', { ascending: false });
            setEvents(evts || []);

            // 5. Students (For Analytics)
            const { data: studs } = await supabase.from('students').select('*').order('created_at', { ascending: false });
            setStudents(studs || []);

            // 6. Courses
            const { data: courses } = await supabase.from('courses').select('*').order('name', { ascending: true });
            setAllCourses(courses || []);

            // 7. Scholarships
            const { data: sch } = await supabase.from('scholarships').select('*').order('created_at', { ascending: false });
            setScholarships(sch || []);

            // Stats update removed (now handled by useMemo)
        } catch (err) {
            console.error(err);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // Auto-calculate stats effect removed (handled by useMemo)

    // SEPARATE COUNSELING FETCHING AND SUBSCRIPTION (LIKE DEPT DASHBOARD)
    useEffect(() => {
        const fetchCounseling = async () => {
            const { data: couns } = await supabase.from('counseling_requests').select('*').order('created_at', { ascending: false });
            if (couns) {
                // console.log("CareStaff: Independent Counseling Fetch:", couns.length);
                setCounselingReqs(couns);
            }
        };

        fetchCounseling();

        const channel = supabase.channel('care_counseling_isolated')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests' }, (payload) => {
                console.log("CareStaff: Isolated Counseling Update:", payload);
                fetchCounseling();
                if (payload.eventType === 'INSERT') {
                    showToastMessage(`New Counseling Request Received`, 'info');
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // SEPARATE SUPPORT FETCHING AND SUBSCRIPTION (Fixed: Real-time updates from Dept)
    useEffect(() => {
        const fetchSupport = async () => {
            const { data: supp } = await supabase.from('support_requests').select('*').order('created_at', { ascending: false });
            if (supp) {
                // console.log("CareStaff: Independent Support Fetch:", supp.length);
                setSupportReqs(supp);
            }
        };

        fetchSupport();

        const channel = supabase.channel('care_support_isolated')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, (payload) => {
                console.log("CareStaff: Isolated Support Update:", payload);
                fetchSupport();
                if (payload.eventType === 'INSERT') {
                    showToastMessage(`New Support Request Received`, 'info');
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
        return () => { supabase.removeChannel(channel); };
    }, []);

    // SEPARATE SCHOLARSHIP FETCHING AND SUBSCRIPTION
    useEffect(() => {
        const fetchScholarships = async () => {
            const { data: schols } = await supabase.from('scholarships').select('*').order('created_at', { ascending: false });
            if (schols) {
                setScholarships(schols);
            }
        };

        fetchScholarships();

        const channel = supabase.channel('care_scholarship_isolated')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scholarships' }, () => fetchScholarships())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const showToastMessage = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const logAudit = async (action, details) => {
        try {
            const { error } = await supabase.from('audit_logs').insert([{
                user_id: session?.id || 'unknown',
                user_name: session?.full_name || 'Care Staff',
                action,
                details
            }]);
            if (error) console.error('Audit log error:', error);
        } catch (err) {
            console.error('Audit log error:', err);
        }
    };

    const functions = {
        showToast: showToastMessage,
        logAudit,
        handleGetStarted: () => setActiveTab('dashboard'),
        handleDocs: () => window.open('https://norsu.edu.ph', '_blank'),
        handleLaunchModule: (module) => {
            if (module === 'Student Analytics') setActiveTab('analytics');
            if (module === 'Form Management') setActiveTab('forms');
            if (module === 'Event Broadcasting') setActiveTab('events');
            if (module === 'Scholarship Tracking') setActiveTab('scholarship');
        },
        handleOpenAnalytics: () => setActiveTab('analytics'),
        handleStatClick: (stat) => {
            if (stat === 'students') setActiveTab('population'); // Updated to point to new tab
            if (stat === 'cases') setActiveTab('support');
            if (stat === 'events') setActiveTab('events');
            if (stat === 'reports') setActiveTab('forms'); // Or wherever reports go
            if (stat === 'forms') setActiveTab('forms');
        },
        handleResetSystem: () => handleResetSystem(),
        setShowResetModal,
        handlePostAnnouncement: () => {
            setNewEvent({ title: '', description: '', event_date: new Date().toISOString().split('T')[0], type: 'Announcement' });
            setShowEventModal(true);
        },
        handleExport: () => {
            downloadCSV();
        },
        handleViewAllActivity: () => setActiveTab('audit'), // Or specific activity view
        handleQuickAction: (action) => {
            if (action === 'Schedule Wellness Check') setActiveTab('counseling');
            if (action === 'Send Announcement') functions.handlePostAnnouncement();
            if (action === 'View Reports') setActiveTab('analytics');
        }
    };

    const handleAppAction = async (id, status, notes = '') => {
        try {
            await supabase.from('applications').update({ status, notes }).eq('id', id);

            // Notify Student
            const app = applications.find(a => a.id === id);
            if (app) {
                await supabase.from('notifications').insert([{
                    student_id: app.student_id, // Assuming student_id maps nicely
                    message: `Your NAT Application status has been updated to: ${status}`
                }]);
            }

            showToastMessage(`Application ${status}`, 'success');
            setShowApplicationModal(false);
        } catch (err) {
            showToastMessage(err.message, 'error');
        }
    };

    const handleDeleteApplication = async (id) => {
        if (!window.confirm("Are you sure you want to PERMANENTLY delete this application? This action cannot be undone.")) return;

        try {
            const { error } = await supabase.from('applications').delete().eq('id', id);
            if (error) throw error;

            showToastMessage("Application deleted permanently.", 'success');
            setShowApplicationModal(false);
            // State update happens via realtime subscription or we can force it:
            setApplications(prev => prev.filter(app => app.id !== id));
        } catch (err) {
            showToastMessage("Failed to delete: " + err.message, 'error');
        }
    };

    const handleViewProfile = async (studentId) => {
        if (!studentId) {
            showToastMessage("No Student ID available for this request.", 'error');
            return;
        }

        // 1. Try to find in loaded list
        const student = students.find(s => s.student_id === studentId || s.id === studentId);
        if (student) {
            openEditModal(student);
        } else {
            // 2. Fetch if not found
            try {
                const { data, error } = await supabase.from('students').select('*').eq('student_id', studentId).single();
                if (error) throw error;
                if (data) openEditModal(data);
                else showToastMessage("Student profile not found.", 'info');
            } catch (err) {
                console.error("Profile fetch error:", err);
                showToastMessage("Could not load student profile.", 'error');
            }
        }
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedApp) return;

        try {
            console.log("CareStaffDashboard: Scheduling request...", selectedApp.id, scheduleData);
            // This is for Counseling Scheduling usually
            const { error } = await supabase.from('counseling_requests').update({
                status: 'Scheduled',
                scheduled_date: `${scheduleData.date} ${scheduleData.time}`,
                resolution_notes: scheduleData.notes
            }).eq('id', selectedApp.id);

            if (error) throw error;

            await supabase.from('notifications').insert([{
                student_id: selectedApp.student_id,
                message: `Your counseling session is scheduled for ${scheduleData.date} at ${scheduleData.time}.`
            }]);

            showToastMessage('Session Scheduled Successfully');
            setShowScheduleModal(false);
            setScheduleData({ date: '', time: '', notes: '' });

            // Force refresh to update UI immediately
            console.log("CareStaffDashboard: Refreshing data after schedule...");
            await fetchData();
        } catch (err) {
            console.error("CareStaffDashboard: Schedule error:", err);
            showToastMessage(err.message, 'error');
        }
    };

    const handleCompleteSession = async (e) => {
        e.preventDefault();
        try {
            await supabase.from('counseling_requests').update({
                status: 'Completed',
                resolution_notes: completionForm.publicNotes,
                confidential_notes: completionForm.privateNotes
            }).eq('id', completionForm.id);

            await supabase.from('notifications').insert([{
                student_id: completionForm.student_id,
                message: `Your counseling session has been marked as Completed. You can now view the advice.`
            }]);

            showToastMessage('Session marked as complete.');
            setShowCompleteModal(false);
            fetchData();
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const handleForwardSupport = async () => {
        if (!supportForm.care_notes) { showToastMessage("Please add notes for Dept Head.", 'error'); return; }
        try {
            await supabase.from('support_requests').update({ status: 'Forwarded to Dept', care_notes: supportForm.care_notes }).eq('id', selectedSupportReq.id);
            showToastMessage("Request forwarded to Department Head.");
            setShowSupportModal(false);
            fetchData();
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const handleFinalizeSupport = async () => {
        if (!supportForm.resolution_notes) { showToastMessage("Please add resolution notes.", 'error'); return; }
        try {
            await supabase.from('support_requests').update({ status: 'Completed', resolution_notes: supportForm.resolution_notes }).eq('id', selectedSupportReq.id);
            await supabase.from('notifications').insert([{ student_id: selectedSupportReq.student_id, message: `Your support request regarding ${selectedSupportReq.support_type} has been updated.` }]);
            showToastMessage("Request completed and student notified.");
            setShowSupportModal(false);
            fetchData();
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const handlePrintSupport = () => {
        const doc = new jsPDF();
        const req = selectedSupportReq;

        // Header
        doc.setFontSize(18); doc.setTextColor(0, 0, 0); doc.text("Support Application Form", 105, 20, null, null, "center");
        doc.setFontSize(10); doc.setTextColor(100, 100, 100); doc.text(`Reference ID: ${req.id}`, 105, 26, null, null, "center");
        doc.setLineWidth(0.5); doc.line(20, 30, 190, 30);

        let y = 40;

        // Student Info
        doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text("Student Information", 20, y);
        y += 8;
        doc.setFontSize(10);
        doc.text(`Name: ${req.student_name}`, 20, y); doc.text(`Date Filed: ${new Date(req.created_at).toLocaleDateString()}`, 110, y);
        y += 6;
        doc.text(`Student ID: ${req.student_id}`, 20, y);
        y += 10;

        // Section A
        doc.setFontSize(12); doc.text("A. Your Studies", 20, y);
        y += 8;
        doc.setFontSize(10);
        doc.text("See student records for course priority details.", 20, y);
        y += 10;

        // Section B
        doc.setFontSize(12); doc.text("B. Particulars of Need", 20, y);
        y += 8;
        doc.setFontSize(10); doc.text(`Categories: ${req.support_type || 'None'}`, 20, y);
        y += 8;
        doc.text("Description of Need:", 20, y);
        y += 6;

        const splitDesc = doc.splitTextToSize(req.description, 170);
        doc.text(splitDesc, 20, y);
        y += (splitDesc.length * 5) + 10;

        // Staff Actions
        doc.setDrawColor(200, 200, 200); doc.rect(20, y, 170, 40);
        doc.setFontSize(11); doc.text("Staff Action & Resolution", 25, y + 8);
        doc.setFontSize(10);
        doc.text(`Status: ${req.status}`, 25, y + 16);
        doc.text(`Care Staff Notes: ${req.care_notes || 'N/A'}`, 25, y + 24);
        doc.text(`Resolution: ${req.resolution_notes || 'N/A'}`, 25, y + 32);

        doc.save(`support-req-${req.id}.pdf`);
    };

    const openSupportModal = async (req) => {
        setSelectedSupportReq(req);
        setSupportForm({ care_notes: req.care_notes || '', resolution_notes: req.resolution_notes || '' });
        setSelectedStudent(null);
        // Fetch student profile
        if (req.student_id) {
            const { data } = await supabase.from('students').select('*').eq('student_id', req.student_id).maybeSingle();
            setSelectedStudent(data);
        }
        setShowSupportModal(true);
    };

    const renderDetailedDescription = (desc) => {
        if (!desc) return <p className="text-sm text-gray-500 italic">No description provided.</p>;
        const q1Index = desc.indexOf('[Q1 Description]:');
        if (q1Index === -1) return <p className="text-sm text-gray-800 whitespace-pre-wrap">{desc}</p>;

        const getPart = (key, nextKey) => {
            const start = desc.indexOf(key);
            if (start === -1) return null;
            let end = nextKey ? desc.indexOf(nextKey) : -1;
            if (end === -1) end = desc.length;
            return desc.substring(start + key.length, end).trim();
        };

        const q1 = getPart('[Q1 Description]:', '[Q2 Previous Support]:');
        const q2 = getPart('[Q2 Previous Support]:', '[Q3 Required Support]:');
        const q3 = getPart('[Q3 Required Support]:', '[Q4 Other Needs]:');
        const q4 = getPart('[Q4 Other Needs]:', null);

        return (
            <div className="space-y-4 mt-3">
                {q1 && <div><p className="text-xs font-bold text-gray-600 mb-1">1. Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q1}</p></div>}
                {q2 && <div><p className="text-xs font-bold text-gray-600 mb-1">2. What kind of support did you receive at your previous school?</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q2}</p></div>}
                {q3 && <div><p className="text-xs font-bold text-gray-600 mb-1">3. What support or assistance do you require from NORSU to fully participate in campus activities?</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q3}</p></div>}
                {q4 && <div><p className="text-xs font-bold text-gray-600 mb-1">4. Indicate and elaborate on any other special needs or assistance that may be required:</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q4}</p></div>}
            </div>
        );
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            showToastMessage("Geolocation is not supported.", 'error');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewEvent(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                showToastMessage("Location retrieved!");
            },
            (err) => showToastMessage("Unable to retrieve location: " + err.message, 'error')
        );
    };

    const handleViewAttendees = async (event) => {
        setSelectedEventTitle(event.title);
        try {
            const { data, error } = await supabase.from('event_attendance').select('*').eq('event_id', event.id).order('time_in', { ascending: false });
            if (error) throw error;
            // Enrich with year_level from students table
            let enriched = data || [];
            if (enriched.length > 0) {
                const studentIds = [...new Set(enriched.map(a => a.student_id).filter(Boolean))];
                if (studentIds.length > 0) {
                    const { data: studs } = await supabase.from('students').select('student_id, year_level').in('student_id', studentIds);
                    const ylMap = {};
                    (studs || []).forEach(s => { ylMap[s.student_id] = s.year_level; });
                    enriched = enriched.map(a => ({ ...a, year_level: ylMap[a.student_id] || '' }));
                }
            }
            setAttendees(enriched);
            setShowAttendeesModal(true);
            setYearLevelFilter('All');
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const handleViewFeedback = async (event) => {
        setSelectedEventTitle(event.title);
        try {
            const { data, error } = await supabase.from('event_feedback').select('*').eq('event_id', event.id).order('submitted_at', { ascending: false });
            if (error) throw error;
            setFeedbackList(data || []);
            setShowFeedbackModal(true);
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const processSupportRequest = async (req, action) => {
        try {
            let newStatus = action === 'Approved' ? 'Forwarded to Dept' : 'Rejected';
            // If already forwarded, maybe we are completing it?
            // "Forwarded to Dept" -> Dept Heads see it.
            // If we want to "Complete" it after Dept approves?
            // For now, let's assume Care Staff forwards to Dept.

            await supabase.from('support_requests').update({ status: newStatus }).eq('id', req.id);
            showToastMessage(`Request ${newStatus}`);
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const createEvent = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: newEvent.title,
                type: newEvent.type,
                description: newEvent.description,
                location: newEvent.type === 'Event' ? newEvent.location : 'Online/General',
                event_date: newEvent.event_date,
                event_time: newEvent.type === 'Event' ? (newEvent.event_time || null) : null,
                end_time: newEvent.type === 'Event' ? (newEvent.end_time || null) : null,
                latitude: newEvent.latitude || null,
                longitude: newEvent.longitude || null
            };

            if (editingEventId) {
                await supabase.from('events').update(payload).eq('id', editingEventId);
                showToastMessage('Item updated successfully!');
            } else {
                await supabase.from('events').insert([payload]);
                showToastMessage('Item created successfully!');
            }
            setShowEventModal(false);
            setEditingEventId(null);
            setNewEvent({ title: '', description: '', event_date: '', event_time: '', end_time: '', location: '', latitude: '', longitude: '', type: 'Event' });
            fetchData();
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const handleEditEvent = (item) => {
        setNewEvent({
            title: item.title,
            type: item.type,
            description: item.description,
            location: item.location || '',
            event_date: item.event_date || '',
            event_time: item.event_time || '',
            end_time: item.end_time || '',
            latitude: item.latitude || '',
            longitude: item.longitude || ''
        });
        setEditingEventId(item.id);
        setShowEventModal(true);
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await supabase.from('events').delete().eq('id', id);
            showToastMessage('Item deleted.');
            fetchData();
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const openEditModal = (student) => {
        setEditForm({ ...student });
        setShowEditModal(true);
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('students')
                .update({
                    first_name: editForm.first_name,
                    last_name: editForm.last_name,
                    middle_name: editForm.middle_name,
                    suffix: editForm.suffix,
                    dob: editForm.dob,
                    place_of_birth: editForm.place_of_birth,
                    sex: editForm.sex,
                    gender_identity: editForm.gender_identity,
                    civil_status: editForm.civil_status,
                    nationality: editForm.nationality,
                    street: editForm.street,
                    city: editForm.city,
                    province: editForm.province,
                    zip_code: editForm.zip_code,
                    mobile: editForm.mobile,
                    email: editForm.email,
                    facebook_url: editForm.facebook_url,
                    course: editForm.course,
                    year_level: editForm.year_level,
                    status: editForm.status
                })
                .eq('id', editForm.id);

            if (error) throw error;
            showToastMessage("Student updated successfully!");
            setShowEditModal(false);
            fetchData();
        } catch (error) {
            showToastMessage("Error updating student: " + error.message, 'error');
        }
    };

    const confirmDeleteStudent = async () => {
        if (!studentToDelete) return;
        try {
            // 1. Delete associated enrollment key
            const { error: keyError } = await supabase.from('enrolled_students').delete().eq('student_id', studentToDelete.student_id);
            if (keyError) console.warn("Could not delete enrollment key, or none existed:", keyError.message);

            // 2. Delete student profile
            const { error } = await supabase.from('students').delete().eq('id', studentToDelete.id);
            if (error) throw error;

            showToastMessage("Student and enrollment key deleted successfully.");
            setShowDeleteModal(false);
            setStudentToDelete(null);
            fetchData();
        } catch (error) {
            showToastMessage("Error deleting student: " + error.message, 'error');
        }
    };

    const downloadCSV = () => {
        // Simple CSV Export for Applications
        const headers = ["ID", "Name", "Email", "Course", "Status"];
        const rows = applications.map(a => [a.id, `${a.first_name} ${a.last_name}`, a.email, a.priority_course, a.status]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "applications_export.csv");
        document.body.appendChild(link);
        link.click();
    };

    // Scholarship Handlers
    const handleAddScholarship = async () => {
        if (!scholarshipForm.title || !scholarshipForm.deadline) {
            showToastMessage("Title and Deadline are required.", "error"); return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('scholarships').insert([{
                ...scholarshipForm
            }]);
            if (error) throw error;
            showToastMessage("Scholarship added successfully!");
            setShowScholarshipModal(false);
            setScholarshipForm({ title: '', description: '', requirements: '', deadline: '' });
            fetchData();
        } catch (err) {
            showToastMessage(err.message, "error");
        } finally { setLoading(false); }
    };

    const handleViewApplicants = async (scholarship) => {
        setSelectedScholarship(scholarship);
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('scholarship_applications')
                .select('*')
                .eq('scholarship_id', scholarship.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplicantsList(data || []);
            setShowApplicantModal(true);
        } catch (err) {
            showToastMessage("Failed to fetch applicants: " + err.message, "error");
        } finally { setLoading(false); }
    };

    const handleExportApplicants = () => {
        if (!applicantsList.length) { showToastMessage("No applicants to export.", "error"); return; }
        const headers = ["Student Name", "Course", "Year", "Contact", "Email", "Date Applied"];
        const rows = applicantsList.map(a => [
            a.student_name,
            a.course,
            a.year_level,
            a.contact_number,
            a.email,
            new Date(a.created_at).toLocaleDateString()
        ]);
        exportToExcel(headers, rows, `${selectedScholarship.title}_Applicants`);
    };

    const handleDeleteScholarship = async (id) => {
        if (!window.confirm("Are you sure you want to delete this scholarship?")) return;
        try {
            const { error } = await supabase.from('scholarships').delete().eq('id', id);
            if (error) throw error;
            showToastMessage("Scholarship deleted.");
            fetchData();
        } catch (err) { showToastMessage(err.message, "error"); }
    };

    // System Reset (matches HTML handleResetSystem exactly — wipes 14+ tables)
    const handleResetSystem = async () => {
        setShowResetModal(false);
        try {
            const standardTables = [
                'answers', 'submissions', 'notifications', 'office_visits', 'support_requests',
                'counseling_requests', 'event_feedback', 'event_attendance', 'applications',
                'scholarships', 'events', 'audit_logs', 'needs_assessments', 'students'
            ];
            for (const table of standardTables) {
                await supabase.from(table).delete().neq('id', 0);
            }
            // Delete from tables with specific PKs
            await supabase.from('enrolled_students').delete().neq('student_id', '0');

            showToastMessage('System data has been successfully reset.');
            window.location.reload();
        } catch (err) {
            console.error('Reset error:', err);
            showToastMessage('Reset completed with some warnings. Check console.', 'error');
        }
    };

    // Chart Data
    const appStatusData = {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [{
            data: [stats.pending, stats.approved, applications.filter(a => a.status === 'Rejected').length],
            backgroundColor: ['#FBBF24', '#34D399', '#F87171'],
            borderWidth: 0
        }]
    };

    const sharedState = {
        studentsList: students,
        allCourses: allCourses,
        fetchStudents: fetchData,
        showEditModal, setShowEditModal,
        editForm, setEditForm,
        showDeleteModal, setShowDeleteModal,
        studentToDelete, setStudentToDelete,
        openEditModal,
        handleUpdateStudent,
        confirmDeleteStudent
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 text-gray-800 font-sans overflow-hidden">
            {/* Mobile Overlay */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden animate-backdrop" onClick={() => setSidebarOpen(false)} />}

            {/* Premium Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-gradient-sidebar transform transition-all duration-500 ease-out lg:static lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0 shadow-2xl shadow-purple-900/30' : '-translate-x-full'}`}>
                {/* Logo Area */}
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-purple rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-purple-600/30 text-sm">CS</div>
                        <div>
                            <h1 className="font-bold text-white text-lg tracking-tight">Care Staff</h1>
                            <p className="text-purple-300/70 text-xs font-medium">NORSU Portal</p>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-purple-300/60 hover:text-white transition-colors"><XCircle size={20} /></button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {[
                        { tab: 'home', icon: <LayoutDashboard size={18} />, label: 'Home' },
                        { tab: 'dashboard', icon: <Activity size={18} />, label: 'Dashboard' },
                    ].map(item => (
                        <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === item.tab ? 'nav-item-active text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-purple-400/50 uppercase tracking-[0.15em] mb-3">Student Management</p>
                        {[
                            { tab: 'population', icon: <Users size={18} />, label: 'Student Population' },
                            { tab: 'analytics', icon: <BarChart2 size={18} />, label: 'Student Analytics' },
                        ].map(item => (
                            <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === item.tab ? 'nav-item-active text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-purple-400/50 uppercase tracking-[0.15em] mb-3">Services</p>
                        {[
                            { tab: 'nat', icon: <FileText size={18} />, label: 'NAT Management' },
                            { tab: 'counseling', icon: <Users size={18} />, label: 'Counseling' },
                            { tab: 'support', icon: <CheckCircle size={18} />, label: 'Support Requests' },
                            { tab: 'events', icon: <Calendar size={18} />, label: 'Events' },
                            { tab: 'scholarship', icon: <Award size={18} />, label: 'Scholarships' },
                        ].map(item => (
                            <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === item.tab ? 'nav-item-active text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-purple-400/50 uppercase tracking-[0.15em] mb-3">Administration</p>
                        {[
                            { tab: 'forms', icon: <ClipboardList size={18} />, label: 'Forms' },
                            { tab: 'feedback', icon: <Star size={18} />, label: 'Feedback' },
                            { tab: 'audit', icon: <Shield size={18} />, label: 'Audit Logs' },
                            { tab: 'logbook', icon: <BookOpen size={18} />, label: 'Office Logbook' },
                        ].map(item => (
                            <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === item.tab ? 'nav-item-active text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-white/5">
                    <button onClick={() => { logout(); navigate('/care-staff'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Premium Header */}
                <header className="h-16 glass gradient-border flex items-center justify-between px-6 lg:px-10 relative z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"><Menu /></button>
                        <h2 className="text-xl font-bold gradient-text capitalize">{activeTab}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-gray-500 hover:text-purple-600 hover:shadow-md transition-all relative border border-gray-100">
                            <Bell size={20} />
                            {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse-glow" />}
                        </button>
                    </div>
                </header>

                <div key={activeTab} className="flex-1 overflow-y-auto p-6 lg:p-10 page-transition">
                    {activeTab === 'home' && <HomePage functions={functions} />}
                    {activeTab === 'population' && <StudentPopulationPage functions={functions} sharedState={sharedState} />}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
                                {[
                                    { label: 'Active Students', value: students.length, icon: <GraduationCap size={20} />, gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50' },
                                    { label: 'Counseling', value: stats.counseling, icon: <Users size={20} />, gradient: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50' },
                                    { label: 'Support Reqs', value: stats.support, icon: <CheckCircle size={20} />, gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
                                    { label: 'Events', value: events.length, icon: <Calendar size={20} />, gradient: 'from-purple-400 to-violet-500', bg: 'bg-purple-50' },
                                ].map((card, idx) => (
                                    <div key={idx} className="card-hover bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100/80 flex flex-col justify-between h-32 animate-fade-in-up">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 font-medium text-sm">{card.label}</span>
                                            <div className={`p-2.5 bg-gradient-to-br ${card.gradient} rounded-xl text-white shadow-lg`}>{card.icon}</div>
                                        </div>
                                        <h3 className="text-3xl font-extrabold text-gray-900">{card.value}</h3>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Recent Activity Feed */}
                                <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Activity size={18} className="text-purple-500" /> Recent Activity</h3>
                                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                                        {(() => {
                                            // Build unified activity feed from all system data
                                            const activities = [
                                                ...events.map(e => ({
                                                    id: `evt-${e.id}`,
                                                    type: e.type === 'Announcement' ? 'Announcement' : 'Event',
                                                    icon: e.type === 'Announcement' ? <Bell size={16} /> : <Calendar size={16} />,
                                                    color: e.type === 'Announcement' ? 'from-purple-400 to-indigo-500' : 'from-blue-400 to-indigo-500',
                                                    title: e.type === 'Announcement' ? 'Announcement posted' : 'Event scheduled',
                                                    detail: e.title,
                                                    date: new Date(e.created_at)
                                                })),
                                                ...counselingReqs.filter(c => c.status === 'Scheduled' || c.status === 'Completed').map(c => ({
                                                    id: `coun-${c.id}`,
                                                    type: 'Counseling',
                                                    icon: <Users size={16} />,
                                                    color: c.status === 'Completed' ? 'from-green-400 to-emerald-500' : 'from-blue-400 to-cyan-500',
                                                    title: c.status === 'Completed' ? 'Counseling completed' : 'Counseling scheduled',
                                                    detail: c.student_name,
                                                    date: new Date(c.updated_at || c.created_at)
                                                })),
                                                ...supportReqs.slice(0, 10).map(s => ({
                                                    id: `sup-${s.id}`,
                                                    type: 'Support',
                                                    icon: <CheckCircle size={16} />,
                                                    color: s.status === 'Completed' ? 'from-green-400 to-emerald-500' : s.status === 'Forwarded to Dept' ? 'from-orange-400 to-amber-500' : 'from-amber-400 to-yellow-500',
                                                    title: s.status === 'Completed' ? 'Support resolved' : s.status === 'Forwarded to Dept' ? 'Support forwarded to dept' : 'Support request received',
                                                    detail: s.student_name,
                                                    date: new Date(s.updated_at || s.created_at)
                                                })),
                                                ...applications.filter(a => a.status !== 'Pending').slice(0, 5).map(a => ({
                                                    id: `app-${a.id}`,
                                                    type: 'Application',
                                                    icon: <ClipboardList size={16} />,
                                                    color: a.status === 'Approved' ? 'from-green-400 to-emerald-500' : 'from-red-400 to-rose-500',
                                                    title: `Application ${a.status.toLowerCase()}`,
                                                    detail: `${a.first_name} ${a.last_name}`,
                                                    date: new Date(a.updated_at || a.created_at)
                                                }))
                                            ].sort((a, b) => b.date - a.date).slice(0, 10);

                                            if (activities.length === 0) {
                                                return <p className="text-center text-gray-400 py-8 text-sm">No recent activity yet.</p>;
                                            }

                                            return activities.map((act, idx) => (
                                                <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-colors group animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${act.color} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                                                        {act.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800">{act.title}</p>
                                                        <p className="text-xs text-gray-500 truncate">{act.detail}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${act.type === 'Event' ? 'bg-blue-50 text-blue-600' :
                                                            act.type === 'Announcement' ? 'bg-purple-50 text-purple-600' :
                                                                act.type === 'Counseling' ? 'bg-teal-50 text-teal-600' :
                                                                    act.type === 'Support' ? 'bg-amber-50 text-amber-600' :
                                                                        'bg-gray-50 text-gray-600'
                                                            }`}>{act.type}</span>
                                                        <p className="text-[10px] text-gray-400 mt-1">{act.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col card-hover">
                                    <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2"><Rocket size={18} className="text-purple-500" /> Quick Actions</h3>
                                    <div className="space-y-3 flex-1">
                                        <button
                                            onClick={() => { setEditingEventId(null); setNewEvent({ title: '', description: '', event_date: '', event_time: '', end_time: '', location: '', latitude: '', longitude: '', type: 'Event' }); setShowEventModal(true); }}
                                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200 group text-left"
                                        >
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200/50 group-hover:scale-105 transition-transform">
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Schedule Event</p>
                                                <p className="text-xs text-gray-400">Create a new campus event</p>
                                            </div>
                                            <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                                        </button>

                                        <button
                                            onClick={() => { setEditingEventId(null); setNewEvent({ title: '', description: '', event_date: '', event_time: '', end_time: '', location: '', latitude: '', longitude: '', type: 'Announcement' }); setShowEventModal(true); }}
                                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200 group text-left"
                                        >
                                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-purple-200/50 group-hover:scale-105 transition-transform">
                                                <Send size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Send Announcement</p>
                                                <p className="text-xs text-gray-400">Broadcast an official notice</p>
                                            </div>
                                            <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                                        </button>

                                        <button
                                            onClick={() => setActiveTab('analytics')}
                                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200 group text-left"
                                        >
                                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-200/50 group-hover:scale-105 transition-transform">
                                                <BarChart2 size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">View Reports</p>
                                                <p className="text-xs text-gray-400">Student analytics & insights</p>
                                            </div>
                                            <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                                        </button>
                                    </div>

                                    {/* Mini summary at bottom */}
                                    <div className="mt-5 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400">Today</span>
                                            <span className="font-bold text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && <StudentAnalyticsPage showToast={showToastMessage} />}
                    {activeTab === 'nat' && <NATManagementPage showToast={showToastMessage} />}


                    {activeTab === 'applications' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                <h3 className="font-bold text-gray-900 text-lg">NAT Applications</h3>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:flex-none"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full md:w-64" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                                    <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition"><Download size={16} /> Export</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500"><tr><th className="p-4">Applicant</th><th className="p-4">Contact</th><th className="p-4">Preference</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {applications.filter(a => `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())).map(app => (
                                            <tr key={app.id} className="hover:bg-gray-50">
                                                <td className="p-4"><p className="font-bold text-gray-900">{app.first_name} {app.last_name}</p><p className="text-xs text-gray-500">ID: {app.id.substring(0, 8)}</p></td>
                                                <td className="p-4"><p>{app.email}</p><p className="text-xs text-gray-500">{app.mobile}</p></td>
                                                <td className="p-4 text-gray-600">{app.priority_course}</td>
                                                <td className="p-4"><StatusBadge status={app.status} /></td>
                                                <td className="p-4 text-right"><button onClick={() => { setSelectedApp(app); setShowApplicationModal(true); }} className="text-purple-600 font-bold hover:underline">Manage</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'counseling' && (
                        <div>
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold text-gray-900">Counseling Management</h1>
                                <p className="text-gray-500 text-sm mt-1">Review applications, manage referrals, and schedule sessions</p>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
                                {[
                                    { label: 'Total Requests', value: counselingReqs.length, icon: <FileText size={20} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                                    { label: 'Awaiting Dept', value: counselingReqs.filter(r => r.status === 'Submitted').length, icon: <Clock size={20} />, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                                    { label: 'Referred', value: counselingReqs.filter(r => r.status === 'Referred').length, icon: <Send size={20} />, color: 'text-purple-500', bg: 'bg-purple-50' },
                                    { label: 'Scheduled', value: counselingReqs.filter(r => r.status === 'Scheduled').length, icon: <Calendar size={20} />, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                                    { label: 'Completed', value: counselingReqs.filter(r => r.status === 'Completed').length, icon: <CheckCircle size={20} />, color: 'text-green-500', bg: 'bg-green-50' },
                                ].map((stat, idx) => (
                                    <div key={idx} className="card-hover bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100/80 shadow-sm animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                                        <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3 ${stat.color} shadow-sm`}>{stat.icon}</div>
                                        <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                                        <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* 5-Tab Pill Bar */}
                            <div className="bg-gray-100/80 backdrop-blur-sm rounded-full p-1 flex items-center justify-between mb-8 overflow-x-auto max-w-4xl border border-gray-200/50">
                                {[
                                    { id: 'Referred', label: `New Referrals (${counselingReqs.filter(r => r.status === 'Referred').length})` },
                                    { id: 'Submitted', label: `Awaiting Dept (${counselingReqs.filter(r => r.status === 'Submitted').length})` },
                                    { id: 'Scheduled', label: `Scheduled (${counselingReqs.filter(r => r.status === 'Scheduled').length})` },
                                    { id: 'Completed', label: `Completed (${counselingReqs.filter(r => r.status === 'Completed').length})` },
                                    { id: 'Calendar', label: 'Calendar View' },
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => setCounselingTab(tab.id)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${counselingTab === tab.id ? 'bg-white text-purple-700 shadow-md shadow-purple-100' : 'text-gray-600 hover:text-purple-600 hover:bg-white/50'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {counselingTab === 'Calendar' ? (
                                <CalendarView requests={counselingReqs} />
                            ) : loading ? (
                                <div className="text-center py-8 text-gray-500">Loading requests...</div>
                            ) : counselingTab === 'Completed' ? (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                                            <tr>
                                                <th className="px-6 py-4">Student</th>
                                                <th className="px-6 py-4">Reason / Type</th>
                                                <th className="px-6 py-4">Date Resolved</th>
                                                <th className="px-6 py-4">Resolution</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {counselingReqs.filter(r => r.status === 'Completed').length === 0 ? (
                                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No completed requests found.</td></tr>
                                            ) : (
                                                counselingReqs.filter(r => r.status === 'Completed').map(req => (
                                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-gray-900">{req.student_name}</div>
                                                            <div className="text-xs text-gray-400 font-mono">{req.student_id || 'No ID'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold mb-1 inline-block ${(req.request_type || req.type) === 'Academic' ? 'bg-blue-100 text-blue-700' :
                                                                (req.request_type || req.type) === 'Personal' ? 'bg-purple-100 text-purple-700' :
                                                                    (req.request_type || req.type) === 'Career' ? 'bg-green-100 text-green-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                                }`}>{req.request_type || req.type}</span>
                                                            <div className="text-gray-500 text-xs">{req.reason}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600">
                                                            {new Date(req.updated_at || req.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="max-w-xs text-gray-600 text-xs line-clamp-2" title={req.resolution_notes}>{req.resolution_notes || 'No notes recorded.'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button onClick={() => handleViewProfile(req.student_id)} className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg transition-colors mr-2">
                                                                <User size={14} className="inline mr-1" /> Profile
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : counselingReqs.filter(r => r.status === counselingTab).length === 0 ? (
                                <div className="text-center py-8 text-gray-400">No requests in this category.</div>
                            ) : (
                                <div className="space-y-4">
                                    {counselingReqs.filter(r => r.status === counselingTab).map(req => (
                                        <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${req.status === 'Referred' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    <Users size={22} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-bold text-gray-900">{req.student_name}</h3>
                                                            <p className="text-sm text-gray-500">{req.request_type} • {new Date(req.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <button onClick={() => handleViewProfile(req.student_id)} className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                                            <User size={14} /> View Profile
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                                                <p className="text-sm text-gray-700"><strong>Note:</strong> {req.description || 'No details provided.'}</p>
                                                {req.resolution_notes && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <p className="text-xs font-bold text-gray-500 uppercase">Resolution Notes</p>
                                                        <p className="text-sm text-gray-600 mt-1">{req.resolution_notes}</p>
                                                    </div>
                                                )}
                                                {req.confidential_notes && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200 bg-red-50/50 -mx-4 px-4 pb-2">
                                                        <p className="text-xs font-bold text-red-500 uppercase flex items-center gap-1"><Lock size={10} /> Confidential Notes</p>
                                                        <p className="text-sm text-gray-600 mt-1 italic">{req.confidential_notes}</p>
                                                    </div>
                                                )}
                                                {req.status === 'Completed' && (req.feedback || req.rating) && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200 bg-yellow-50/50 -mx-4 px-4 pb-2">
                                                        <p className="text-xs font-bold text-yellow-600 uppercase flex items-center gap-1"><Star size={10} /> Student Feedback</p>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <Star key={star} size={14} className={star <= req.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
                                                            ))}
                                                        </div>
                                                        {req.feedback && <p className="text-sm text-gray-600 mt-1">"{req.feedback}"</p>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                {req.scheduled_date && <div className="text-xs text-gray-500 font-medium flex items-center gap-1"><Calendar size={14} className="text-indigo-500" /> Scheduled for {new Date(req.scheduled_date).toLocaleString()}</div>}
                                                <div className="flex gap-2 ml-auto">
                                                    {(req.status === 'Referred' || req.status === 'Pending') && (
                                                        <button onClick={() => { setSelectedApp(req); setShowScheduleModal(true); }} className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition flex items-center gap-2">
                                                            <Calendar size={14} /> Schedule
                                                        </button>
                                                    )}
                                                    {req.status === 'Scheduled' && (
                                                        <button onClick={() => { setCompletionForm({ ...completionForm, id: req.id, student_id: req.student_id }); setShowCompleteModal(true); }} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                                                            <CheckCircle size={14} /> Mark as Complete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div>
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-1">
                                    <ClipboardList size={24} className="text-purple-600" />
                                    <h1 className="text-2xl font-bold text-gray-900">Additional Support Management</h1>
                                </div>
                                <p className="text-gray-500 text-sm">Manage and respond to student support requests across all categories</p>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: 'New Requests', value: supportReqs.filter(r => r.status === 'Submitted').length, icon: <FileText size={20} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                                    { label: 'With Dept Head', value: supportReqs.filter(r => r.status === 'Forwarded to Dept').length, icon: <Send size={20} />, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                                    { label: 'Action Needed', value: supportReqs.filter(r => r.status === 'Approved' || r.status === 'Rejected').length, icon: <AlertTriangle size={20} />, color: 'text-orange-500', bg: 'bg-orange-50' },
                                    { label: 'Completed', value: supportReqs.filter(r => r.status === 'Completed').length, icon: <CheckCircle size={20} />, color: 'text-green-500', bg: 'bg-green-50' },
                                ].map((stat, idx) => (
                                    <div key={idx} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                                        <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3 ${stat.color}`}>{stat.icon}</div>
                                        <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Tabs */}
                            <div className="bg-gray-100 rounded-full p-1 flex items-center justify-start gap-2 mb-6 overflow-x-auto max-w-fit">
                                <button onClick={() => setSupportTab('queue')} className={`px-6 py-2 rounded-full text-sm font-bold transition ${supportTab === 'queue' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Request Queue ({supportReqs.filter(r => r.status !== 'Approved' && r.status !== 'Completed' && r.status !== 'Rejected').length})</button>
                                <button onClick={() => setSupportTab('approved')} className={`px-6 py-2 rounded-full text-sm font-bold transition ${supportTab === 'approved' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Approved / Monitoring ({supportReqs.filter(r => r.status === 'Approved' || r.status === 'Completed' || r.status === 'Rejected').length})</button>
                            </div>

                            {/* Category Filter */}
                            <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-xl border border-gray-100 w-fit">
                                <Filter size={16} className="text-gray-400" />
                                <select value={supportCategory} onChange={e => setSupportCategory(e.target.value)} className="text-xs font-bold text-gray-700 focus:outline-none bg-transparent">
                                    {['All', 'Working Student Support', 'Indigenous Persons Support', 'Orphan Support', 'Financial Hardship'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {supportReqs
                                    .filter(req => {
                                        if (supportTab === 'queue') return req.status !== 'Approved' && req.status !== 'Completed' && req.status !== 'Rejected';
                                        return req.status === 'Approved' || req.status === 'Completed' || req.status === 'Rejected';
                                    })
                                    .filter(req => supportCategory === 'All' || (req.support_type && req.support_type.includes(supportCategory)))
                                    .map(req => (
                                        <div key={req.id} className="card-hover bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-gray-100/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-200/50"><GraduationCap size={18} className="text-white" /></div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{req.student_name}</h4>
                                                            <p className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()} • {req.student_id}</p>
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={req.status} />
                                                </div>
                                                <p className="text-sm text-gray-600 font-medium mb-2">{req.support_type}</p>
                                            </div>
                                            <div className="flex gap-3 border-t border-gray-100/50 pt-4 mt-auto">
                                                <button onClick={() => openSupportModal(req)} className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01]"><ClipboardList size={16} /> Manage Request</button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            {supportReqs.length === 0 && <p className="text-center text-gray-500 py-8">No requests found.</p>}
                        </div>
                    )}

                    {activeTab === 'events' && (
                        <div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Events & Announcements</h1>
                                    <p className="text-gray-500 text-sm mt-1">Manage campus activities and broadcast official notices.</p>
                                </div>
                                <button onClick={() => { setEditingEventId(null); setNewEvent({ title: '', description: '', event_date: '', event_time: '', end_time: '', location: '', latitude: '', longitude: '', type: 'Event' }); setShowEventModal(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-purple-200 hover:scale-[1.02] transition-all duration-300"><Plus size={14} /> Create New</button>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                                    {['All Items', 'Events', 'Announcements'].map(tab => (
                                        <button key={tab} onClick={() => setEventFilter(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${eventFilter === tab ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-700'}`}>{tab}</button>
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-md border border-gray-200">Total: {events.length}</span>
                            </div>

                            <div className="space-y-4">
                                {events
                                    .filter(i => eventFilter === 'All Items' || (eventFilter === 'Events' && i.type === 'Event') || (eventFilter === 'Announcements' && i.type === 'Announcement'))
                                    .map(item => (
                                        <div key={item.id} className="card-hover bg-white/80 backdrop-blur-sm border border-gray-100/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.type === 'Event' ? 'bg-blue-100 text-blue-700' : item.type === 'Priority' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>{item.type}</span>
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                                <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                                                    {item.location && <span className="flex items-center gap-1"><MapPin size={12} />{item.location}</span>}
                                                    {item.event_date && <span className="flex items-center gap-1"><Calendar size={12} />{item.event_date}</span>}
                                                    {item.event_time && <span className="flex items-center gap-1"><Clock size={12} />{item.event_time}</span>}
                                                    {item.end_time && <span className="text-gray-400 text-[10px] ml-1">- {item.end_time}</span>}
                                                    {item.type === 'Event' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Users size={12} />{item.attendees || 0} Attendees</span>}
                                                    {item.type === 'Event' && item.avgRating && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold ml-2 flex items-center gap-1"><Star size={12} />{item.avgRating} <span className="font-normal opacity-75">({item.feedbackCount})</span></span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {item.type === 'Event' && (
                                                    <>
                                                        <button onClick={() => handleViewFeedback(item)} className="px-4 py-2 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-100 transition flex items-center gap-1"><Star size={14} /> Feedback</button>
                                                        <button onClick={() => handleViewAttendees(item)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition">Attendees</button>
                                                    </>
                                                )}
                                                <button onClick={() => handleEditEvent(item)} className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition">Edit</button>
                                                <button onClick={() => handleDeleteEvent(item.id)} className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                {events.length === 0 && <div className="text-center py-8 text-gray-400">No events or announcements found.</div>}
                            </div>
                        </div>
                    )}
                    {activeTab === 'forms' && <FormManagementPage functions={functions} />}
                    {activeTab === 'feedback' && <FeedbackPage functions={functions} />}
                    {activeTab === 'audit' && <AuditLogsPage />}
                    {activeTab === 'logbook' && <OfficeLogbookPage functions={functions} />}

                    {activeTab === 'scholarship' && (
                        <div>
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Scholarship Management</h1>
                                    <p className="text-gray-500 text-sm mt-1">Manage active scholarships and view applicants.</p>
                                </div>
                                <button onClick={() => setShowScholarshipModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-purple-200 transition-all duration-300">
                                    <Plus size={14} /> Add Scholarship
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {scholarships.map(s => (
                                    <div key={s.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                                    <Award size={20} />
                                                </div>
                                                <div className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                                    Deadline: {new Date(s.deadline).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-lg text-gray-900 mb-2">{s.title}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-3 mb-4">{s.description}</p>
                                        </div>
                                        <div className="pt-4 border-t border-gray-50 flex gap-2">
                                            <button onClick={() => handleViewApplicants(s)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition">View Applicants</button>
                                            <button onClick={() => handleDeleteScholarship(s.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                                {scholarships.length === 0 && (
                                    <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <p>No active scholarships found. Click "Add Scholarship" to create one.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Application Modal */}
            {showApplicationModal && selectedApp && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
                        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-gray-50 to-purple-50/30">
                            <h3 className="font-bold text-lg gradient-text">Application Details</h3>
                            <button onClick={() => setShowApplicationModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 text-sm">
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div><label className="text-xs text-gray-500 font-bold uppercase">Applicant</label><p className="font-medium text-lg">{selectedApp.first_name} {selectedApp.last_name}</p></div>
                                <div><label className="text-xs text-gray-500 font-bold uppercase">Course Preference</label><p className="font-medium text-lg text-purple-600">{selectedApp.priority_course}</p></div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                                <h4 className="font-bold mb-3 flex items-center gap-2"><FileText size={16} /> Grades & Requirements</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><span className="text-gray-500 text-xs">GWA</span><p className="font-bold">{selectedApp.gwa || 'N/A'}</p></div>
                                    <div><span className="text-gray-500 text-xs">Math</span><p className="font-bold">{selectedApp.math_grade || 'N/A'}</p></div>
                                    <div><span className="text-gray-500 text-xs">Science</span><p className="font-bold">{selectedApp.science_grade || 'N/A'}</p></div>
                                    <div><span className="text-gray-500 text-xs">English</span><p className="font-bold">{selectedApp.english_grade || 'N/A'}</p></div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => handleAppAction(selectedApp.id, 'Approved')} className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-green-200 transition-all duration-300 hover:scale-[1.01]">Approve Application</button>
                                <button onClick={() => handleAppAction(selectedApp.id, 'Rejected')} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 border border-red-200 transition-all duration-200">Reject</button>
                                <button onClick={() => handleDeleteApplication(selectedApp.id)} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 hover:text-red-600 transition-all duration-200" title="Delete Application"><Trash2 size={20} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && selectedApp && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="font-bold text-lg mb-4 gradient-text">Schedule Session</h3>
                        <p className="text-sm text-gray-500 mb-6">Set a date and time for {selectedApp.student_name}'s counseling.</p>
                        <form onSubmit={handleScheduleSubmit} className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Date</label><input type="date" required className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:border-purple-400 transition-colors" value={scheduleData.date} onChange={e => setScheduleData({ ...scheduleData, date: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Time</label><input type="time" required className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:border-purple-400 transition-colors" value={scheduleData.time} onChange={e => setScheduleData({ ...scheduleData, time: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Notes</label><textarea className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:border-purple-400 transition-colors" rows="3" value={scheduleData.notes} onChange={e => setScheduleData({ ...scheduleData, notes: e.target.value })}></textarea></div>
                            <button className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-200 transition-all duration-300 hover:scale-[1.01]">Confirm Schedule</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Scholarship Create Modal */}
            {showScholarshipModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">Add New Scholarship</h3>
                            <button onClick={() => setShowScholarshipModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Scholarship Title</label><input className="w-full border rounded-lg p-2 text-sm" value={scholarshipForm.title} onChange={e => setScholarshipForm({ ...scholarshipForm, title: e.target.value })} placeholder="e.g. Academic Excellence 2026" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Description</label><textarea className="w-full border rounded-lg p-2 text-sm" rows="3" value={scholarshipForm.description} onChange={e => setScholarshipForm({ ...scholarshipForm, description: e.target.value })} placeholder="Overview..."></textarea></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Requirements</label><textarea className="w-full border rounded-lg p-2 text-sm" rows="3" value={scholarshipForm.requirements} onChange={e => setScholarshipForm({ ...scholarshipForm, requirements: e.target.value })} placeholder="List requirements..."></textarea></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Deadline</label><input type="date" className="w-full border rounded-lg p-2 text-sm" value={scholarshipForm.deadline} onChange={e => setScholarshipForm({ ...scholarshipForm, deadline: e.target.value })} /></div>

                            <button onClick={handleAddScholarship} disabled={loading} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition mt-2">{loading ? 'Adding...' : 'Post Scholarship'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scholarship Applicants Modal */}
            {showApplicantModal && selectedScholarship && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85vh] animate-scale-in">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div><h3 className="font-bold text-lg">Applicants List</h3><p className="text-xs text-gray-500">{selectedScholarship.title}</p></div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleExportApplicants} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition"><Download size={14} /> Export Excel</button>
                                <button onClick={() => setShowApplicantModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            {applicantsList.length === 0 ? <div className="text-center py-12 text-gray-400">No applicants yet.</div> : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0"><tr><th className="px-6 py-3">Student Name</th><th className="px-6 py-3">Course & Year</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Date Applied</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {applicantsList.map((app, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-6 py-3"><p className="font-bold text-gray-900">{app.student_name}</p><p className="text-xs text-gray-500">{app.email}</p></td>
                                                <td className="px-6 py-3 text-gray-600">{app.course} - {app.year_level}</td>
                                                <td className="px-6 py-3 text-gray-600">{app.contact_number}</td>
                                                <td className="px-6 py-3 text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Event Modal - Enhanced for Create/Edit */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-purple-50/30 flex justify-between items-center">
                            <h3 className="font-bold text-lg gradient-text">{editingEventId ? 'Edit Item' : 'Create New Item'}</h3>
                            <button onClick={() => { setShowEventModal(false); setEditingEventId(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={createEvent} className="space-y-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                                    <select className="w-full border rounded-lg p-2 text-sm" value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}>
                                        <option value="Event">Event</option>
                                        <option value="Announcement">Announcement</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Title</label><input required className="w-full border rounded-lg p-2 text-sm" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="e.g., Campus Fair 2026" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Description</label><textarea required className="w-full border rounded-lg p-2 text-sm" rows="3" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Details..."></textarea></div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Date</label><input type="date" required className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_date} onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })} /></div>
                                    {newEvent.type === 'Event' && (
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label><input type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.event_time} onChange={e => setNewEvent({ ...newEvent, event_time: e.target.value })} /></div>
                                    )}
                                </div>

                                {newEvent.type === 'Event' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">End Time</label><input type="time" className="w-full border rounded-lg p-2 text-sm" value={newEvent.end_time} onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })} /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Location</label><input className="w-full border rounded-lg p-2 text-sm" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="e.g., Main Gym" /></div>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-bold text-blue-700">Geolocation</label>
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={getCurrentLocation} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><MapPin size={12} /> Get My Location</button>
                                                    <button type="button" onClick={() => setNewEvent({ ...newEvent, latitude: '9.306', longitude: '123.306' })} className="text-xs text-gray-500 hover:underline flex items-center gap-1"><MapPin size={12} /> Reset to Campus</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input type="number" step="any" placeholder="Lat" className="w-full border rounded-lg p-2 text-xs" value={newEvent.latitude} onChange={e => setNewEvent({ ...newEvent, latitude: e.target.value })} />
                                                <input type="number" step="any" placeholder="Long" className="w-full border rounded-lg p-2 text-xs" value={newEvent.longitude} onChange={e => setNewEvent({ ...newEvent, longitude: e.target.value })} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => { setShowEventModal(false); setEditingEventId(null); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md">{editingEventId ? 'Update' : 'Create'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendees Modal */}
            {showAttendeesModal && (() => {
                const depts = [...new Set(attendees.map(a => a.department).filter(Boolean))].sort();
                const yearLevels = [...new Set(attendees.map(a => a.year_level).filter(Boolean))].sort();
                let filtered = attendeeFilter === 'All' ? attendees : attendees.filter(a => a.department === attendeeFilter);
                if (yearLevelFilter !== 'All') filtered = filtered.filter(a => a.year_level === yearLevelFilter);
                const completedCount = attendees.filter(a => a.time_out).length;
                return (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b bg-gray-50 rounded-t-2xl">
                                <div className="flex justify-between items-center mb-3">
                                    <div><h3 className="font-bold text-lg">Attendees List</h3><p className="text-xs text-gray-500">{selectedEventTitle}</p></div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => {
                                            if (filtered.length === 0) return;
                                            const headers = ['Student Name', 'Department', 'Year Level', 'Time In', 'Time Out', 'Status'];
                                            const rows = filtered.map(a => [a.student_name, a.department || '', a.year_level || '', new Date(a.time_in).toLocaleString(), a.time_out ? new Date(a.time_out).toLocaleString() : '-', a.time_out ? 'Completed' : 'Still In']);
                                            exportToExcel(headers, rows, `${selectedEventTitle || 'event'}_attendees`);
                                        }} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50">
                                            <Download size={14} /> Export Excel
                                        </button>
                                        <button onClick={() => { setShowAttendeesModal(false); setAttendeeFilter('All'); setYearLevelFilter('All'); }}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs mb-3">
                                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold">{attendees.length} Total</span>
                                    <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold">{completedCount} Completed</span>
                                    <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-bold">{attendees.length - completedCount} Still In</span>
                                </div>
                                {depts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Dept:</span>
                                        <button onClick={() => setAttendeeFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeFilter === 'All' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All ({attendees.length})</button>
                                        {depts.map(dept => {
                                            const count = attendees.filter(a => a.department === dept).length;
                                            return <button key={dept} onClick={() => setAttendeeFilter(dept)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${attendeeFilter === dept ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{dept} ({count})</button>;
                                        })}
                                    </div>
                                )}
                                {yearLevels.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Year:</span>
                                        <button onClick={() => setYearLevelFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                        {yearLevels.map(yl => {
                                            const count = attendees.filter(a => a.year_level === yl).length;
                                            return <button key={yl} onClick={() => setYearLevelFilter(yl)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === yl ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{yl} ({count})</button>;
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="p-0 overflow-y-auto flex-1">
                                {filtered.length === 0 ? <p className="text-center py-8 text-gray-500">No attendees yet.</p> : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0"><tr><th className="px-6 py-3">Student</th><th className="px-6 py-3">Year Level</th><th className="px-6 py-3">Time In</th><th className="px-6 py-3">Time Out</th><th className="px-6 py-3">Location</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filtered.map((att, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-6 py-3"><p className="font-bold text-gray-900">{att.student_name}</p><p className="text-xs text-gray-500">{att.department}</p></td>
                                                    <td className="px-6 py-3 text-gray-600 text-xs font-medium">{att.year_level || '-'}</td>
                                                    <td className="px-6 py-3 text-gray-600">{new Date(att.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-6 py-3">{att.time_out ? <span className="text-green-600 font-medium">{new Date(att.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : <span className="text-yellow-600 text-xs font-bold">Still In</span>}</td>
                                                    <td className="px-6 py-3 text-xs">
                                                        {att.latitude ? <a href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1"><MapPin size={12} />Map</a> : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div><h3 className="font-bold text-lg">Event Feedback</h3><p className="text-xs text-gray-500">{selectedEventTitle}</p></div>
                            <button onClick={() => setShowFeedbackModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {feedbackList.length === 0 ? <p className="text-center text-gray-500">No feedback submitted yet.</p> : feedbackList.map((fb, i) => (
                                <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-1 text-yellow-500 mb-2">
                                        {[...Array(5)].map((_, idx) => <i key={idx} className={`fa-solid fa-star ${idx < fb.rating ? '' : 'text-gray-300'}`}></i>)}
                                        <span className="text-xs font-bold text-gray-600 ml-2">{fb.rating}/5</span>
                                    </div>
                                    <p className="text-sm text-gray-700 italic">"{fb.comments}"</p>
                                    <p className="text-xs text-gray-400 mt-2 text-right">{new Date(fb.submitted_at).toLocaleDateString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    <div className="text-xl">{toast.type === 'error' ? <XCircle /> : <CheckCircle />}</div>
                    <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                </div>
            )}

            {/* Support Modal - Enhanced Side Panel */}
            {showSupportModal && selectedSupportReq && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-backdrop" onClick={() => setShowSupportModal(false)}></div>
                    <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl shadow-purple-900/10 flex flex-col animate-slide-in-right">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 gradient-text">Support Application</h3>
                                <p className="text-xs text-gray-500 mt-1">Review details and take action</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrintSupport} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 text-blue-600 transition" title="Print Application"><Download size={16} /></button>
                                <button onClick={() => setShowSupportModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><XCircle size={18} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Student Information Section */}
                            <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-sm text-purple-600 mb-4 uppercase tracking-wider border-b border-gray-200 pb-2">Student Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><label className="block text-xs font-bold text-gray-500">Full Name</label><div className="font-semibold text-gray-900">{selectedSupportReq.student_name}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Date Filed</label><div className="font-semibold text-gray-900">{new Date(selectedSupportReq.created_at).toLocaleDateString()}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Date of Birth</label><div className="font-semibold text-gray-900">{selectedStudent?.dob || '-'}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Program – Year</label><div className="font-semibold text-gray-900">{selectedStudent?.course || '-'} - {selectedStudent?.year_level || '-'}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Mobile</label><div className="font-semibold text-gray-900">{selectedStudent?.mobile || '-'}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Email</label><div className="font-semibold text-gray-900">{selectedStudent?.email || '-'}</div></div>
                                    <div className="col-span-2"><label className="block text-xs font-bold text-gray-500">Home Address</label><div className="font-semibold text-gray-900">{selectedStudent?.address || '-'}</div></div>
                                </div>
                            </section>

                            {/* Section A: Studies */}
                            <section>
                                <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">A. Your Studies</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">1st Priority:</span><span className="font-medium text-gray-900">{selectedStudent?.priority_course || 'N/A'}</span></div>
                                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">2nd Priority:</span><span className="font-medium text-gray-900">{selectedStudent?.alt_course_1 || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">3rd Priority:</span><span className="font-medium text-gray-900">{selectedStudent?.alt_course_2 || 'N/A'}</span></div>
                                </div>
                            </section>

                            {/* Categories & Particulars */}
                            <section>
                                <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">B. Particulars of Need</h4>
                                <div className="mb-4">
                                    <p className="text-xs font-bold text-gray-600 mb-1">Categories:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedSupportReq.support_type ? selectedSupportReq.support_type.split(', ').map((cat, i) => (
                                            <span key={i} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs text-gray-700">{cat}</span>
                                        )) : <span className="text-xs text-gray-400">None</span>}
                                    </div>
                                </div>
                                {renderDetailedDescription(selectedSupportReq.description)}
                                {selectedSupportReq.documents_url && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                        <a href={selectedSupportReq.documents_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline font-bold flex items-center gap-2"><Paperclip size={14} /> View Supporting Documents</a>
                                    </div>
                                )}
                            </section>

                            {/* Action Section */}
                            <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-sm text-gray-700 mb-4 uppercase tracking-wider">Staff Actions</h4>

                                {selectedSupportReq.status === 'Submitted' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Care Staff Notes (For Dept Head)</label>
                                        <textarea rows="3" value={supportForm.care_notes} onChange={e => setSupportForm({ ...supportForm, care_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Add endorsement notes..."></textarea>
                                        <button onClick={handleForwardSupport} className="w-full mt-2 bg-yellow-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-yellow-600">Forward to Dept Head</button>
                                    </div>
                                )}

                                {selectedSupportReq.status === 'Forwarded to Dept' && (
                                    <div className="text-center text-sm text-gray-500 italic py-4">Waiting for Department Head review...</div>
                                )}

                                {(selectedSupportReq.status === 'Approved' || selectedSupportReq.status === 'Rejected') && (
                                    <div>
                                        <div className={`p-3 rounded-lg mb-3 ${selectedSupportReq.status === 'Approved' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                            <p className="text-xs font-bold uppercase">Dept Head Decision: {selectedSupportReq.status}</p>
                                            <p className="text-sm mt-1">{selectedSupportReq.dept_notes || 'No notes provided.'}</p>
                                        </div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Final Resolution / Ideas for Student</label>
                                        <textarea rows="3" value={supportForm.resolution_notes} onChange={e => setSupportForm({ ...supportForm, resolution_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Provide solution or next steps..."></textarea>
                                        <button onClick={handleFinalizeSupport} className="w-full mt-2 bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700">Notify Student & Complete</button>
                                    </div>
                                )}

                                {selectedSupportReq.status === 'Completed' && (
                                    <p className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded"><CheckCircle size={12} className="inline mr-1" /> Request Resolved</p>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            )}
            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in">
                        <h3 className="font-bold text-lg mb-4 gradient-text">Complete Counseling Session</h3>
                        <form onSubmit={handleCompleteSession} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Public Resolution Notes</label>
                                <textarea required className="w-full border rounded-lg p-2 text-sm" rows="3" placeholder="Notes visible to student..." value={completionForm.publicNotes} onChange={e => setCompletionForm({ ...completionForm, publicNotes: e.target.value })}></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Confidential Notes</label>
                                <textarea className="w-full border rounded-lg p-2 text-sm bg-red-50" rows="3" placeholder="Private notes for staff only..." value={completionForm.privateNotes} onChange={e => setCompletionForm({ ...completionForm, privateNotes: e.target.value })}></textarea>
                                <p className="text-[10px] text-red-500 mt-1">* Only visible to Guidance Staff</p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowCompleteModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">Complete Session</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* COMMAND HUB FAB + PANEL */}
            <button
                onClick={() => setShowCommandHub(!showCommandHub)}
                className={`fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full shadow-xl shadow-purple-300/40 hover:shadow-2xl hover:shadow-purple-400/50 hover:scale-110 transition-all duration-300 flex items-center justify-center ${showCommandHub ? '' : 'animate-float'}`}
                title="Command Hub"
            >
                {showCommandHub ? <XCircle size={24} /> : <MessageCircle size={24} />}
            </button>

            {showCommandHub && (
                <div className="fixed bottom-24 right-6 z-40 w-[370px] max-h-[520px] bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-2xl shadow-purple-200/30 flex flex-col overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
                        <h3 className="font-bold text-sm">Command Hub</h3>
                        <p className="text-purple-200 text-[11px]">Quick actions, tips & notes</p>
                    </div>

                    {/* Tab bar */}
                    <div className="flex border-b border-gray-100 bg-gray-50/80">
                        {[
                            { key: 'actions', label: 'Actions', icon: <Rocket size={14} /> },
                            { key: 'help', label: 'Help', icon: <Info size={14} /> },
                            { key: 'notes', label: 'Notes', icon: <FileText size={14} /> },
                        ].map(t => (
                            <button key={t.key} onClick={() => setCommandHubTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${commandHubTab === t.key ? 'text-purple-700 border-b-2 border-purple-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {commandHubTab === 'actions' && (
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'New Event', icon: <Calendar size={18} />, color: 'from-blue-400 to-indigo-500', action: () => { setActiveTab('events'); setShowCommandHub(false); } },
                                    { label: 'Announcement', icon: <Send size={18} />, color: 'from-purple-400 to-violet-500', action: () => { setActiveTab('events'); setShowCommandHub(false); } },
                                    { label: 'Counseling', icon: <Users size={18} />, color: 'from-teal-400 to-cyan-500', action: () => { setActiveTab('counseling'); setShowCommandHub(false); } },
                                    { label: 'Support', icon: <CheckCircle size={18} />, color: 'from-amber-400 to-orange-500', action: () => { setActiveTab('support'); setShowCommandHub(false); } },
                                    { label: 'Analytics', icon: <BarChart2 size={18} />, color: 'from-emerald-400 to-green-500', action: () => { setActiveTab('analytics'); setShowCommandHub(false); } },
                                    { label: 'NAT Mgmt', icon: <FileText size={18} />, color: 'from-rose-400 to-pink-500', action: () => { setActiveTab('nat'); setShowCommandHub(false); } },
                                ].map((item, idx) => (
                                    <button key={idx} onClick={item.action} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200 group">
                                        <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                                            {item.icon}
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-purple-700 transition-colors">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {commandHubTab === 'help' && (
                            <div className="space-y-3">
                                {[
                                    { icon: '🗓️', title: 'Events & Announcements', desc: 'Create events from the Events tab or use Quick Actions on Dashboard. Students receive real-time push notifications.' },
                                    { icon: '🧠', title: 'Counseling Workflow', desc: 'Students submit requests → you Schedule → Conduct session → Mark Complete with notes. Confidential notes are private.' },
                                    { icon: '📋', title: 'NAT Management', desc: 'Track applicants, manage test schedules, and view test takers (students who timed in & out on exam day).' },
                                    { icon: '📊', title: 'Student Analytics', desc: 'Use form-based needs assessments to analyze student wellness trends across departments and year levels.' },
                                    { icon: '🔔', title: 'Real-time Updates', desc: 'All data syncs in real-time. You\'ll see toast notifications when students submit feedback or new requests arrive.' },
                                ].map((tip, idx) => (
                                    <div key={idx} className="flex gap-3 p-3 rounded-xl bg-gray-50/80 hover:bg-purple-50/50 transition-colors">
                                        <span className="text-lg flex-shrink-0">{tip.icon}</span>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{tip.title}</p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{tip.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {commandHubTab === 'notes' && (
                            <div className="space-y-3">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const input = e.target.elements.noteInput;
                                    const text = input.value.trim();
                                    if (!text) return;
                                    const updated = [{ id: Date.now(), text, time: new Date().toLocaleString() }, ...staffNotes];
                                    setStaffNotes(updated);
                                    localStorage.setItem('care_staff_notes', JSON.stringify(updated));
                                    input.value = '';
                                }} className="flex gap-2">
                                    <input name="noteInput" placeholder="Quick note..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all" />
                                    <button type="submit" className="px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-200 transition-all">
                                        <Plus size={16} />
                                    </button>
                                </form>

                                {staffNotes.length === 0 ? (
                                    <p className="text-center text-gray-400 text-xs py-6">No notes yet. Jot down reminders, shift handover info, or quick memos.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                                        {staffNotes.map(note => (
                                            <div key={note.id} className="flex gap-2 p-3 rounded-xl bg-gray-50/80 group hover:bg-yellow-50/50 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-800 leading-relaxed">{note.text}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">{note.time}</p>
                                                </div>
                                                <button onClick={() => {
                                                    const updated = staffNotes.filter(n => n.id !== note.id);
                                                    setStaffNotes(updated);
                                                    localStorage.setItem('care_staff_notes', JSON.stringify(updated));
                                                }} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 self-start">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ENHANCED TOAST NOTIFICATION */}
            {toast && (
                <div className="fixed bottom-6 right-24 z-50 bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-2xl shadow-purple-100/30 rounded-2xl p-4 flex items-center gap-4 animate-slide-in-right overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${toast.type === 'success' ? 'bg-gradient-to-b from-green-400 to-emerald-500' :
                        toast.type === 'error' ? 'bg-gradient-to-b from-red-400 to-rose-500' :
                            'bg-gradient-to-b from-blue-400 to-indigo-500'
                        }`} />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md shadow-green-200/50' :
                        toast.type === 'error' ? 'bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-md shadow-red-200/50' :
                            'bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-md shadow-blue-200/50'
                        }`}>
                        {toast.type === 'success' ? <CheckCircle size={20} /> :
                            toast.type === 'error' ? <AlertTriangle size={20} /> :
                                <Info size={20} />}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">
                            {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Notification'}
                        </h4>
                        <p className="text-xs text-gray-500 max-w-[200px]">{toast.msg}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
                        <XCircle size={16} className="text-gray-400" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
                        <div className={`h-full animate-shrink ${toast.type === 'success' ? 'bg-green-400' :
                            toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                            }`} />
                    </div>
                </div>
            )}

            {/* SYSTEM RESET CONFIRMATION MODAL */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-backdrop">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-in">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-rose-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-200/50">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">System Reset</h3>
                            <p className="text-gray-500 text-sm mb-6">⚠️ WARNING: This will DELETE ALL user-submitted data (Students, Applications, Logs, etc.). This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowResetModal(false)} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all duration-200">Cancel</button>
                                <button onClick={handleResetSystem} className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-red-200 transition-all duration-300 hover:scale-[1.01]">Yes, Wipe Data</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Lifted Edit Student Modal (Shared) */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                    <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-in-right">
                        <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-xl text-slate-900">Student Profile</h3>
                                <p className="text-xs text-slate-500">View and edit full student details</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><XCircle size={24} className="text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleUpdateStudent} className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Personal Information */}
                            <section>
                                <h4 className="font-bold text-sm text-blue-600 mb-4 border-b border-blue-100 pb-2 flex items-center gap-2"><User size={16} /> Personal Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">First Name</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.first_name || ''} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Last Name</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.last_name || ''} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Middle Name</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.middle_name || ''} onChange={e => setEditForm({ ...editForm, middle_name: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Suffix</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.suffix || ''} onChange={e => setEditForm({ ...editForm, suffix: e.target.value })} /></div>

                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Date of Birth</label><input type="date" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.dob || ''} onChange={e => setEditForm({ ...editForm, dob: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Place of Birth</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.place_of_birth || ''} onChange={e => setEditForm({ ...editForm, place_of_birth: e.target.value })} /></div>

                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-700">Sex</label>
                                        <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white" value={editForm.sex || ''} onChange={e => setEditForm({ ...editForm, sex: e.target.value })}>
                                            <option value="">Select...</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1 text-slate-700">Gender Identity</label>
                                        <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.gender_identity || ''} onChange={e => setEditForm({ ...editForm, gender_identity: e.target.value })} placeholder="e.g. LGBTQ+" />
                                    </div>

                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Civil Status</label>
                                        <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white" value={editForm.civil_status || ''} onChange={e => setEditForm({ ...editForm, civil_status: e.target.value })}>
                                            <option value="">Select...</option>
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                            <option value="Separated">Separated</option>
                                            <option value="Widowed">Widowed</option>
                                        </select>
                                    </div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Nationality</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={editForm.nationality || ''} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} /></div>
                                </div>
                            </section>

                            <section>
                                <h4 className="font-bold text-sm text-green-600 mb-4 border-b border-green-100 pb-2 flex items-center gap-2"><MapPin size={16} /> Address & Contact</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-slate-700">Street / Info</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.street || ''} onChange={e => setEditForm({ ...editForm, street: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">City/Municipality</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.city || ''} onChange={e => setEditForm({ ...editForm, city: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Province</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.province || ''} onChange={e => setEditForm({ ...editForm, province: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Zip Code</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.zip_code || ''} onChange={e => setEditForm({ ...editForm, zip_code: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Mobile</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.mobile || ''} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Email</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Facebook</label><input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" value={editForm.facebook_url || ''} onChange={e => setEditForm({ ...editForm, facebook_url: e.target.value })} /></div>
                                </div>
                            </section>

                            <section>
                                <h4 className="font-bold text-sm text-purple-600 mb-4 border-b border-purple-100 pb-2 flex items-center gap-2"><GraduationCap size={16} /> Academic Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Student ID</label><input disabled className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm text-slate-500 cursor-not-allowed" value={editForm.student_id || ''} /></div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Course</label>
                                        <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white" value={editForm.course || ''} onChange={e => setEditForm({ ...editForm, course: e.target.value })}>
                                            {allCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Year Level</label>
                                        <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white" value={editForm.year_level || ''} onChange={e => setEditForm({ ...editForm, year_level: e.target.value })}>
                                            <option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option>
                                        </select>
                                    </div>
                                    <div><label className="block text-xs font-bold mb-1 text-slate-700">Status</label>
                                        <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white" value={editForm.status || ''} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                            <option>Active</option><option>Inactive</option><option>Probation</option><option>Graduated</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <div className="pt-6 flex justify-end gap-3 border-t border-slate-200 sticky bottom-0 bg-white/95 backdrop-blur-sm p-4 -mx-8 -mb-8 shadow-inner">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition">Cancel</button>
                                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] transition-all">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Lifted Delete Student Modal (Shared) */}
            {showDeleteModal && studentToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm">
                        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2">Delete Student?</h3>
                        <p className="text-slate-500 text-sm mb-6">Are you sure you want to delete {studentToDelete.first_name}?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                            <button onClick={confirmDeleteStudent} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
