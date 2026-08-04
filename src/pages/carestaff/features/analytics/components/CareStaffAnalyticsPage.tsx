import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { m, AnimatePresence } from 'framer-motion';
import {
    Users, Clock, Filter, ArrowUpDown, ArrowLeft, ChevronRight, Search,
    BarChart2, TrendingUp, RefreshCw, ChevronDown,
    Sparkles, Activity, FileBarChart
} from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import LoadingSkeleton from '../../../../../components/ui/LoadingSkeleton';
import PaginationControls from '../../../../../components/PaginationControls';
import QuestionChart from '../../../../../components/charts/QuestionChart';
import YearLevelChart from '../../../../../components/charts/YearLevelChart';
import TopQuestionsChart from '../../../../../components/charts/TopQuestionsChart';
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
/** Same ramp the bar charts use, so the inline bars and the expanded chart agree. */
const SCALE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'];

const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } }
} as const;
const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 28 } }
} as const;

/** Two forms never share question ids, so the only join between them is the
 *  question wording. Reworded questions simply will not pair up -- the
 *  Questions tab reports how many failed to match rather than hiding it. */
const normalizeQuestionText = (text: string) => (text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Other runs of the same assessment -- the duplicates of this form, its original,
 * and its siblings. Copies always store the root's id, so the whole family is
 * reachable without walking a chain. Unrelated forms are not offered: comparing
 * a needs assessment against an exit survey is noise, not a trend.
 */
export const sameLineageForms = (forms: any[], selectedFormId: number | null) => {
    const selected = forms.find((f) => f.id === selectedFormId);
    if (!selected) return [];
    const root = selected.source_form_id ?? selected.id;
    return forms.filter((f) => f.id !== selectedFormId && (f.id === root || f.source_form_id === root));
};

/** Pairs this form's question stats with the comparison form's by wording.
 *  `delta` is only set when both sides actually have answers; a matched question
 *  with no answers on either side keeps `priorAverage` so the row can say so. */
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
    { name: 'Overview', icon: Activity },
    { name: 'Questions', icon: Sparkles },
    { name: 'Respondents', icon: FileBarChart }
];

const displayAnswer = (answer?: any) => {
    if (!answer) return '';
    if (typeof answer.answer_value === 'number') return String(answer.answer_value);
    return answer.answer_text ?? '';
};

/**
 * Pivots the long-form rows the stats RPC returns -- one per (question, score) --
 * into a counts array per question, plus the derived total and mean.
 */
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

