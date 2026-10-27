import { useQuery } from '@tanstack/react-query';

import Modal from '../../../../../components/ui/Modal';
import { Button } from '../../../../../components/ui/Button';
import { getQuestions, type DraftQuestion, type EvaluationForm } from '../eventEvaluationService';

interface EventEvaluationPreviewModalProps {
    template: EvaluationForm;
    onClose: () => void;
}

export default function EventEvaluationPreviewModal({ template, onClose }: EventEvaluationPreviewModalProps) {
    const { data: questions = [], isPending, isFetching, isError } = useQuery<DraftQuestion[]>({
        queryKey: ['event-evaluation-preview', template.id],
        queryFn: () => getQuestions(template.id),
        staleTime: 0,
        refetchOnMount: 'always',
    });

    return (
        <Modal
            open
            onClose={onClose}
            title="Evaluation form preview"
            subtitle={template.title}
            size="lg"
            zIndex="z-[60]"
            className="flex max-h-[calc(100dvh-2rem)] flex-col"
            footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
        >
            {template.description && (
                <p className="mb-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{template.description}</p>
            )}

            {isPending || isFetching ? (
                <p role="status" className="py-8 text-center text-sm text-slate-600">Loading evaluation form...</p>
            ) : isError ? (
                <p role="alert" className="py-8 text-center text-sm text-red-700">Could not load the evaluation form. Please close the preview and try again.</p>
            ) : questions.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-600">This template has no saved questions.</p>
            ) : (
                <ol aria-label="Evaluation questions" className="divide-y divide-slate-200">
                    {questions.map((question, index) => (
                        <li key={question.clientId} className="space-y-2 py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-6 text-slate-900">{index + 1}. {question.question_text}</h3>
                                <span className="text-xs leading-6 text-slate-600">{question.is_required ? 'Required' : 'Optional'}</span>
                            </div>

                            {question.question_type === 'scale' ? (
                                <div className="space-y-1 text-sm text-slate-700">
                                    <p>Rating scale: {question.scale_min}–{question.scale_max}</p>
                                    <div className="flex flex-wrap justify-between gap-2 text-xs leading-5">
                                        <span>{question.scale_min}{question.scale_min_label ? ` — ${question.scale_min_label}` : ''}</span>
                                        <span>{question.scale_max}{question.scale_max_label ? ` — ${question.scale_max_label}` : ''}</span>
                                    </div>
                                </div>
                            ) : question.question_type === 'text' ? (
                                <div className="space-y-1 text-sm text-slate-700">
                                    <p>Text answer</p>
                                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">Students write their answer here.</p>
                                </div>
                            ) : (
                                <div className="space-y-1 text-sm text-slate-700">
                                    <p>Multiple choice</p>
                                    <ul className="list-disc space-y-1 break-words pl-5">
                                        {question.choices.map((choice, choiceIndex) => <li key={choiceIndex}>{choice}</li>)}
                                    </ul>
                                </div>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </Modal>
    );
}
