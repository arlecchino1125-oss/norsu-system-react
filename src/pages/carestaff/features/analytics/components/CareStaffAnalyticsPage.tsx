import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Users, Clock, Filter, ArrowUpDown, ArrowLeft, ChevronRight, Search,
    BarChart2, RefreshCw, ChevronDown, Sparkles, Activity, FileBarChart,
    Download, FileSpreadsheet, FileText, Loader2, HelpCircle
} from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import LoadingSkeleton from '../../../../../components/ui/LoadingSkeleton';
import PaginationControls from '../../../../../components/PaginationControls';
import { exportNeedsAssessmentExcel, exportNeedsAssessmentPdf } from '../utils/needsAssessmentExport';
import type { CareStaffDashboardFunctions } from '../../../types';

interface CareStaffAnalyticsPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

const FORM_COLUMNS = 'id, title, description, is_active, created_at, source_form_id';
const DEPARTMENT_COLUMNS = 'id, name';
const QUESTION_COLUMNS = 'id, form_id, question_text, question_type, scale_min, scale_max, order_index, created_at';
const SUBMISSION_COLUMNS = 'id, form_id, student_id, submitted_at';
const EMPTY_QUESTIONS: any[] = [];
const EMPTY_ROWS: any[] = [];
const RESPONDENTS_PER_PAGE = 20;

/** Exact 5-band color ramp: Red, Orange, Yellow, Blue, Green */
const SCALE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'];
const SCALE_LABELS = [
    '1 - Not at all',
    '2 - Slightly',
    '3 - Moderately',
    '4 - Very',
    '5 - Extremely'
];

const YEAR_LEVELS_ORDER = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', 'Other', 'Unknown'];

