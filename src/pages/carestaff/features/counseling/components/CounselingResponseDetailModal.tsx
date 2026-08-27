import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Download, FileQuestion, Link2 } from 'lucide-react';

import { formatDateTime, toTitleCase } from '../../../../../utils/formatters';
import { exportSingleCounselingEvaluationPdf } from '../counselingEvaluationExport';
import type {
    CounselingEvaluationQuestion,
    CounselingEvaluationResponse
} from '../counselingEvaluationService';

interface CounselingResponseDetailModalProps {
    open: boolean;
    onClose: () => void;
    response: CounselingEvaluationResponse;
    questions: CounselingEvaluationQuestion[];
}

const displayAnswer = (response: CounselingEvaluationResponse, question: CounselingEvaluationQuestion) => {
    const answer = (response.counseling_evaluation_answers ?? []).find((a) => a.question_id === question.id);
    if (!answer) return <span className="italic text-slate-400">No answer</span>;
    if (typeof answer.answer_value === 'number') return <span className="font-bold text-slate-900">{answer.answer_value}</span>;
    return <span className="whitespace-pre-wrap text-slate-800">{answer.answer_text || '—'}</span>;
};

/** Read-only view of one counseling evaluation response (session-linked or open). */
export default function CounselingResponseDetailModal({
    open,
    onClose,
    response,
    questions
}: CounselingResponseDetailModalProps) {
    const [isExporting, setIsExporting] = useState(false);

    if (!open || typeof document === 'undefined') return null;

    const linked = response.counseling_request_id != null;
    const orderedQuestions = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const handleDownloadPdf = async () => {
        setIsExporting(true);
        try {
            await exportSingleCounselingEvaluationPdf(response, questions);
        } finally {
            setIsExporting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
            <div
                className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="shrink-0 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Counseling Evaluation</p>
                            <h3 className="mt-1 truncate text-lg font-black">{toTitleCase(response.student_name) || response.student_id}</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-400">{formatDateTime(response.submitted_at)}</p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close evaluation detail"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {linked ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-black text-emerald-300">
                                <Link2 size={12} /> Linked to session
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-black text-amber-300">
                                <FileQuestion size={12} /> Open evaluation
                            </span>
                        )}
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-300">
                            {response.student_id}
                        </span>
                    </div>
                </div>


                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Department</p>
                            <p className="mt-0.5 text-sm font-bold text-slate-800">{response.department || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Course</p>
                            <p className="mt-0.5 text-sm font-bold text-slate-800">{response.course || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Year Level</p>
                            <p className="mt-0.5 text-sm font-bold text-slate-800">{response.year_level || '—'}</p>
                        </div>
                    </div>

                    {linked && response.counseling_requests?.scheduled_date && (
                        <p className="mb-4 text-xs font-semibold text-slate-500">
                            Session date: <span className="font-black text-slate-700">{formatDateTime(response.counseling_requests.scheduled_date)}</span>
                        </p>
                    )}

                    {orderedQuestions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <ClipboardList size={28} className="text-slate-300" />
                            <p className="mt-3 text-sm font-bold text-slate-600">No questions on this evaluation.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orderedQuestions.map((question, index) => (
                                <article key={question.id} className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-sm font-bold text-slate-800">
                                        <span className="mr-1.5 text-slate-400">{index + 1}.</span>
                                        {question.question_text}
                                    </p>
                                    <div className="mt-2">{displayAnswer(response, question)}</div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-white p-4 flex items-center gap-3">
                    <button
                        type="button"
                        disabled={isExporting}
                        onClick={handleDownloadPdf}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
                    >
                        <Download size={15} />
                        {isExporting ? 'Generating PDF...' : 'Download PDF'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
