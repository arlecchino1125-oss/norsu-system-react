import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, Download, Users, XCircle } from 'lucide-react';

import { Button } from '../../../../../components/ui/Button';
import PaginationControls from '../../../../../components/PaginationControls';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { formatDate, toTitleCase } from '../../../../../utils/formatters';
import { computeGenderDemographics } from '../../analytics/utils/needsAssessmentExport';
import {
    getEvaluationResults,
    type EvaluationAnswer,
    type EvaluationForm,
    type EvaluationQuestion,
    type EvaluationResponse
} from '../eventEvaluationService';

interface EventEvaluationResultsModalProps {
    open: boolean;
    onClose: () => void;
    formId: number;
    eventTitle: string;
    eventDate?: string | null;
    isPeerEvent?: boolean;
    showToast: (message: string, type?: string) => void;
}

type AnswerRow = EvaluationAnswer & { response_id: number };

const ITEMS_PER_PAGE = 20;

const IDENTITY_HEADERS = ['Student ID', 'Name', 'Sex Assigned at Birth', 'Gender Identity', 'College', 'Course', 'Year', 'Submitted'];

const selectClass =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200';

const displayAnswer = (answer?: AnswerRow) => {
    if (!answer) return '';
    if (typeof answer.answer_value === 'number') return String(answer.answer_value);
    return answer.answer_text ?? '';
};