const normalizeQuestionText = (text: string) => (text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export const sameLineageForms = (forms: any[], selectedFormId: number | null) => {
    const selected = forms.find((f) => f.id === selectedFormId);
    if (!selected) return [];
    const root = selected.source_form_id ?? selected.id;
    return forms.filter((f) => f.id !== selectedFormId && (f.id === root || f.source_form_id === root));
};

export const withComparisonDeltas = (stats: any[], compareByText: Map<string, any> | null) => {
    if (!compareByText) return { questionStats: stats, unmatchedCount: 0 };

    let unmatchedCount = 0;
    const questionStats = stats.map((stat) => {
        const prior = compareByText.get(normalizeQuestionText(stat.question.question_text));
        if (!prior) { unmatchedCount += 1; return stat; }
        if (prior.total === 0 || stat.total === 0) return { ...stat, priorAverage: prior.average };
        return { ...stat, priorAverage: prior.average, delta: stat.average - prior.average };
    });
    return { questionStats, unmatchedCount };
};

const ANALYTICS_TABS = [
    { name: 'Overview', icon: BarChart2 },
    { name: 'Questions', icon: HelpCircle },
    { name: 'Respondents', icon: Users }
];

const displayAnswer = (answer?: any) => {
    if (!answer) return '';
    if (typeof answer.answer_value === 'number') return String(answer.answer_value);
    return answer.answer_text ?? '';
};

export const buildQuestionStats = (questions: any[], statRows: any[]) => {
    const countsByQuestion = new Map<number, number[]>();
    for (const question of questions) countsByQuestion.set(question.id, [0, 0, 0, 0, 0]);

    for (const row of statRows) {
        const counts = countsByQuestion.get(Number(row.question_id));
        if (!counts) continue;
        const score = Number(row.answer_value);
        if (score >= 1 && score <= 5) counts[score - 1] += Number(row.responses) || 0;
    }

    return questions.map((question) => {
        const counts = countsByQuestion.get(question.id) ?? [0, 0, 0, 0, 0];
        const total = counts.reduce((sum, n) => sum + n, 0);
        const weighted = counts.reduce((sum, n, index) => sum + n * (index + 1), 0);
        return { question, counts, total, average: total === 0 ? 0 : weighted / total };
    });
};

/** Drill-down detail inside Respondents tab */
const RespondentDetail = ({ student, questions, onBack }: any) => {
    const { data: answers, isLoading } = useQuery({
        queryKey: ['analytics_submission_answers', student.id],
        queryFn: () => fetchSubmissionAnswers(student.id)
    });

    const answersByQuestion = useMemo(() => {
        const map = new Map<number, any>();
        for (const answer of answers ?? []) map.set(answer.question_id, answer);
        return map;
    }, [answers]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div>
                    <h3 className="font-bold text-base text-slate-900">
                        {student.students?.last_name}, {student.students?.first_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Submitted {new Date(student.submitted_at).toLocaleString()}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-purple-300 hover:text-purple-700 shadow-2xs transition-colors"
                >
                    <ArrowLeft size={13} /> Back to list
                </button>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-3.5 border-b border-slate-100 text-xs shrink-0 bg-white">
                <div>
                    <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Student ID</dt>
                    <dd className="font-mono font-bold text-slate-900 mt-0.5">{student.students?.student_id || '—'}</dd>
                </div>
                <div>
                    <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">College</dt>
                    <dd className="font-bold text-slate-900 mt-0.5">{student.students?.department || '—'}</dd>
                </div>
                <div>
                    <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Course</dt>
                    <dd className="font-bold text-slate-900 mt-0.5 truncate" title={student.students?.course}>{student.students?.course || '—'}</dd>
                </div>
                <div>
                    <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Year Level</dt>
                    <dd className="font-bold text-purple-700 uppercase mt-0.5">{student.students?.year_level || '—'}</dd>
                </div>
            </dl>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {isLoading && <p className="py-12 text-center text-xs text-slate-400 font-medium">Loading answers…</p>}
                {!isLoading && questions.map((q: any, idx: number) => {
                    const answer = displayAnswer(answersByQuestion.get(q.id));
                    const isScale = q.question_type !== 'text' && q.question_type !== 'open_ended';
                    return (
                        <div key={q.id} className="rounded-xl border border-slate-200/80 p-4 bg-white hover:border-purple-200 transition-colors">
                            <p className="font-bold text-slate-800 text-xs leading-relaxed">
                                <span className="mr-2 text-slate-400 font-semibold">{idx + 1}.</span>{q.question_text}
                            </p>
                            {answer === '' ? (
                                <p className="mt-1.5 text-xs italic text-slate-400">Not answered</p>
                            ) : isScale ? (
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 font-bold text-xs">
                                        Score: {answer} / {q.scale_max ?? 5}
                                    </span>
                                </div>
                            ) : (
                                <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">{answer}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const sortHeaderClass = 'w-full cursor-pointer px-6 py-3.5 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500 font-bold text-[11px] text-slate-500 uppercase tracking-wider flex items-center justify-between';

/** Respondents Tab */
const RespondentsTab = ({
    courseFilter, setCourseFilter, courseOptions, respondents, sortConfig, onSort,
    onViewStudent, search, setSearch, page, setPage
}: any) => {
    const tableRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return respondents;
        return respondents.filter((sub: any) =>
            `${sub.students?.first_name ?? ''} ${sub.students?.last_name ?? ''} ${sub.students?.student_id ?? ''}`
                .toLowerCase().includes(term)
        );
    }, [respondents, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / RESPONDENTS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * RESPONDENTS_PER_PAGE;
    const visible = filtered.slice(pageStart, pageStart + RESPONDENTS_PER_PAGE);

    return (
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                        <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search name or ID"
                            aria-label="Search respondents by name or student ID"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {/* Course Filter Dropdown with Funnel Icon */}
                    <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
                        <Filter size={13} className="text-purple-600 mr-2 shrink-0" />
                        <select
                            aria-label="Filter respondents by course"
                            value={courseFilter}
                            onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
                            className="appearance-none pr-6 text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer max-w-[15rem] truncate"
                        >
                            <option value="All">All Courses</option>
                            {courseOptions.map(([course, count]: [string, number]) => (
                                <option key={course} value={course}>{course} ({count})</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Student Count on Right */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 shrink-0">
                    <Users size={14} className="text-purple-600" />
                    <span>
                        {filtered.length === respondents.length ? `${filtered.length} students` : `${filtered.length} of ${respondents.length} students`}
                    </span>
                </div>
            </div>

            {/* Table in White Bordered Card with Sticky Header */}
            <div ref={tableRef} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th scope="col" aria-sort={sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0">
                                    <button type="button" className={sortHeaderClass} onClick={() => onSort('name')}>
                                        <span>Student Name</span>
                                        <ArrowUpDown size={11} className={`ml-1 ${sortConfig.key === 'name' ? 'text-purple-600 font-bold' : 'text-slate-400'}`} />
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                    Course &amp; Year
                                </th>
                                <th scope="col" aria-sort={sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0">
                                    <button type="button" className={sortHeaderClass} onClick={() => onSort('date')}>
                                        <span>Date Submitted</span>
                                        <ArrowUpDown size={11} className={`ml-1 ${sortConfig.key === 'date' ? 'text-purple-600 font-bold' : 'text-slate-400'}`} />
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visible.map((sub: any) => (
                                <tr
                                    key={sub.id}
                                    onClick={() => onViewStudent(sub)}
                                    className="cursor-pointer group transition-colors hover:bg-purple-50/40"
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                            {sub.students?.last_name}, {sub.students?.first_name}
                                        </div>
                                        <div className="font-mono text-[11px] text-slate-400 mt-0.5 font-medium">
                                            {sub.students?.student_id || 'ID Unknown'}
                                        </div>
                                    </td>
                                    <td className="max-w-[20rem] px-6 py-4">
                                        <div className="font-medium text-slate-800 truncate" title={sub.students?.course || undefined}>
                                            {sub.students?.course || 'Unknown Course'}
                                        </div>
                                        <div className="text-[10.5px] font-bold text-purple-700 mt-0.5 uppercase tracking-wider">
                                            {sub.students?.year_level || 'YEAR NOT SET'}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="font-semibold text-slate-800">{new Date(sub.submitted_at).toLocaleDateString()}</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                            {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center gap-1 text-purple-600 font-bold text-xs group-hover:underline">
                                            View answers <span aria-hidden="true">&rarr;</span>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center text-slate-400 font-medium">
                                        No responses found matching your search or filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filtered.length > 0 && (
                    <div className="border-t border-slate-100 p-2 shrink-0 bg-white">
                        <PaginationControls
                            page={currentPage}
                            pageSize={RESPONDENTS_PER_PAGE}
                            total={filtered.length}
                            onPageChange={next => {
                                setPage(next);
                                tableRef.current?.scrollIntoView({ block: 'start' });
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

/** Overview Tab: 2-Column Equal Width Grid */
const OverviewTab = ({
    submissions, questionStats, topQuestionScoreFilter, setTopQuestionScoreFilter
}: any) => {
    // 1. Year level counts for CSS vertical bar chart
    const yearCounts = useMemo(() => {
        const counts: Record<string, number> = {
            '1st Year': 0,
            '2nd Year': 0,
            '3rd Year': 0,
            '4th Year': 0,
            '5th Year': 0,
            '6th Year': 0,
            'Other': 0,
            'Unknown': 0
        };
        for (const sub of submissions) {
            const raw = (sub.students?.year_level || '').trim();
            if (raw in counts) {
                counts[raw] += 1;
            } else if (raw) {
                counts['Other'] += 1;
            } else {
                counts['Unknown'] += 1;
            }
        }
        return counts;
    }, [submissions]);

    const maxYearCount = useMemo(() => {
        return Math.max(1, ...Object.values(yearCounts));
    }, [yearCounts]);

    // 2. Top Questions with Score Filter
    const topQuestions = useMemo(() => {
        const scoreIndex = Math.max(0, Math.min(4, parseInt(topQuestionScoreFilter, 10) - 1));
        const items = questionStats.map((stat: any) => ({
            id: stat.question.id,
            question: stat.question.question_text ?? '',
            count: stat.counts?.[scoreIndex] ?? 0
        }));
        return items.sort((a: any, b: any) => b.count - a.count).slice(0, 10);
    }, [questionStats, topQuestionScoreFilter]);

    const maxTopCount = useMemo(() => {
        return Math.max(1, ...topQuestions.map(q => q.count));
    }, [topQuestions]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-0">
            {/* Left Card: Respondents by Year Level (CSS vertical bars) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between overflow-hidden">
                <h3 className="font-bold text-base text-slate-900 tracking-tight shrink-0 mb-4">
                    Respondents by Year Level
                </h3>

                <div className="flex-1 flex items-end justify-between gap-1.5 sm:gap-3 px-1 pt-6 pb-2 min-h-[220px]">
                    {YEAR_LEVELS_ORDER.map((year) => {
                        const count = yearCounts[year] || 0;
                        const heightPct = (count / maxYearCount) * 100;
                        return (
                            <div key={year} className="flex-1 flex flex-col items-center justify-end h-full group min-w-0">
                                {/* Value label above bar */}
                                <span className="text-[11px] font-bold text-slate-700 mb-1.5 transition-colors group-hover:text-purple-700 tabular-nums">
                                    {count}
                                </span>
                                {/* Purple vertical bar */}
                                <div className="w-full max-w-[48px] bg-slate-50 rounded-t-lg overflow-hidden flex items-end h-44 border-b border-slate-200">
                                    <div
                                        style={{ height: `${count > 0 ? Math.max(8, heightPct) : 2}%` }}
                                        className="w-full bg-purple-600 hover:bg-purple-700 rounded-t-lg transition-all duration-300 shadow-2xs cursor-default"
                                        title={`${year}: ${count} respondents`}
                                    />
                                </div>
                                {/* Year label below bar */}
                                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-2 truncate max-w-full text-center">
                                    {year}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right Card: Top Questions with Score "5" (Horizontal bars layout) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="font-bold text-base text-slate-900 tracking-tight">
                        Top Questions with Score "{topQuestionScoreFilter}"
                    </h3>
                    <div className="relative">
                        <select
                            aria-label="Top question score"
                            value={topQuestionScoreFilter}
                            onChange={e => setTopQuestionScoreFilter(e.target.value)}
                            className="appearance-none pl-3 pr-7 py-1 text-xs font-bold border border-slate-200 rounded-lg bg-white shadow-2xs focus:ring-purple-400 focus:border-purple-400 cursor-pointer text-slate-700"
                        >
                            {[5, 4, 3, 2, 1].map(score => (
                                <option key={score} value={score}>{score} Stars</option>
                            ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Horizontal Bars List */}
                <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1 min-h-0">
                    {topQuestions.map((item, idx) => (
                        <div key={item.id || idx} className="space-y-1 group">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-800 font-semibold truncate max-w-[85%]" title={item.question}>
                                    {item.question}
                                </span>
                                <span className="font-extrabold text-purple-700 text-xs ml-2 tabular-nums">
                                    {item.count}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${item.count > 0 ? Math.max(3, (item.count / maxTopCount) * 100) : 0}%` }}
                                    className="h-full bg-purple-600 rounded-full transition-all duration-300"
                                />
                            </div>
                        </div>
                    ))}
                    {topQuestions.length === 0 && (
                        <div className="py-12 text-center text-xs text-slate-400 font-medium">
                            No questions with responses recorded yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/** Question Row with Segmented Color Bar */
const QuestionRow = ({ stat, index, isOpen, onToggle }: any) => {
    const { question, counts, total, average, delta, priorAverage } = stat;

    return (
        <div className="border-b border-slate-100 last:border-0">
            <div
                className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-purple-50/30 transition-colors"
            >
                {/* Index Number */}
                <span className="w-5 shrink-0 text-xs font-bold text-slate-400 tabular-nums">{index + 1}</span>

                {/* Question Text + Segmented Color Bar */}
                <div className="flex-1 min-w-0 space-y-2">
                    <p className="font-bold text-xs sm:text-sm text-slate-800 truncate" title={question.question_text}>
                        {question.question_text}
                    </p>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                        {counts.map((count: number, i: number) => {
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            if (pct <= 0) return null;
                            return (
                                <span
                                    key={SCALE_COLORS[i]}
                                    style={{ width: `${pct}%`, backgroundColor: SCALE_COLORS[i] }}
                                    className="h-full transition-all"
                                    title={`${SCALE_LABELS[i]}: ${count} (${pct.toFixed(1)}%)`}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Average Score in Large Bold Purple */}
                <div className="w-16 shrink-0 text-center">
                    <span className="block text-base font-black text-purple-700 tabular-nums leading-none">
                        {total === 0 ? '—' : average.toFixed(2)}
                    </span>
                    <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        AVG
                    </span>
                </div>

                {/* Delta comparison if available */}
                {priorAverage !== undefined && (
                    <div className="w-16 shrink-0 text-center" title={`${priorAverage.toFixed(2)} on comparison form`}>
                        {delta === undefined ? (
                            <span className="text-[10px] font-bold text-slate-300">no data</span>
                        ) : (
                            <>
                                <span className={`block text-xs font-black tabular-nums leading-none ${Math.abs(delta) < 0.05 ? 'text-slate-400' : delta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                                </span>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">vs prior</span>
                            </>
                        )}
                    </div>
                )}

                {/* Sample Size */}
                <span className="w-14 shrink-0 text-right text-xs font-semibold text-slate-400 tabular-nums">
                    n={total}
                </span>

                {/* Expand Chevron Button */}
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-purple-600 hover:border-purple-200 transition-colors shrink-0"
                    aria-label={isOpen ? 'Collapse score breakdown' : 'Expand score breakdown'}
                >
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-600' : ''}`} />
                </button>
            </div>

            {/* Inline 5-Band Score Breakdown when expanded */}
            {isOpen && (
                <div className="px-10 pb-5 pt-1 bg-purple-50/20 border-t border-slate-50 space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Score Distribution Breakdown</p>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        {counts.map((count: number, i: number) => {
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            return (
                                <div key={SCALE_LABELS[i]} className="bg-white rounded-xl border border-slate-100 p-2.5 shadow-2xs space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SCALE_COLORS[i] }} />
                                            {SCALE_LABELS[i]}
                                        </span>
                                        <span className="font-bold text-slate-900">{count}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            style={{ width: `${pct}%`, backgroundColor: SCALE_COLORS[i] }}
                                            className="h-full rounded-full"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-right font-medium">{pct.toFixed(1)}%</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

/** Questions Tab */
const QuestionsTab = ({
    submissions, questionStats, compareTitle, unmatchedCount,
    onExportPdf, onExportExcel, isExporting
}: any) => {
    const [openQuestionId, setOpenQuestionId] = useState<number | null>(null);

    return (
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Header row with Title, Subtitle, Export Buttons, Count Badge */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                <div>
                    <h3 className="font-bold text-base text-slate-900 tracking-tight">Question Analysis</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Open a question to see its full breakdown. Bars run 1 (red) to 5 (green).
                    </p>
                    {compareTitle && (
                        <p className="text-xs text-purple-700 font-semibold mt-0.5">
                            Comparing against {compareTitle}
                            {unmatchedCount > 0 && ` (${unmatchedCount} questions unmatched)`}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onExportPdf}
                        disabled={isExporting || submissions.length === 0}
                        title="Export Questions as PDF Report"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        <FileText size={13} className="text-rose-500" /> PDF
                    </button>
                    <button
                        type="button"
                        onClick={onExportExcel}
                        disabled={isExporting || submissions.length === 0}
                        title="Export Questions as Excel Spreadsheet"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        <FileSpreadsheet size={13} className="text-emerald-600" /> Excel
                    </button>
                    <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        N = {submissions.length}
                    </span>
                </div>
            </div>

            {/* Questions in a Bordered White Card, Internally Scrollable */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 divide-y divide-slate-100">
                    {questionStats.length === 0 ? (
                        <p className="py-16 text-center text-xs text-slate-400 font-medium">No questions available for this form.</p>
                    ) : (
                        questionStats.map((stat: any, index: number) => (
                            <QuestionRow
                                key={stat.question.id}
                                stat={stat}
                                index={index}
                                isOpen={openQuestionId === stat.question.id}
                                onToggle={() => setOpenQuestionId(current => current === stat.question.id ? null : stat.question.id)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

/** Stats Bar in a White Card */
const AnalyticsStatsBar = ({
    compareFormId, setCompareFormId, compareOptions,
    stats,
    departmentFilter, setDepartmentFilter, allDepartments
}: any) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        {/* COMPARE TO */}
        <div className="flex flex-col gap-1 min-w-[180px]">
            <label htmlFor="care-analytics-compare" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                COMPARE TO
            </label>
            <div className="relative">
                <select
                    id="care-analytics-compare"
                    value={compareFormId ?? ''}
                    onChange={e => setCompareFormId(e.target.value ? Number(e.target.value) : null)}
                    disabled={compareOptions.length === 0}
                    className="appearance-none pl-3.5 pr-8 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 shadow-2xs focus:ring-2 focus:ring-purple-400 focus:border-purple-400 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <option value="">{compareOptions.length === 0 ? 'No other runs yet' : 'No comparison'}</option>
                    {compareOptions.map((f: any) => (
                        <option key={f.id} value={f.id}>{f.title}</option>
                    ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>

        {/* TOTAL RESPONDENTS */}
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <Users size={18} />
            </div>
            <div>
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none">TOTAL RESPONDENTS</p>
                <p className="text-xl font-black text-slate-900 leading-tight mt-0.5 tabular-nums">{stats.total}</p>
            </div>
        </div>

        {/* AVG. COMPLETION */}
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Clock size={18} />
            </div>
            <div>
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none">AVG. COMPLETION</p>
                <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">--</p>
                <p className="text-[9.5px] text-slate-400 font-medium leading-none">Not tracked</p>
            </div>
        </div>

        {/* COLLEGE FILTER */}
        <div className="flex flex-col gap-1 min-w-[180px]">
            <label htmlFor="care-analytics-department" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                COLLEGE FILTER
            </label>
            <div className="relative">
                <select
                    id="care-analytics-department"
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value)}
                    className="appearance-none pl-3.5 pr-8 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white shadow-2xs focus:ring-2 focus:ring-purple-400 focus:border-purple-400 w-full cursor-pointer"
                >
                    <option value="All">All Colleges</option>
                    {allDepartments.map((d: any) => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>
    </div>
);

/** Main Page Header styled like Student Population banner */
const AnalyticsHeader = ({
    forms, selectedFormId, onFormSelect, onRefresh, isRefreshingData,
    onExportPdf, onExportExcel, isExporting, totalCount
}: any) => {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="bg-gradient-to-r from-[#170529] via-[#2a0b4d] to-[#170529] rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-md border border-purple-900/40 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shrink-0">
            {/* Title & Subtitle */}
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Student Analytics</h1>
                <p className="text-purple-200/80 text-xs md:text-sm mt-1 font-medium">Deep dive into student responses and trends.</p>
            </div>

            {/* Options / Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Refresh Data button */}
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshingData}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 disabled:opacity-50 hover:shadow-sm"
                >
                    <RefreshCw size={14} className={isRefreshingData ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                </button>

                {/* Export Results dropdown */}
                <div ref={exportMenuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setShowExportMenu(prev => !prev)}
                        disabled={isExporting || totalCount === 0}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        <span>Export Results</span>
                        <ChevronDown size={13} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showExportMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50 animate-scale-in text-slate-800">
                            <button
                                type="button"
                                onClick={() => { setShowExportMenu(false); onExportPdf(); }}
                                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                                <FileText size={15} className="text-rose-500 shrink-0" />
                                <div>
                                    <p className="font-bold">Export PDF Report</p>
                                    <p className="text-[10px] font-normal text-slate-400">Executive &amp; question stats</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowExportMenu(false); onExportExcel(); }}
                                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                                <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                                <div>
                                    <p className="font-bold">Export Excel (.xlsx)</p>
                                    <p className="text-[10px] font-normal text-slate-400">Complete data sheet</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Form Selector */}
                <div className="relative max-w-[280px]">
                    <select
                        aria-label="Analytics form"
                        value={selectedFormId || ''}
                        onChange={e => onFormSelect(Number(e.target.value))}
                        className="appearance-none pl-4 pr-9 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] border border-purple-400/80 text-white text-xs font-bold shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-purple-500/20 cursor-pointer w-full truncate uppercase"
                    >
                        {forms.map((f: any) => (
                            <option key={f.id} value={f.id} className="bg-slate-900 text-white">{f.title}</option>
                        ))}
                        {forms.length === 0 && <option className="bg-slate-900 text-white">No Forms Available</option>}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-200 pointer-events-none" />
                </div>
            </div>
        </div>
    );
};

export const collectAllRows = async <T extends { id: number }>(
    fetchAfter: (afterId: number, limit: number) => Promise<T[]>,
    pageSize = 400,
    maxPages = 200
) => {
    const rows: T[] = [];
    let cursor = 0;
    for (let page = 0; page < maxPages; page += 1) {
        const batch = await fetchAfter(cursor, pageSize);
        if (batch.length === 0) return rows;
        rows.push(...batch);
        cursor = batch[batch.length - 1].id;
    }
    return rows;
};

const fetchAnalyticsQuestions = async (formId: number | null) => {
    if (!formId) return [];
    const { data, error } = await supabase
        .from('needs_assessment_questions')
        .select(QUESTION_COLUMNS)
        .eq('form_id', formId)
        .order('order_index');
    if (error) throw error;
    return data || [];
};

const fetchAnalyticsSubmissions = async (selectedFormId: number | null): Promise<any[]> => {
    if (!selectedFormId) return [];

    const subs = await collectAllRows(async (afterId, limit) => {
        const { data, error } = await supabase
            .from('needs_assessment_submissions')
            .select(SUBMISSION_COLUMNS)
            .eq('form_id', selectedFormId)
            .gt('id', afterId)
            .order('id', { ascending: true })
            .limit(limit);
        if (error) throw error;
        return data ?? [];
    }, 1000);

    const studentIds = [...new Set(subs.flatMap((s: any) => s.student_id ? [s.student_id] : []))];
    const studentMap: Record<string, any> = {};

    const idChunks: string[][] = [];
    for (let i = 0; i < studentIds.length; i += 500) idChunks.push(studentIds.slice(i, i + 500));

    const studentResults = await Promise.all(idChunks.map(chunk => supabase
        .from('students')
        .select('student_id, first_name, last_name, department, course, year_level, sex')
        .in('student_id', chunk)));

    for (const { data: students } of studentResults) {
        for (const student of students ?? []) studentMap[student.student_id] = student;
    }

    return (subs as any[]).map(sub => ({ ...sub, students: studentMap[sub.student_id] || {} }));
};

const fetchAnswerStats = async (formId: number | null, department: string, course: string): Promise<any[]> => {
    if (!formId) return [];
    const { data, error } = await supabase.rpc('needs_assessment_answer_stats', {
        p_form_id: formId,
        p_department: department === 'All' ? null : department,
        p_course: course === 'All' ? null : course
    });
    if (error) throw error;
    return (data as any[]) ?? [];
};

const fetchSubmissionAnswers = async (submissionId: number | null) => {
    if (!submissionId) return [];
    const { data, error } = await supabase
        .from('needs_assessment_answers')
        .select('question_id, answer_text, answer_value')
        .eq('submission_id', submissionId);
    if (error) throw error;
    return data ?? [];
};

const sortRespondents = (submissions: any[], sortConfig: { key: string; direction: string }) =>
    submissions.toSorted((a, b) => {
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

const CareStaffAnalyticsPage = ({ functions }: CareStaffAnalyticsPageProps) => {
    const queryClient = useQueryClient();
    const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
    const [compareFormId, setCompareFormId] = useState<number | null>(null);
    const [currentTab, setCurrentTab] = useState('Overview');
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [viewingStudent, setViewingStudent] = useState<any>(null);
    const [respondentSearch, setRespondentSearch] = useState('');
    const [respondentPage, setRespondentPage] = useState(1);
    const [topQuestionScoreFilter, setTopQuestionScoreFilter] = useState('5');
    const [isExporting, setIsExporting] = useState(false);

    const activeFilterLabel = useMemo(() => {
        if (departmentFilter === 'All' && courseFilter === 'All') {
            return 'All Colleges & Programs';
        }
        const parts = [];
        if (departmentFilter !== 'All') parts.push(`College: ${departmentFilter}`);
        if (courseFilter !== 'All') parts.push(`Course: ${courseFilter}`);
        return parts.join(' | ');
    }, [departmentFilter, courseFilter]);

    const { data: qForms } = useQuery({
        queryKey: ['analytics_forms'],
        queryFn: async () => {
            const { data, error } = await supabase.from('needs_assessment_forms').select(FORM_COLUMNS).order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });
    const forms = qForms || [];

    const { data: qDepartments } = useQuery({
        queryKey: ['departments_list_analytics'],
        queryFn: async () => {
            const { data, error } = await supabase.from('departments').select(DEPARTMENT_COLUMNS).order('name');
            if (error) throw error;
            return data || [];
        }
    });
    const allDepartments = qDepartments || [];

    const { data: qQuestions, isLoading: questionsLoading } = useQuery({
        queryKey: ['analytics_questions', selectedFormId],
        queryFn: () => fetchAnalyticsQuestions(selectedFormId),
        enabled: !!selectedFormId
    });

    const { data: qAnalyticsData, isLoading: analyticsLoading } = useQuery({
        queryKey: ['analytics_data', selectedFormId],
        queryFn: () => fetchAnalyticsSubmissions(selectedFormId),
        enabled: !!selectedFormId
    });

    const { data: qAnswerStats, isLoading: statsLoading } = useQuery({
        queryKey: ['analytics_answer_stats', selectedFormId, departmentFilter, courseFilter],
        queryFn: () => fetchAnswerStats(selectedFormId, departmentFilter, courseFilter),
        enabled: !!selectedFormId
    });

    const { data: qCompareQuestions } = useQuery({
        queryKey: ['analytics_questions', compareFormId],
        queryFn: () => fetchAnalyticsQuestions(compareFormId),
        enabled: !!compareFormId
    });

    const { data: qCompareData, isLoading: compareLoading } = useQuery({
        queryKey: ['analytics_data', compareFormId],
        queryFn: () => fetchAnalyticsSubmissions(compareFormId),
        enabled: !!compareFormId
    });

    const { data: qCompareStatRows } = useQuery({
        queryKey: ['analytics_answer_stats', compareFormId, 'All', 'All'],
        queryFn: () => fetchAnswerStats(compareFormId, 'All', 'All'),
        enabled: !!compareFormId
    });

    const questions = qQuestions ?? EMPTY_QUESTIONS;
    const submissions = qAnalyticsData ?? EMPTY_ROWS;
    const answerStatRows = qAnswerStats ?? EMPTY_ROWS;

    const loading = !qForms || !qDepartments
        || (!!selectedFormId && (analyticsLoading || questionsLoading || statsLoading))
        || (!!compareFormId && compareLoading);

    useEffect(() => {
        if (qForms && qForms.length > 0) {
            setSelectedFormId(current => qForms.some((form: any) => form.id === current) ? current : qForms[0].id);
        }
    }, [qForms]);

    const handleFormSelect = (id: number) => {
        setSelectedFormId(id);
        if (!sameLineageForms(forms, id).some((f: any) => f.id === compareFormId)) setCompareFormId(null);
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

    const filteredSubmissions = useMemo(() => {
        let subs = submissions as any[];
        if (departmentFilter && departmentFilter !== 'All') subs = subs.filter((s: any) => s.students?.department === departmentFilter);
        if (courseFilter && courseFilter !== 'All') subs = subs.filter((s: any) => s.students?.course === courseFilter);
        return subs;
    }, [submissions, departmentFilter, courseFilter]);

    const stats = useMemo(() => ({ total: filteredSubmissions.length }), [filteredSubmissions]);

    const handleSort = (key: string) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedRespondents = useMemo(
        () => sortRespondents(filteredSubmissions, sortConfig),
        [filteredSubmissions, sortConfig]
    );

    const courseOptions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const sub of submissions as any[]) {
            const course = sub.students?.course;
            if (course) counts.set(course, (counts.get(course) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [submissions]);

    const scaleQuestions = useMemo(
        () => questions.filter((q: any) => q.question_type !== 'text' && q.question_type !== 'open_ended'),
        [questions]
    );

    const compareStats = useMemo(() => {
        if (!compareFormId || !qCompareData || !qCompareQuestions || !qCompareStatRows) return null;
        const scale = qCompareQuestions.filter((q: any) => q.question_type !== 'text' && q.question_type !== 'open_ended');
        const byText = new Map<string, any>();
        for (const stat of buildQuestionStats(scale, qCompareStatRows)) {
            byText.set(normalizeQuestionText(stat.question.question_text), stat);
        }
        return { total: qCompareData.length, byText };
    }, [compareFormId, qCompareData, qCompareQuestions, qCompareStatRows]);

    const { questionStats, unmatchedCount } = useMemo(
        () => withComparisonDeltas(
            buildQuestionStats(scaleQuestions, answerStatRows),
            compareStats?.byText ?? null
        ),
        [scaleQuestions, answerStatRows, compareStats]
    );

    const compareForm = forms.find((f: any) => f.id === compareFormId);
    const compareOptions = useMemo(() => sameLineageForms(forms, selectedFormId), [forms, selectedFormId]);

    const handleExportPdf = async () => {
        if (!selectedFormId || questionStats.length === 0) {
            functions.showToast('No assessment data available to export.', 'error');
            return;
        }
        setIsExporting(true);
        try {
            const currentForm = forms.find((f: any) => f.id === selectedFormId);
            await exportNeedsAssessmentPdf({
                formTitle: currentForm?.title || 'Student Needs Assessment',
                filterLabel: activeFilterLabel,
                totalRespondents: filteredSubmissions.length,
                stats: questionStats,
                compareTitle: compareForm?.title
            });
            functions.showToast('Needs Assessment PDF report downloaded.', 'success');
        } catch (err) {
            console.error('Failed to export PDF:', err);
            functions.showToast('Failed to generate PDF report.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportExcel = async () => {
        if (!selectedFormId || questionStats.length === 0) {
            functions.showToast('No assessment data available to export.', 'error');
            return;
        }
        setIsExporting(true);
        try {
            const currentForm = forms.find((f: any) => f.id === selectedFormId);
            await exportNeedsAssessmentExcel({
                formTitle: currentForm?.title || 'Student Needs Assessment',
                filterLabel: activeFilterLabel,
                totalRespondents: filteredSubmissions.length,
                stats: questionStats,
                compareTitle: compareForm?.title
            });
            functions.showToast('Needs Assessment Excel spreadsheet downloaded.', 'success');
        } catch (err) {
            console.error('Failed to export Excel:', err);
            functions.showToast('Failed to generate Excel file.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative flex-1 flex flex-col min-h-0 h-full overflow-hidden gap-3.5">
            {/* 1. Header Row */}
            <AnalyticsHeader
                forms={forms}
                selectedFormId={selectedFormId}
                onFormSelect={handleFormSelect}
                onRefresh={handleRefreshData}
                isRefreshingData={isRefreshingData}
                onExportPdf={handleExportPdf}
                onExportExcel={handleExportExcel}
                isExporting={isExporting}
                totalCount={stats.total}
            />

            {/* 2. Stats Bar in White Card */}
            <AnalyticsStatsBar
                compareFormId={compareFormId}
                setCompareFormId={setCompareFormId}
                compareOptions={compareOptions}
                stats={stats}
                departmentFilter={departmentFilter}
                setDepartmentFilter={setDepartmentFilter}
                allDepartments={allDepartments}
            />

            {/* 3. Tab Strip with Icons & Purple Underline */}
            <div className="flex border-b border-slate-200 shrink-0 gap-6">
                {ANALYTICS_TABS.map(({ name, icon: Icon }) => {
                    const isActive = currentTab === name;
                    return (
                        <button
                            key={name}
                            type="button"
                            onClick={() => { setCurrentTab(name); setViewingStudent(null); }}
                            className={`flex items-center gap-2 pb-2.5 text-xs sm:text-sm font-bold transition-all relative ${isActive
                                ? 'text-purple-700'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            <Icon size={15} className={isActive ? 'text-purple-600' : 'text-slate-400'} />
                            <span>{name}</span>
                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 4. Tab Content Area (Viewport-locked & internally scrollable) */}
            {loading ? (
                <div className="space-y-4 flex-1">
                    <LoadingSkeleton type="stats" count={4} />
                    <LoadingSkeleton type="card" count={2} />
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* OVERVIEW TAB */}
                    {currentTab === 'Overview' && (
                        <OverviewTab
                            submissions={filteredSubmissions}
                            questionStats={questionStats}
                            topQuestionScoreFilter={topQuestionScoreFilter}
                            setTopQuestionScoreFilter={setTopQuestionScoreFilter}
                        />
                    )}

                    {/* QUESTIONS TAB */}
                    {currentTab === 'Questions' && (
                        <QuestionsTab
                            submissions={filteredSubmissions}
                            questionStats={questionStats}
                            compareTitle={compareForm?.title}
                            unmatchedCount={unmatchedCount}
                            onExportPdf={handleExportPdf}
                            onExportExcel={handleExportExcel}
                            isExporting={isExporting}
                        />
                    )}

                    {/* RESPONDENTS TAB */}
                    {currentTab === 'Respondents' && (
                        viewingStudent ? (
                            <RespondentDetail
                                student={viewingStudent}
                                questions={questions}
                                onBack={() => setViewingStudent(null)}
                            />
                        ) : (
                            <RespondentsTab
                                courseFilter={courseFilter}
                                setCourseFilter={setCourseFilter}
                                courseOptions={courseOptions}
                                respondents={sortedRespondents}
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                onViewStudent={setViewingStudent}
                                search={respondentSearch}
                                setSearch={setRespondentSearch}
                                page={respondentPage}
                                setPage={setRespondentPage}
                            />
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default CareStaffAnalyticsPage;
