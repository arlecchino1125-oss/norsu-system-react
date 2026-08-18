import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import Modal from '../../../../../components/ui/Modal';
import { Button } from '../../../../../components/ui/Button';
import {
    createDraftQuestion,
    getGlobalEvaluationForm,
    getQuestions,
    saveGlobalEvaluation,
    toDraftQuestion,
    type CounselingEvaluationQuestionType,
    type DraftQuestion
} from '../counselingEvaluationService';
import {
    getQuestions as getEventTemplateQuestions,
    listTemplates as listEventTemplates,
    type EvaluationForm as EventEvaluationTemplate
} from '../../events/eventEvaluationService';

interface CounselingEvaluationFormModalProps {
    open: boolean;
    onClose: () => void;
    showToast: (message: string, type?: string) => void;
    onSaved: () => void | Promise<void>;
}

const TYPE_OPTIONS: Array<{ value: CounselingEvaluationQuestionType; label: string }> = [
    { value: 'scale', label: 'Rating scale' },
    { value: 'text', label: 'Text answer' },
    { value: 'choice', label: 'Multiple choice' }
];

const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-200';

/** Mirrors the database CHECK constraints so staff get a readable message
 *  instead of a raw Postgres violation. */
const findProblem = (title: string, questions: DraftQuestion[]): string | null => {
    if (!title.trim()) return 'Give the evaluation a title.';
    if (questions.length === 0) return 'Add at least one question.';

    for (const [index, question] of questions.entries()) {
        const position = `Question ${index + 1}`;
        if (!question.question_text.trim()) return `${position} needs its text filled in.`;
        if (question.question_type === 'scale' && question.scale_max <= question.scale_min) {
            return `${position}: the highest rating must be greater than the lowest.`;
        }
        if (
            question.question_type === 'choice' &&
            question.choices.map((choice) => choice.trim()).filter(Boolean).length < 2
        ) {
            return `${position} needs at least two choices.`;
        }
    }
    return null;
};

/**
 * Builder for the single global counseling evaluation form. This one form is
 * what every student answers -- once per completed session, and for open
 * evaluations recorded outside the system flow.
 */
