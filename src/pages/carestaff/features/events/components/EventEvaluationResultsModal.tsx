import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import Modal from '../../../../../components/ui/Modal';
import { Button } from '../../../../../components/ui/Button';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { getEvaluationResults, type EvaluationResponse } from '../eventEvaluationService';
import { summarizeEvaluation, type EvaluationAnswer, type EvaluationQuestion } from '../evaluationSummary';

interface EventEvaluationResultsModalProps {
    open: boolean;
    onClose: () => void;
    formId: number;
    eventTitle: string;
    showToast: (message: string, type?: string) => void;
}

type AnswerRow = EvaluationAnswer & { response_id: number };

const IDENTITY_HEADERS = ['Student ID', 'Name', 'Department', 'Course', 'Year', 'Submitted'];

const displayAnswer = (answer: AnswerRow | undefined) => {
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
    const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
    const [responses, setResponses] = useState<EvaluationResponse[]>([]);
    const [answers, setAnswers] = useState<AnswerRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        let active = true;

        const load = async () => {
            setIsLoading(true);
            try {
                const result = await getEvaluationResults(formId);
                if (!active) return;
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

    const summaries = useMemo(() => summarizeEvaluation(questions, answers), [questions, answers]);

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

    const handleExport = async () => {
        try {
            const headers = [...IDENTITY_HEADERS, ...orderedQuestions.map((q) => q.question_text)];
            const rows = responses.map((response) => {
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

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="full"
            title="Evaluation Results"
            subtitle={`${eventTitle} — ${responses.length} response${responses.length === 1 ? '' : 's'}`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button variant="primary" onClick={handleExport} disabled={responses.length === 0} leftIcon={<Download size={14} />}>
                        Export
                    </Button>
                </>
            }
        >
            {isLoading ? (
                <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
            ) : responses.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">No students have submitted this evaluation yet.</p>
            ) : (
                <div className="space-y-6">
                    <section>
                        <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">Summary</h3>
                        <div className="space-y-3">
                            {summaries.map((summary) => (
                                <div key={summary.question.id} className="rounded-xl border border-gray-200 p-4">
                                    <p className="text-sm font-bold text-gray-900">{summary.question.question_text}</p>
                                    <p className="mt-1 text-[11px] font-semibold text-gray-400">{summary.answered} answered</p>

                                    {summary.question.question_type === 'scale' && (
                                        <p className="mt-2 text-2xl font-black text-purple-600">
                                            {summary.average ?? '—'}
                                            <span className="ml-1 text-xs font-semibold text-gray-400">
                                                avg of {summary.question.scale_min}–{summary.question.scale_max}
                                            </span>
                                        </p>
                                    )}

                                    {summary.question.question_type === 'choice' && (
                                        <ul className="mt-2 space-y-1">
                                            {summary.counts.map((entry) => (
                                                <li key={entry.label} className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-700">{entry.label}</span>
                                                    <span className="font-bold text-gray-900">{entry.count}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {summary.question.question_type === 'text' && (
                                        <ul className="mt-2 space-y-1.5">
                                            {summary.texts.length === 0
                                                ? <li className="text-xs text-gray-400">No written answers.</li>
                                                : summary.texts.map((entry, index) => (
                                                    <li key={`${summary.question.id}-text-${index}`} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{entry}</li>
                                                ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">All Responses</h3>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="min-w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        {IDENTITY_HEADERS.map((header) => (
                                            <th key={header} scope="col" className="whitespace-nowrap px-3 py-2 font-bold">{header}</th>
                                        ))}
                                        {orderedQuestions.map((question) => (
                                            <th key={question.id} scope="col" className="min-w-[10rem] px-3 py-2 font-bold">{question.question_text}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {responses.map((response) => {
                                        const row = answersByResponse.get(response.id);
                                        return (
                                            <tr key={response.id}>
                                                <td className="whitespace-nowrap px-3 py-2 font-semibold text-gray-900">{response.student_id}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-gray-700">{response.student_name}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-gray-500">{response.department}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-gray-500">{response.course}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-gray-500">{response.year_level}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-gray-400">{new Date(response.submitted_at).toLocaleDateString()}</td>
                                                {orderedQuestions.map((question) => (
                                                    <td key={question.id} className="px-3 py-2 text-gray-700">{displayAnswer(row?.get(question.id))}</td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}
        </Modal>
    );
}