export default function EventEvaluationResultsModal({
    open,
    onClose,
    formId,
    eventTitle,
    eventDate,
    isPeerEvent = false,
    showToast
}: EventEvaluationResultsModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState<EvaluationForm | null>(null);
    const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
    const [responses, setResponses] = useState<EvaluationResponse[]>([]);
    const [answers, setAnswers] = useState<AnswerRow[]>([]);

    const [selected, setSelected] = useState<EvaluationResponse | null>(null);
    const [search, setSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [genderFilter, setGenderFilter] = useState('All');
    const [showDemographics, setShowDemographics] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!open || !formId) return;
        let isCurrent = true;
        void (async () => {
            setIsLoading(true);
            try {
                const data = await getEvaluationResults(formId);
                if (!isCurrent) return;
                setForm(data.form);
                setQuestions(data.questions);
                setResponses(data.responses);
                setAnswers(data.answers);
            } catch {
                if (isCurrent) showToast('Could not load evaluation results.', 'error');
            } finally {
                if (isCurrent) setIsLoading(false);
            }
        })();
        return () => { isCurrent = false; };
    }, [open, formId, showToast]);

    const resetFilters = useCallback(() => {
        setDepartmentFilter('All');
        setCourseFilter('All');
        setYearFilter('All');
        setGenderFilter('All');
        setSearch('');
        setPage(1);
    }, []);

    const handleClose = useCallback(() => {
        setSelected(null);
        resetFilters();
        onClose();
    }, [onClose, resetFilters]);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, handleClose]);

    const demographics = useMemo(() => computeGenderDemographics(responses), [responses]);

    const options = useMemo(() => {
        const tally = (key: keyof EvaluationResponse) => {
            const counts = new Map<string, number>();
            for (const row of responses) {
                const value = row[key];
                if (!value) continue;
                counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
            }
            return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        };
        return { departments: tally('department'), courses: tally('course'), years: tally('year_level') };
    }, [responses]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return responses.filter((row) => {
            if (departmentFilter !== 'All' && row.department !== departmentFilter) return false;
            if (courseFilter !== 'All' && row.course !== courseFilter) return false;
            if (yearFilter !== 'All' && row.year_level !== yearFilter) return false;
            if (genderFilter !== 'All') {
                const rowSex = String(row.sex || '').trim().toLowerCase();
                const rowGender = String(row.gender_identity || '').trim().toLowerCase();
                const target = genderFilter.toLowerCase();
                if (target === 'female') {
                    if (rowSex !== 'female' && rowSex !== 'f') return false;
                } else if (target === 'male') {
                    if (rowSex !== 'male' && rowSex !== 'm') return false;
                } else if (target === 'other') {
                    if (rowSex === 'female' || rowSex === 'f' || rowSex === 'male' || rowSex === 'm') return false;
                } else if (!rowGender.includes(target) && !rowSex.includes(target)) {
                    return false;
                }
            }
            if (!term) return true;
            return `${row.student_name ?? ''} ${row.student_id ?? ''}`.toLowerCase().includes(term);
        });
    }, [responses, departmentFilter, courseFilter, yearFilter, genderFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    const answersByResponse = useMemo(() => {
        const map = new Map<number, Map<number, AnswerRow>>();
        for (const answer of answers) {
            let row = map.get(answer.response_id);
            if (!row) { row = new Map(); map.set(answer.response_id, row); }
            row.set(answer.question_id, answer);
        }
        return map;
    }, [answers]);

    const orderedQuestions = useMemo(
        () => [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
        [questions]
    );

    const hasFilters = departmentFilter !== 'All' || courseFilter !== 'All' || yearFilter !== 'All' || genderFilter !== 'All' || search.trim() !== '';

    /** Export carries the full answers the table deliberately hides -- the screen
     *  is for finding a student, the spreadsheet is for reading everyone at once. */
    const handleExport = async () => {
        try {
            const headers = [...IDENTITY_HEADERS, ...orderedQuestions.map((q) => q.question_text)];
            const rows = filtered.map((response) => {
                const row = answersByResponse.get(response.id);
                return [
                    response.student_id,
                    response.student_name ?? '',
                    response.sex ?? '',
                    response.gender_identity ?? '',
                    response.department ?? '',
                    response.course ?? '',
                    response.year_level ?? '',
                    new Date(response.submitted_at).toLocaleString(),
                    ...orderedQuestions.map((question) => displayAnswer(row?.get(question.id)))
                ];
            });
            await exportToExcel(headers, rows, `${eventTitle} Evaluation`);
        } catch {
            showToast('Could not export the results.', 'error');
        }
    };

    const selectedAnswers = selected ? answersByResponse.get(selected.id) : undefined;

    if (!open) return null;

    return createPortal((
        <div className="absolute inset-x-0 bottom-0 top-[4.25rem] z-20 flex bg-black/30 p-2 backdrop-blur-sm sm:p-3">
            <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header matching Attendees List */}
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-4 sm:px-6">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900">
                            {selected ? (toTitleCase(selected.student_name) || selected.student_id) : (form?.title || 'Evaluation Responses')}
                        </h3>
                        <p className="truncate text-xs text-gray-500">
                            {selected ? (
                                `${selected.course ?? ''}${selected.year_level ? ` — ${selected.year_level}` : ''}`
                            ) : (
                                `${eventTitle}${eventDate ? ` · Event date: ${formatDate(eventDate)}` : ''}`
                            )}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <dl className="hidden sm:flex items-center gap-x-4 text-xs text-right mr-1">
                            {isPeerEvent && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Peer Facilitators Only
                                </span>
                            )}
                            <div>
                                <dt className="font-semibold text-slate-400 text-[11px]">Event date</dt>
                                <dd className="font-bold text-slate-700">{formatDate(eventDate)}</dd>
                            </div>
                            <div>
                                <dt className="font-semibold text-slate-400 text-[11px]">Evaluation created</dt>
                                <dd className="font-bold text-slate-700">{formatDate(form?.created_at)}</dd>
                            </div>
                        </dl>
                        {selected ? (
                            <Button variant="secondary" size="sm" onClick={() => setSelected(null)} leftIcon={<ArrowLeft size={14} />}>
                                Back to list
                            </Button>
                        ) : (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleExport}
                                disabled={filtered.length === 0}
                                leftIcon={<Download size={14} />}
                                aria-label={hasFilters ? `Export ${filtered.length} filtered` : 'Export all'}
                            >
                                Export {hasFilters ? `${filtered.length} filtered` : 'Excel'}
                            </Button>
                        )}
                        <button type="button" aria-label="Close" onClick={handleClose}>
                            <XCircle className="text-gray-400 hover:text-gray-600" />
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div role="status" aria-label="Loading responses" className="flex flex-1 flex-col animate-pulse">
                        <div aria-hidden="true" className="space-y-3 border-b border-gray-100 bg-gray-50/70 p-4 sm:px-6">
                            <div className="flex gap-2">
                                <div className="h-6 w-16 rounded-full bg-slate-200" />
                                <div className="h-6 w-24 rounded-full bg-slate-200" />
                                <div className="h-6 w-20 rounded-full bg-slate-200" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-9 rounded-lg bg-slate-200" />)}
                            </div>
                        </div>
                        <div aria-hidden="true" className="flex-1">
                            <div className="grid grid-cols-5 gap-4 bg-slate-50 px-6 py-3.5 border-b border-slate-200">
                                {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-3 rounded bg-slate-200" />)}
                            </div>
                            {Array.from({ length: 8 }, (_, row) => (
                                <div key={row} className="grid grid-cols-5 gap-4 border-b border-gray-100 px-6 py-4">
                                    {Array.from({ length: 5 }, (_, column) => <div key={column} className="h-4 rounded bg-slate-100" />)}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : selected ? (
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
                        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs sm:grid-cols-3 lg:grid-cols-6">
                            <div><dt className="font-semibold text-gray-400">Student ID</dt><dd className="font-bold text-gray-900">{selected.student_id}</dd></div>
                            <div><dt className="font-semibold text-gray-400">Sex</dt><dd className="font-bold text-gray-900">{selected.sex || '—'}</dd></div>
                            <div><dt className="font-semibold text-gray-400">Gender Identity</dt><dd className="font-bold text-gray-900">{selected.gender_identity || '—'}</dd></div>
                            <div><dt className="font-semibold text-gray-400">College</dt><dd className="font-bold text-gray-900">{selected.department || '—'}</dd></div>
                            <div><dt className="font-semibold text-gray-400">Course</dt><dd className="font-bold text-gray-900">{selected.course || '—'}</dd></div>
                            <div><dt className="font-semibold text-gray-400">Submitted</dt><dd className="font-bold text-gray-900">{new Date(selected.submitted_at).toLocaleString()}</dd></div>
                        </dl>

                        {orderedQuestions.map((question, index) => {
                            const answer = displayAnswer(selectedAnswers?.get(question.id));
                            return (
                                <div key={question.id} className="rounded-xl border border-gray-200 p-4">
                                    <p className="text-sm font-bold text-gray-900">
                                        <span className="mr-2 text-gray-400">{index + 1}.</span>{question.question_text}
                                    </p>
                                    {answer === '' ? (
                                        <p className="mt-2 text-sm italic text-gray-400">Not answered</p>
                                    ) : question.question_type === 'scale' ? (
                                        <p className="mt-2 text-lg font-black text-purple-600">
                                            {answer}
                                            <span className="ml-1 text-xs font-semibold text-gray-400">of {question.scale_max}</span>
                                        </p>
                                    ) : (
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{answer}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : responses.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-400">No students have submitted this evaluation yet.</p>
                ) : (
                    <>
                        {/* Stats + filters matching Attendees List */}
                        <div className="space-y-3 border-b border-gray-100 bg-gray-50/70 p-4 sm:px-6">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 font-bold text-blue-700">{responses.length} Total</span>
                                <span className="rounded-full bg-rose-100 px-2.5 py-1 font-bold text-rose-700">{demographics.sexCounts.female} Female</span>
                                <span className="rounded-full bg-sky-100 px-2.5 py-1 font-bold text-sky-700">{demographics.sexCounts.male} Male</span>
                                {demographics.genderCounts.cisgender > 0 && (
                                    <span className="rounded-full bg-purple-100 px-2.5 py-1 font-bold text-purple-700">{demographics.genderCounts.cisgender} CIS Gender</span>
                                )}
                                {demographics.genderCounts.transgender > 0 && (
                                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-bold text-indigo-700">{demographics.genderCounts.transgender} Transgender</span>
                                )}
                                <button
                                    type="button"
                                    aria-label="Respondent Demographics"
                                    onClick={() => setShowDemographics((prev) => !prev)}
                                    className="ml-auto inline-flex items-center gap-1 font-bold text-purple-600 hover:text-purple-700"
                                >
                                    <Users size={12} />
                                    <span>Demographics</span>
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${showDemographics ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {showDemographics && (
                                <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
                                    {/* Sex Assigned at Birth */}
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sex Assigned at Birth</p>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            <div className="flex items-center justify-between rounded-xl border border-rose-100/80 bg-rose-50/60 p-2.5">
                                                <div>
                                                    <p className="text-[11px] font-semibold text-slate-600">Female</p>
                                                    <p className="mt-0.5 text-sm font-black tabular-nums leading-tight text-rose-700">
                                                        {demographics.sexCounts.female.toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className="rounded-md border border-rose-100 bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-rose-600/80">
                                                    {demographics.total > 0 ? ((demographics.sexCounts.female / demographics.total) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-xl border border-sky-100/80 bg-sky-50/60 p-2.5">
                                                <div>
                                                    <p className="text-[11px] font-semibold text-slate-600">Male</p>
                                                    <p className="mt-0.5 text-sm font-black tabular-nums leading-tight text-sky-700">
                                                        {demographics.sexCounts.male.toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className="rounded-md border border-sky-100 bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-sky-600/80">
                                                    {demographics.total > 0 ? ((demographics.sexCounts.male / demographics.total) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                            {demographics.sexCounts.other > 0 && (
                                                <div className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 sm:col-span-1">
                                                    <div>
                                                        <p className="text-[11px] font-semibold text-slate-600">Other / Unset</p>
                                                        <p className="mt-0.5 text-sm font-black tabular-nums leading-tight text-slate-700">
                                                            {demographics.sexCounts.other.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                                        {demographics.total > 0 ? ((demographics.sexCounts.other / demographics.total) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Gender Identity */}
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender Identity</p>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            <div className="flex items-center justify-between rounded-xl border border-purple-100/80 bg-purple-50/60 p-2.5">
                                                <div className="min-w-0">
                                                    <p className="truncate text-[11px] font-semibold text-slate-600" title="CIS Gender">CIS Gender</p>
                                                    <p className="mt-0.5 text-sm font-black tabular-nums leading-tight text-purple-700">
                                                        {demographics.genderCounts.cisgender.toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className="ml-1 shrink-0 rounded-md border border-purple-100 bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-purple-600/80">
                                                    {demographics.total > 0 ? ((demographics.genderCounts.cisgender / demographics.total) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-xl border border-indigo-100/80 bg-indigo-50/60 p-2.5">
                                                <div className="min-w-0">
                                                    <p className="truncate text-[11px] font-semibold text-slate-600" title="Transgender">Transgender</p>
                                                    <p className="mt-0.5 text-sm font-black tabular-nums leading-tight text-indigo-700">
                                                        {demographics.genderCounts.transgender.toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className="ml-1 shrink-0 rounded-md border border-indigo-100 bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600/80">
                                                    {demographics.total > 0 ? ((demographics.genderCounts.transgender / demographics.total) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-xl border border-amber-100/80 bg-amber-50/60 p-2.5">
                                                <div className="min-w-0">
                                                    <p className="truncate text-[11px] font-semibold text-slate-600" title="Non-binary gender">Non-binary</p>
                                                    <p className="mt-0.5 text-sm font-black tabular-nums leading-tight text-amber-700">
                                                        {demographics.genderCounts.nonBinary.toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className="ml-1 shrink-0 rounded-md border border-amber-100 bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-600/80">
                                                    {demographics.total > 0 ? ((demographics.genderCounts.nonBinary / demographics.total) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                            {demographics.genderCounts.preferNotToSay > 0 && (
                                                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-2.5">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[11px] font-semibold text-slate-600" title="Prefer not to say">Prefer not to say</p>
                                                        <p className="mt-0.5 text-sm font-black tabular-nums leading-tight text-slate-700">
                                                            {demographics.genderCounts.preferNotToSay.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <span className="ml-1 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                                        {demographics.total > 0 ? ((demographics.genderCounts.preferNotToSay / demographics.total) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </div>
                                            )}
                                            {demographics.genderCounts.other > 0 && (
                                                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-2.5">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[11px] font-semibold text-slate-600" title="Other">Other</p>
                                                        <p className="mt-0.5 text-sm font-black tabular-nums leading-tight text-slate-700">
                                                            {demographics.genderCounts.other.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <span className="ml-1 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                                        {demographics.total > 0 ? ((demographics.genderCounts.other / demographics.total) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Responsive Filters Grid */}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                <input
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Search name or ID…"
                                    aria-label="Search respondents by name or ID"
                                    className="col-span-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200 sm:col-span-1"
                                />
                                <select
                                    aria-label="Filter by department"
                                    value={departmentFilter}
                                    onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
                                    className={selectClass}
                                >
                                    <option value="All">All Colleges ({responses.length})</option>
                                    {options.departments.map(([value, count]) => (
                                        <option key={value} value={value}>{value} ({count})</option>
                                    ))}
                                </select>
                                <select
                                    aria-label="Filter by year level"
                                    value={yearFilter}
                                    onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
                                    className={selectClass}
                                >
                                    <option value="All">All Years</option>
                                    {options.years.map(([value, count]) => (
                                        <option key={value} value={value}>{value} ({count})</option>
                                    ))}
                                </select>
                                <select
                                    aria-label="Filter by course"
                                    value={courseFilter}
                                    onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}
                                    className={selectClass}
                                >
                                    <option value="All">All Courses</option>
                                    {options.courses.map(([value, count]) => (
                                        <option key={value} value={value}>{value} ({count})</option>
                                    ))}
                                </select>
                                <select
                                    aria-label="Filter by gender"
                                    value={genderFilter}
                                    onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
                                    className={selectClass}
                                >
                                    <option value="All">All Genders</option>
                                    <option value="Female">Female ({demographics.sexCounts.female})</option>
                                    <option value="Male">Male ({demographics.sexCounts.male})</option>
                                    {demographics.genderCounts.cisgender > 0 && <option value="CIS Gender">CIS Gender ({demographics.genderCounts.cisgender})</option>}
                                    {demographics.genderCounts.transgender > 0 && <option value="Transgender">Transgender ({demographics.genderCounts.transgender})</option>}
                                    {demographics.genderCounts.nonBinary > 0 && <option value="Non-binary">Non-binary ({demographics.genderCounts.nonBinary})</option>}
                                    {demographics.genderCounts.preferNotToSay > 0 && <option value="Prefer not to say">Prefer not to say ({demographics.genderCounts.preferNotToSay})</option>}
                                    {demographics.genderCounts.other > 0 && <option value="Other">Other ({demographics.genderCounts.other})</option>}
                                </select>
                            </div>

                            {hasFilters && (
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>Showing {filtered.length} of {responses.length}</span>
                                    <button type="button" onClick={resetFilters} className="font-bold text-purple-600 hover:text-purple-700">Clear filters</button>
                                </div>
                            )}
                        </div>

                        {/* Table Card matching Attendees List */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                            <th scope="col" className="px-6 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                                Student Name
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                                Gender
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                                Course &amp; Year
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                                Date Submitted
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pageItems.map((response) => (
                                            <tr
                                                key={response.id}
                                                onClick={() => setSelected(response)}
                                                className="cursor-pointer group transition-colors hover:bg-purple-50/40"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                                        {toTitleCase(response.student_name, '—')}
                                                    </div>
                                                    <div className="font-mono text-[11px] text-slate-400 mt-0.5 font-medium">
                                                        {response.student_id || 'ID Unknown'}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                                            response.sex?.toLowerCase() === 'female'
                                                                ? 'bg-rose-50 text-rose-700 border-rose-100/60'
                                                                : response.sex?.toLowerCase() === 'male'
                                                                ? 'bg-sky-50 text-sky-700 border-sky-100/60'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}>
                                                            {response.sex || 'Sex —'}
                                                        </span>
                                                        {response.gender_identity && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-semibold text-purple-700 border border-purple-100/60">
                                                                {response.gender_identity}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="max-w-[20rem] px-6 py-4">
                                                    <div className="font-medium text-slate-800 truncate" title={response.course ?? undefined}>
                                                        {response.course || 'Unknown Course'}
                                                    </div>
                                                    <div className="text-[10.5px] font-bold text-purple-700 mt-0.5 uppercase tracking-wider">
                                                        {response.year_level || 'YEAR NOT SET'}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="font-semibold text-slate-800">{new Date(response.submitted_at).toLocaleDateString()}</div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                                        {new Date(response.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 text-purple-600 font-bold text-xs group-hover:underline">
                                                        View answers <span aria-hidden="true">&rarr;</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-medium">
                                                    {hasFilters ? 'No responses found matching your search or filters.' : 'No responses yet.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filtered.length > 0 && (
                                <PaginationControls
                                    page={safePage}
                                    pageSize={ITEMS_PER_PAGE}
                                    total={filtered.length}
                                    onPageChange={setPage}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    ), document.getElementById('staff-content-region') || document.body);
}