export default function CounselingEvaluationFormModal({
    open,
    onClose,
    showToast,
    onSaved
}: CounselingEvaluationFormModalProps) {
    const [formId, setFormId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [questions, setQuestions] = useState<DraftQuestion[]>([]);
    const [templates, setTemplates] = useState<EventEvaluationTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        let active = true;

        const load = async () => {
            setIsLoading(true);
            try {
                const [existing, availableTemplates] = await Promise.all([
                    getGlobalEvaluationForm(),
                    listEventTemplates().catch(() => [])
                ]);
                if (!active) return;
                setTemplates(availableTemplates);
                if (existing.form) {
                    setFormId(existing.form.id);
                    setTitle(existing.form.title);
                    setDescription(existing.form.description ?? '');
                    setIsActive(existing.form.is_active);
                    const loaded = await getQuestions(existing.form.id);
                    setQuestions(loaded.length > 0 ? loaded.map(toDraftQuestion) : [createDraftQuestion()]);
                } else {
                    setFormId(null);
                    setTitle('Counseling Session Evaluation');
                    setDescription('');
                    setIsActive(true);
                    setQuestions([createDraftQuestion()]);
                }
            } catch {
                if (active) showToast('Could not open the evaluation builder.', 'error');
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [open, showToast]);

    const applyTemplate = async (templateId: string) => {
        if (!templateId) return;
        try {
            const template = templates.find((item) => String(item.id) === templateId);
            const loaded = await getEventTemplateQuestions(Number(templateId));
            // Copied, not linked: the original event template remains untouched
            setQuestions(loaded.map((question) => ({
                ...question,
                id: undefined,
                clientId: crypto.randomUUID()
            })));
            if (template?.description) setDescription(template.description);
            showToast('Template copied. Edit it freely — the original template is untouched.', 'success');
        } catch {
            showToast('Could not load that template.', 'error');
        }
    };

    const updateQuestion = (clientId: string, patch: Partial<DraftQuestion>) => {
        setQuestions((prev) => prev.map((q) => (q.clientId === clientId ? { ...q, ...patch } : q)));
    };

    const moveQuestion = (index: number, direction: -1 | 1) => {
        setQuestions((prev) => {
            const target = index + direction;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const handleSave = async () => {
        const problem = findProblem(title, questions);
        if (problem) {
            showToast(problem, 'error');
            return;
        }

        setIsSaving(true);
        try {
            await saveGlobalEvaluation(
                { id: formId ?? undefined, title, description, is_active: isActive },
                questions
            );
            showToast('Evaluation form saved.', 'success');
            await onSaved();
            onClose();
        } catch (error: any) {
            showToast(error?.message || 'Could not save the evaluation.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="xl"
            title="Counseling Evaluation Form"
            subtitle="One form used for every completed session and open evaluation."
            zIndex="z-[80]"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
                        Save Evaluation Form
                    </Button>
                </>
            }
        >
            {isLoading ? (
                <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
            ) : (
                <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-xs font-bold text-gray-700">Title</span>
                            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Evaluation title" />
                        </label>
                        {templates.length > 0 && (
                            <label className="block">
                                <span className="mb-1 block text-xs font-bold text-gray-700">Copy from an Evaluation Template</span>
                                <select
                                    aria-label="Copy from an Evaluation Template"
                                    className={inputClass}
                                    defaultValue=""
                                    onChange={(e) => void applyTemplate(e.target.value)}
                                >
                                    <option value="">Choose a template to apply...</option>
                                    {templates.map((template) => (
                                        <option key={template.id} value={template.id}>{template.title}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </div>

                    <label className="block">
                        <span className="mb-1 block text-xs font-bold text-gray-700">Description <span className="font-normal text-gray-400">(optional)</span></span>
                        <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown to students above the questions." />
                    </label>

                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                        Accepting responses
                    </label>

                    <div className="space-y-3">
                        {questions.map((question, index) => (
                            <div key={question.clientId} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-xs font-black text-white">{index + 1}</span>
                                    <select
                                        aria-label={`Question ${index + 1} type`}
                                        className={`${inputClass} max-w-[11rem]`}
                                        value={question.question_type}
                                        onChange={(e) => updateQuestion(question.clientId, { question_type: e.target.value as CounselingEvaluationQuestionType })}
                                    >
                                        {TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <div className="ml-auto flex items-center gap-1">
                                        <Button variant="ghost" size="sm" aria-label="Move question up" disabled={index === 0} onClick={() => moveQuestion(index, -1)} leftIcon={<ArrowUp size={13} />} />
                                        <Button variant="ghost" size="sm" aria-label="Move question down" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} leftIcon={<ArrowDown size={13} />} />
                                        <Button variant="ghost" size="sm" aria-label={`Remove question ${index + 1}`} onClick={() => setQuestions((prev) => prev.filter((q) => q.clientId !== question.clientId))} leftIcon={<Trash2 size={13} className="text-red-400" />} />
                                    </div>
                                </div>

                                <input
                                    className={inputClass}
                                    value={question.question_text}
                                    onChange={(e) => updateQuestion(question.clientId, { question_text: e.target.value })}
                                    placeholder="Question text"
                                />

                                {question.question_type === 'scale' && (
                                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <label className="block">
                                            <span className="mb-1 block text-[11px] font-bold text-gray-500">Lowest rating</span>
                                            <input type="number" className={inputClass} value={question.scale_min} onChange={(e) => updateQuestion(question.clientId, { scale_min: Number(e.target.value) })} />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[11px] font-bold text-gray-500">Highest rating</span>
                                            <input type="number" className={inputClass} value={question.scale_max} onChange={(e) => updateQuestion(question.clientId, { scale_max: Number(e.target.value) })} />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[11px] font-bold text-gray-500">Low label</span>
                                            <input className={inputClass} value={question.scale_min_label} onChange={(e) => updateQuestion(question.clientId, { scale_min_label: e.target.value })} placeholder="Poor" />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[11px] font-bold text-gray-500">High label</span>
                                            <input className={inputClass} value={question.scale_max_label} onChange={(e) => updateQuestion(question.clientId, { scale_max_label: e.target.value })} placeholder="Excellent" />
                                        </label>
                                    </div>
                                )}

                                {question.question_type === 'choice' && (
                                    <div className="mt-3 space-y-2">
                                        {question.choices.map((choice, choiceIndex) => (
                                            <div key={`${question.clientId}-choice-${choiceIndex}`} className="flex items-center gap-2">
                                                <input
                                                    aria-label={`Question ${index + 1} choice ${choiceIndex + 1}`}
                                                    className={inputClass}
                                                    value={choice}
                                                    onChange={(e) => {
                                                        const next = [...question.choices];
                                                        next[choiceIndex] = e.target.value;
                                                        updateQuestion(question.clientId, { choices: next });
                                                    }}
                                                    placeholder={`Choice ${choiceIndex + 1}`}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label={`Remove choice ${choiceIndex + 1}`}
                                                    disabled={question.choices.length <= 2}
                                                    onClick={() => updateQuestion(question.clientId, { choices: question.choices.filter((_, i) => i !== choiceIndex) })}
                                                    leftIcon={<Trash2 size={13} className="text-gray-400" />}
                                                />
                                            </div>
                                        ))}
                                        <Button variant="ghost" size="sm" onClick={() => updateQuestion(question.clientId, { choices: [...question.choices, ''] })} leftIcon={<Plus size={13} />}>
                                            Add choice
                                        </Button>
                                    </div>
                                )}

                                <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-600">
                                    <input type="checkbox" checked={question.is_required} onChange={(e) => updateQuestion(question.clientId, { is_required: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                                    Required
                                </label>
                            </div>
                        ))}
                    </div>

                    <Button variant="secondary" onClick={() => setQuestions((prev) => [...prev, createDraftQuestion()])} leftIcon={<Plus size={14} />}>
                        Add Question
                    </Button>
                </div>
            )}
        </Modal>
    );
}