/** Drill-down inside the Respondents tab -- deliberately not a modal, so the
 *  staff keep the page chrome and can walk back to the list they came from. */
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
        <m.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden"
        >
            <div className="px-8 py-6 border-b border-slate-100/60 bg-slate-50/60 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h3 className="font-black text-lg text-slate-900">
                        {student.students?.last_name}, {student.students?.first_name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Submitted {new Date(student.submitted_at).toLocaleString()}
                    </p>
                </div>
                <m.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={onBack}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:border-purple-300 hover:text-purple-700 shadow-sm transition-colors"
                >
                    <ArrowLeft size={14} /> Back to list
                </m.button>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-8 py-5 border-b border-slate-100/60 text-xs">
                <div><dt className="font-black text-slate-400 uppercase tracking-widest">Student ID</dt><dd className="font-bold text-slate-900 mt-1">{student.students?.student_id || '—'}</dd></div>
                <div><dt className="font-black text-slate-400 uppercase tracking-widest">College</dt><dd className="font-bold text-slate-900 mt-1">{student.students?.department || '—'}</dd></div>
                <div><dt className="font-black text-slate-400 uppercase tracking-widest">Course</dt><dd className="font-bold text-slate-900 mt-1">{student.students?.course || '—'}</dd></div>
                <div><dt className="font-black text-slate-400 uppercase tracking-widest">Year Level</dt><dd className="font-bold text-slate-900 mt-1">{student.students?.year_level || '—'}</dd></div>
            </dl>

            <div className="px-8 py-6 space-y-3">
                {isLoading && <p className="py-8 text-center text-sm text-slate-400">Loading answers…</p>}
                {!isLoading && questions.map((q: any, idx: number) => {
                    const answer = displayAnswer(answersByQuestion.get(q.id));
                    const isScale = q.question_type !== 'text' && q.question_type !== 'open_ended';
                    return (
                        <div key={q.id} className="rounded-2xl border border-slate-200/70 p-5">
                            <p className="font-bold text-slate-800 text-sm leading-relaxed">
                                <span className="mr-2 text-slate-400">{idx + 1}.</span>{q.question_text}
                            </p>
                            {answer === '' ? (
                                <p className="mt-2 text-sm italic text-slate-400">Not answered</p>
                            ) : isScale ? (
                                <p className="mt-2 text-lg font-black text-purple-600">
                                    {answer}
                                    <span className="ml-1.5 text-xs font-semibold text-slate-400">of {q.scale_max ?? 5}</span>
                                </p>
                            ) : (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{answer}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </m.div>
    );
};

const sortHeaderClass = 'w-full cursor-pointer px-7 py-4 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500';

// search/page are owned by the page, not this component: opening a respondent
// unmounts this tab, and local state would drop the staff back to page 1 with
// the search cleared every time they came back from a drill-down.
const RespondentsTab = ({ courseFilter, setCourseFilter, courseOptions, respondents, sortConfig, onSort, onViewStudent, search, setSearch, page, setPage }: any) => {
    const tableRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return respondents;
        return respondents.filter((sub: any) =>
            `${sub.students?.first_name ?? ''} ${sub.students?.last_name ?? ''} ${sub.students?.student_id ?? ''}`
                .toLowerCase().includes(term)
        );
    }, [respondents, search]);

    // Clamp instead of resetting: a filter change that shortens the list should
    // not throw the staff back to page 1 when the current page still exists.
    const totalPages = Math.max(1, Math.ceil(filtered.length / RESPONDENTS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * RESPONDENTS_PER_PAGE;
    const visible = filtered.slice(pageStart, pageStart + RESPONDENTS_PER_PAGE);

    return (
        <m.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="space-y-6"
        >
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search name or ID"
                            aria-label="Search respondents by name or student ID"
                            className="w-56 rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                        />
                    </div>
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
                        <Filter size={14} className="text-purple-500" />
                        <div className="relative">
                            <select
                                aria-label="Filter respondents by course"
                                value={courseFilter}
                                onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
                                className="appearance-none max-w-[16rem] pl-1 pr-8 text-sm font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                            >
                                <option value="All">All Courses</option>
                                {courseOptions.map(([course, count]: [string, number]) => (
                                    <option key={course} value={course}>{course} ({count})</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <Users size={13} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-600">
                        {filtered.length === respondents.length ? `${filtered.length} students` : `${filtered.length} of ${respondents.length}`}
                    </span>
                </div>
            </div>

            {/* Respondents Table */}
            <div ref={tableRef} className="scroll-mt-4 bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200/60 text-[10px] uppercase text-slate-500 font-black tracking-widest">
                        <tr>
                            <th scope="col" aria-sort={sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0">
                                <button type="button" className={sortHeaderClass} onClick={() => onSort('name')}>
                                    Student Name <ArrowUpDown size={11} className="inline ml-1 text-purple-400" />
                                </button>
                            </th>
                            <th scope="col" aria-sort={sortConfig.key === 'course' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0">
                                <button type="button" className={sortHeaderClass} onClick={() => onSort('course')}>
                                    Course &amp; Year <ArrowUpDown size={11} className="inline ml-1 text-purple-400" />
                                </button>
                            </th>
                            <th scope="col" aria-sort={sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0">
                                <button type="button" className={sortHeaderClass} onClick={() => onSort('date')}>
                                    Date Submitted <ArrowUpDown size={11} className="inline ml-1 text-purple-400" />
                                </button>
                            </th>
                            <th scope="col" className="px-7 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                        {visible.map((sub: any) => (
                            <tr
                                key={sub.id}
                                onClick={() => onViewStudent(sub)}
                                className="cursor-pointer group transition-colors hover:bg-purple-50/60"
                            >
                                <td className="px-7 py-4">
                                    <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                        {sub.students?.last_name}, {sub.students?.first_name}
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                                        {sub.students?.student_id || 'ID Unknown'}
                                    </div>
                                </td>
                                <td className="max-w-[20rem] px-7 py-4">
                                    <div className="font-medium text-slate-700 truncate" title={sub.students?.course || undefined}>
                                        {sub.students?.course || 'Unknown Course'}
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{sub.students?.year_level}</div>
                                </td>
                                <td className="whitespace-nowrap px-7 py-4">
                                    <div className="font-medium text-slate-700">{new Date(sub.submitted_at).toLocaleDateString()}</div>
                                    <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                                        {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                                <td className="px-7 py-4 text-right">
                                    <span className="inline-flex items-center gap-1 text-purple-700 font-bold text-xs">
                                        View answers <ChevronRight size={13} />
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-7 py-20 text-center text-slate-400 font-medium italic">
                                    No responses found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {filtered.length > 0 && (
                    <PaginationControls
                        page={currentPage}
                        pageSize={RESPONDENTS_PER_PAGE}
                        total={filtered.length}
                        onPageChange={next => {
                            setPage(next);
                            // ponytail: instant jump, not smooth -- smooth would need its own
                            // prefers-reduced-motion check and you want the new rows now.
                            tableRef.current?.scrollIntoView({ block: 'start' });
                        }}
                    />
                )}
            </div>
        </m.div>
    );
};

const OverviewTab = ({ submissions, questionStats, topQuestionScoreFilter, setTopQuestionScoreFilter }: any) => (
                <m.div
                    
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    className="space-y-8"
                >
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <m.div
                            whileHover={{ scale: 1.01 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden"
                        >
                            <YearLevelChart submissions={submissions} />
                        </m.div>

                        <m.div
                            whileHover={{ scale: 1.01 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="relative bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden"
                        >
                            <div className="absolute top-5 right-5 z-10">
                                <div className="relative">
                                    <select
                                        aria-label="Top question score"
                                        value={topQuestionScoreFilter}
                                        onChange={e => setTopQuestionScoreFilter(e.target.value)}
                                        className="appearance-none pl-3 pr-8 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white shadow-sm focus:ring-purple-400 focus:border-purple-400 cursor-pointer"
                                    >
                                        {[5, 4, 3, 2, 1].map(score => <option key={score} value={score}>{score} Star{score !== 1 ? 's' : ''}</option>)}
                                    </select>
                                    <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <TopQuestionsChart stats={questionStats} scoreFilter={topQuestionScoreFilter} />
                        </m.div>
                    </div>

                </m.div>
);

/** One row per question: the distribution is drawn in CSS so all 40 render for
 *  free, and only the question the staff opens costs a Chart.js canvas. */
const QuestionRow = ({ stat, index, isOpen, onToggle }: any) => {
    const { question, counts, total, average, delta, priorAverage } = stat;
    return (
        <div className="border-b border-slate-100/80 last:border-0">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="w-full px-8 py-4 flex items-center gap-5 text-left hover:bg-purple-50/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
            >
                <span className="w-7 shrink-0 text-xs font-black text-slate-300 tabular-nums">{index + 1}</span>

                <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-slate-800 truncate">{question.question_text}</span>
                    <span className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                        {counts.map((count: number, i: number) => (
                            count > 0 && (
                                <span
                                    key={SCALE_COLORS[i]}
                                    style={{ width: `${(count / total) * 100}%`, backgroundColor: SCALE_COLORS[i] }}
                                />
                            )
                        ))}
                    </span>
                </span>

                <span className="w-16 shrink-0 text-right">
                    <span className="block text-lg font-black text-purple-600 tabular-nums leading-none">
                        {total === 0 ? '—' : average.toFixed(2)}
                    </span>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">avg</span>
                </span>

                {/* Only rendered while a comparison form is picked. A higher score is
                    a higher need, so a rise is flagged amber, not green. */}
                {priorAverage !== undefined && (
                    <span className="w-20 shrink-0 text-right" title={`${priorAverage.toFixed(2)} on the comparison form`}>
                        {delta === undefined ? (
                            <span className="text-[10px] font-bold text-slate-300">no data</span>
                        ) : (
                            <>
                                <span className={`block text-sm font-black tabular-nums leading-none ${Math.abs(delta) < 0.05 ? 'text-slate-400' : delta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                                </span>
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">vs</span>
                            </>
                        )}
                    </span>
                )}
                <span className="w-14 shrink-0 text-right text-xs font-bold text-slate-400 tabular-nums">n={total}</span>
                <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="px-8 pb-6">
                    <QuestionChart question={question} counts={counts} />
                </div>
            )}
        </div>
    );
};

const QuestionsTab = ({ submissions, questionStats, compareTitle, unmatchedCount }: any) => {
    const [openQuestionId, setOpenQuestionId] = useState<number | null>(null);

    return (
        <m.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden"
        >
            <div className="px-8 py-6 border-b border-slate-100/60 flex flex-wrap justify-between items-center gap-3 bg-slate-50/60">
                <div>
                    <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                        <Sparkles size={18} className="text-purple-500" /> Question Analysis
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Open a question to see its full breakdown. Bars run 1 (red) to 5 (green).
                    </p>
                    {compareTitle && (
                        <p className="text-xs text-slate-500 font-medium mt-1.5">
                            Comparing against <span className="font-bold text-purple-700">{compareTitle}</span>
                            {unmatchedCount > 0 && (
                                <span className="text-amber-600 font-bold"> — {unmatchedCount} question{unmatchedCount === 1 ? '' : 's'} had no match there (wording differs)</span>
                            )}
                        </p>
                    )}
                </div>
                <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                    N = {submissions.length}
                </span>
            </div>

            {questionStats.length === 0 ? (
                <p className="py-16 text-center text-slate-400 font-medium">No questions available for this form.</p>
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
        </m.div>
    );
};

/** Inline stat tiles: same cards, sized to sit in the filter band rather than
 *  eat a full row above it. Hover/stagger behaviour is unchanged. */
const AnalyticsKpiCards = ({ stats, compareStats, compareTitle }: any) => (
    <m.div variants={stagger} className="flex flex-wrap items-center gap-3">
        {/* Total Respondents */}
        <m.div
            variants={fadeUp}
            whileHover={{ scale: 1.02, y: -3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="relative overflow-hidden bg-white rounded-2xl border border-white/60 shadow-lg shadow-blue-500/5 ring-1 ring-slate-200/50 px-4 py-2.5 flex items-center gap-3"
        >
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
                <Users size={18} className="text-white" />
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Respondents</p>
                <p className="text-2xl font-black text-slate-900 leading-none mt-1.5">{stats.total}</p>
                {compareStats && (
                    <p
                        title={compareTitle ? `${compareStats.total} responded to ${compareTitle}` : undefined}
                        className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${stats.total >= compareStats.total ? 'text-emerald-600' : 'text-rose-500'}`}
                    >
                        <TrendingUp size={10} className={stats.total < compareStats.total ? 'rotate-180' : ''} />
                        {stats.total - compareStats.total > 0 ? '+' : ''}{stats.total - compareStats.total} vs {compareStats.total}
                    </p>
                )}
            </div>
        </m.div>

        {/* Avg Completion placeholder */}
        <m.div
            variants={fadeUp}
            whileHover={{ scale: 1.02, y: -3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="relative overflow-hidden bg-white rounded-2xl border border-white/60 shadow-lg shadow-violet-500/5 ring-1 ring-slate-200/50 px-4 py-2.5 flex items-center gap-3 opacity-75"
        >
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-violet-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
                <Clock size={18} className="text-white" />
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Avg. Completion</p>
                <p className="text-2xl font-black text-slate-900 leading-none mt-1.5">--</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium leading-none">Not tracked</p>
            </div>
        </m.div>
    </m.div>
);

const AnalyticsHeader = ({
    forms, selectedFormId, onFormSelect, onRefresh, isRefreshingData,
    compareFormId, setCompareFormId, compareStats, compareForm, compareOptions,
    departmentFilter, setDepartmentFilter, allDepartments, stats
}: any) => (
    <m.div variants={fadeUp} className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 p-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-5">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <BarChart2 size={22} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Analytics</h1>
                </div>
                <p className="text-slate-500 font-medium ml-14">Deep dive into student responses and trends.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                <m.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={onRefresh}
                    disabled={isRefreshingData}
                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 border border-slate-200 shadow-sm hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw size={15} className={isRefreshingData ? 'animate-spin text-purple-500' : ''} />
                    {isRefreshingData ? 'Refreshing…' : 'Refresh Data'}
                </m.button>

                <div className="relative">
                    <select
                        aria-label="Analytics form"
                        value={selectedFormId || ''}
                        onChange={e => onFormSelect(Number(e.target.value))}
                        className="appearance-none w-full sm:w-auto pl-4 pr-10 py-2.5 border border-purple-200 rounded-2xl font-bold text-purple-700 bg-purple-50 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-sm cursor-pointer shadow-sm"
                    >
                        {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                        {forms.length === 0 && <option>No Forms Available</option>}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none" />
                </div>
            </div>
        </div>

        {/* Filters + stats in one band, so the table starts above the fold */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60">
            <div className="flex flex-col gap-1.5">
                <label htmlFor="care-analytics-compare" className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Compare To</label>
                <div className="relative">
                    <select
                        id="care-analytics-compare"
                        value={compareFormId ?? ''}
                        onChange={e => setCompareFormId(e.target.value ? Number(e.target.value) : null)}
                        disabled={compareOptions.length === 0}
                        title={compareOptions.length === 0 ? 'Duplicate this form to run it again, then its runs can be compared here.' : undefined}
                        className={`appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 w-64 cursor-pointer border disabled:cursor-not-allowed disabled:opacity-60 ${compareFormId
                            ? 'bg-purple-50 border-purple-200 text-purple-700'
                            : 'bg-white border-slate-200 text-slate-600'
                            }`}
                    >
                        <option value="">{compareOptions.length === 0 ? 'No other runs yet' : 'No comparison'}</option>
                        {compareOptions.map((f: any) => (
                            <option key={f.id} value={f.id}>{f.title}</option>
                        ))}
                    </select>
                    <ChevronDown size={13} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${compareFormId ? 'text-purple-500' : 'text-slate-400'}`} />
                </div>
            </div>

            <AnalyticsKpiCards stats={stats} compareStats={compareStats} compareTitle={compareForm?.title} />

            <div className="flex flex-col gap-1.5 ml-auto">
                <label htmlFor="care-analytics-department" className="text-[11px] font-black text-slate-500 uppercase tracking-widest">College Filter</label>
                <div className="relative">
                    <select
                        id="care-analytics-department"
                        value={departmentFilter}
                        onChange={e => setDepartmentFilter(e.target.value)}
                        className="appearance-none pl-4 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white shadow-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 w-52 cursor-pointer"
                    >
                        <option value="All">All Colleges</option>
                        {allDepartments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>
        </div>
    </m.div>
);

/**
 * Reads every row of a table in id order, a page at a time.
 *
 * Two things this works around. PostgREST caps a response at the server's
 * db-max-rows whatever limit the client asks for, which is how the respondent
 * total silently pinned itself at exactly 1000. And `offset` paging is not an
 * option here: offsetting into a query that embeds answers makes Postgres build
 * and throw away every earlier row, which tripped the statement timeout and
 * returned 500 on the second page.
 *
 * So it walks a cursor -- `id > lastSeen` -- which is an index seek, costing the
 * same for the last page as the first. Only an empty page ends the walk; a short
 * page just means the server capped it, and the cursor still points at real work.
 */
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

    // No answers here on purpose. Counting them is the RPC's job now; this query
    // only carries what the respondent list and the year-level chart need, which
    // is why it is four narrow columns instead of ~40 answer rows per student.
    //
    // ponytail: still every submission, not just the visible page -- the list
    // sorts, searches and filters client-side. Narrow rows make that cheap into
    // the low thousands; past that, move the list server-side too.
    const subs = await collectAllRows(async (afterId, limit) => {
        const { data, error } = await supabase
            .from('needs_assessment_submissions')
            .select(SUBMISSION_COLUMNS)
            .eq('form_id', selectedFormId)
            // Cursor + matching order: the ordering is what makes `id > afterId`
            // a correct page boundary rather than an arbitrary filter. `offset`
            // paging timed out here once answers were involved.
            .gt('id', afterId)
            .order('id', { ascending: true })
            .limit(limit);
        if (error) throw error;
        return data ?? [];
    }, 1000);

    const studentIds = [...new Set(subs.flatMap((s: any) => s.student_id ? [s.student_id] : []))];
    const studentMap: Record<string, any> = {};

    // Chunked, and each chunk stays under the row cap: one `in` filter holding
    // every id would both truncate at the cap -- blanking the name and course of
    // every respondent past it -- and risk an over-long request URL.
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

/** Per-question, per-score counts from the database instead of from every answer
 *  row. Filters are passed down so the tally is narrowed server-side too. */
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

/** One respondent's answers, fetched when their row is opened. ~40 rows on
 *  demand, rather than everyone's answers up front on the chance one is read. */
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

    // Keyed on the filters as well: the tally happens server-side, so narrowing to
    // a department is a new (small) query rather than a re-count in the browser.
    const { data: qAnswerStats, isLoading: statsLoading } = useQuery({
        queryKey: ['analytics_answer_stats', selectedFormId, departmentFilter, courseFilter],
        queryFn: () => fetchAnswerStats(selectedFormId, departmentFilter, courseFilter),
        enabled: !!selectedFormId
    });

    // Same query keys as the selected form, so picking a comparison form you have
    // already viewed is served straight from cache.
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

    // The comparison form is deliberately unfiltered -- see compareStats below.
    const { data: qCompareStatRows } = useQuery({
        queryKey: ['analytics_answer_stats', compareFormId, 'All', 'All'],
        queryFn: () => fetchAnswerStats(compareFormId, 'All', 'All'),
        enabled: !!compareFormId
    });
    // Stable empty arrays, not fresh `[]`: the stats memos hang off these
    // identities, and re-pivoting on every render is the cost they exist to avoid.
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
        // Drop a comparison that is not a run of the newly selected form -- that
        // also covers picking the form currently being compared against.
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

    // Only the respondent list and the year-level chart are filtered here; the
    // per-question tallies are filtered by the RPC, which is why departmentFilter
    // and courseFilter are part of its query key.
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

    // Counted like the attendees list, so a course says how many rows it leaves
    // behind before it is picked.
    const courseOptions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const sub of submissions as any[]) {
            const course = sub.students?.course;
            if (course) counts.set(course, (counts.get(course) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [submissions]);

    // Text answers have no 1-5 value, so they would only plot empty bars.
    const scaleQuestions = useMemo(
        () => questions.filter((q: any) => q.question_type !== 'text' && q.question_type !== 'open_ended'),
        [questions]
    );
    // The comparison form is deliberately NOT department/course filtered -- those
    // filters describe the current cohort, and silently applying them to another
    // form's roster is what made the old period comparison misleading.
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

    return (
        <m.div variants={stagger} initial="hidden" animate="show" className="space-y-5 pb-10">

            {/* ── HEADER BENTO ── */}
            <AnalyticsHeader
                forms={forms}
                selectedFormId={selectedFormId}
                onFormSelect={handleFormSelect}
                onRefresh={handleRefreshData}
                isRefreshingData={isRefreshingData}
                compareFormId={compareFormId}
                setCompareFormId={setCompareFormId}
                compareStats={compareStats}
                compareForm={compareForm}
                compareOptions={compareOptions}
                departmentFilter={departmentFilter}
                setDepartmentFilter={setDepartmentFilter}
                allDepartments={allDepartments}
                stats={stats}
            />

            {/* ── TAB BAR ── */}
            <m.div variants={fadeUp} className="flex gap-2 bg-slate-100/70 backdrop-blur-sm p-1.5 rounded-2xl w-fit">
                {ANALYTICS_TABS.map(({ name, icon: Icon }) => (
                    <m.button
                        key={name}
                        onClick={() => { setCurrentTab(name); setViewingStudent(null); }}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className={`relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${currentTab === name
                            ? 'bg-white text-purple-700 shadow-md shadow-slate-200/80'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Icon size={13} className="inline mr-1.5 mb-0.5" />
                        {name}
                    </m.button>
                ))}
            </m.div>

            {/* ── CONTENT AREA ── */}
            {loading ? (
                <m.div variants={fadeUp} className="space-y-8">
                    <LoadingSkeleton type="stats" count={4} />
                    <LoadingSkeleton type="card" count={2} />
                </m.div>
            ) : (
                <AnimatePresence mode="wait">
                    {/* OVERVIEW TAB */}
                    {currentTab === 'Overview' && (
                        <OverviewTab
                            key="overview"
                            submissions={filteredSubmissions}
                            questionStats={questionStats}
                            topQuestionScoreFilter={topQuestionScoreFilter}
                            setTopQuestionScoreFilter={setTopQuestionScoreFilter}
                        />
                    )}

                    {/* QUESTIONS TAB */}
                    {currentTab === 'Questions' && (
                        <QuestionsTab
                            key="questions"
                            submissions={filteredSubmissions}
                            questionStats={questionStats}
                            compareTitle={compareForm?.title}
                            unmatchedCount={unmatchedCount}
                        />
                    )}

                    {/* RESPONDENTS TAB — list, or the drill-down for one respondent */}
                    {currentTab === 'Respondents' && (viewingStudent ? (
                        <RespondentDetail
                            key="respondent-detail"
                            student={viewingStudent}
                            questions={questions}
                            onBack={() => setViewingStudent(null)}
                        />
                    ) : (
                        <RespondentsTab
                            key="respondents"
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
                    ))}
                </AnimatePresence>
            )}
        </m.div>
    );
};

export default CareStaffAnalyticsPage;
