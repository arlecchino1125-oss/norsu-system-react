import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Download, Search } from 'lucide-react';

import Modal from '../../../../../components/ui/Modal';
import { Button } from '../../../../../components/ui/Button';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
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
    showToast: (message: string, type?: string) => void;
}

type AnswerRow = EvaluationAnswer & { response_id: number };

const IDENTITY_HEADERS = ['Student ID', 'Name', 'Department', 'Course', 'Year', 'Submitted'];

const selectClass =
    'rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200';

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
    showToast
}: EventEvaluationResultsModalProps) {
    const [form, setForm] = useState<EvaluationForm | null>(null);
    const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
    const [responses, setResponses] = useState<EvaluationResponse[]>([]);
    const [answers, setAnswers] = useState<AnswerRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [selected, setSelected] = useState<EvaluationResponse | null>(null);

    useEffect(() => {
        if (!open) return;
        let active = true;

        const load = async () => {
            setIsLoading(true);
            try {
                const result = await getEvaluationResults(formId);
                if (!active) return;
                setForm(result.form);
                setQuestions(result.questions);
                setResponses(result.responses);
                setAnswers(result.answers as AnswerRow[]);
            } catch {
                if (active) showToast('Could not load evaluation results.', 'error');
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [open, formId, showToast]);

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
            if (!term) return true;
            return `${row.student_name ?? ''} ${row.student_id ?? ''}`.toLowerCase().includes(term);
        });
    }, [responses, departmentFilter, courseFilter, yearFilter, search]);

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

    const hasFilters = departmentFilter !== 'All' || courseFilter !== 'All' || yearFilter !== 'All' || search.trim() !== '';

    const resetFilters = () => {
        setDepartmentFilter('All');
        setCourseFilter('All');
        setYearFilter('All');
        setSearch('');
    };

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

    const handleClose = () => {
        setSelected(null);
        resetFilters();
        onClose();
    };

    const selectedAnswers = selected ? answersByResponse.get(selected.id) : undefined;

    return (
        <Modal
            open={open}
            onClose={handleClose}
            size="full"
            title={selected ? (selected.student_name ?? selected.student_id) : (form?.title || 'Evaluation Results')}
            subtitle={
                selected
                    ? `${selected.course ?? ''}${selected.year_level ? ` — ${selected.year_level}` : ''}`
                    : (form?.description || eventTitle)
            }
            footer={
                selected ? (
                    <Button variant="secondary" onClick={() => setSelected(null)} leftIcon={<ArrowLeft size={14} />}>
                        Back to list
                    </Button>
                ) : (
                    <>
                        <Button variant="secondary" onClick={handleClose}>Close</Button>
                        <Button variant="primary" onClick={handleExport} disabled={filtered.length === 0} leftIcon={<Download size={14} />}>
                            Export {hasFilters ? `${filtered.length} filtered` : 'all'}
                        </Button>
                    </>
                )
            }
        >
            {isLoading ? (
                <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
            ) : selected ? (
                <div className="space-y-3">
                    <dl className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs sm:grid-cols-4">
                        <div><dt className="font-semibold text-gray-400">Student ID</dt><dd className="font-bold text-gray-900">{selected.student_id}</dd></div>
                        <div><dt className="font-semibold text-gray-400">Department</dt><dd className="font-bold text-gray-900">{selected.department || '—'}</dd></div>
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
                <p className="py-10 text-center text-sm text-gray-400">No students have submitted this evaluation yet.</p>
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name or ID"
                                aria-label="Search respondents by name or ID"
                                className="w-48 rounded-lg border border-gray-200 py-1.5 pl-7 pr-2.5 text-xs font-semibold text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                            />
                        </div>
                        <select aria-label="Filter by department" className={`${selectClass} max-w-[14rem]`} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                            <option value="All">All departments</option>
                            {options.departments.map(([value, count]) => <option key={value} value={value}>{value} ({count})</option>)}
                        </select>
                        <select aria-label="Filter by course" className={`${selectClass} max-w-[16rem]`} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                            <option value="All">All courses</option>
                            {options.courses.map(([value, count]) => <option key={value} value={value}>{value} ({count})</option>)}
                        </select>
                        <select aria-label="Filter by year level" className={selectClass} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                            <option value="All">All years</option>
                            {options.years.map(([value, count]) => <option key={value} value={value}>{value} ({count})</option>)}
                        </select>
                        {hasFilters && (
                            <button type="button" onClick={resetFilters} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:underline">Clear</button>
                        )}
                        <span className="ml-auto text-xs font-semibold text-gray-400">
                            {filtered.length} of {responses.length} response{responses.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {filtered.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-400">No responses match these filters.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="min-w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        {IDENTITY_HEADERS.map((header) => (
                                            <th key={header} scope="col" className="whitespace-nowrap px-3 py-2 font-bold">{header}</th>
                                        ))}
                                        <th scope="col" className="px-3 py-2"><span className="sr-only">View answers</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map((response) => (
                                        <tr
                                            key={response.id}
                                            onClick={() => setSelected(response)}
                                            className="cursor-pointer transition hover:bg-purple-50/60"
                                        >
                                            <td className="whitespace-nowrap px-3 py-2 font-semibold text-gray-900">{response.student_id}</td>
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-700">{response.student_name}</td>
                                            <td className="max-w-[14rem] px-3 py-2 text-gray-500"><span className="block truncate" title={response.department ?? undefined}>{response.department}</span></td>
                                            <td className="max-w-[16rem] px-3 py-2 text-gray-500"><span className="block truncate" title={response.course ?? undefined}>{response.course}</span></td>
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-500">{response.year_level}</td>
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-400">{new Date(response.submitted_at).toLocaleDateString()}</td>
                                            <td className="whitespace-nowrap px-3 py-2 text-right">
                                                <span className="inline-flex items-center gap-1 font-bold text-purple-600">
                                                    View answers <ChevronRight size={13} />
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
