import { supabase } from '../../../../lib/supabase';

export type EvaluationQuestionType = 'scale' | 'text' | 'choice';

export interface EvaluationQuestion {
    id: number;
    question_text: string;
    question_type: EvaluationQuestionType;
    scale_min?: number | null;
    scale_max?: number | null;
    scale_min_label?: string | null;
    scale_max_label?: string | null;
    choices?: string[] | null;
    order_index?: number | null;
}

export interface EvaluationAnswer {
    question_id: number;
    answer_value?: number | null;
    answer_text?: string | null;
}

export interface EvaluationForm {
    id: number;
    event_id: number | null;
    title: string;
    description: string | null;
    is_active: boolean;
}

/** A question being edited. `id` is absent until it has been saved once. */
export interface DraftQuestion {
    clientId: string;
    id?: number;
    question_text: string;
    question_type: EvaluationQuestionType;
    scale_min: number;
    scale_max: number;
    scale_min_label: string;
    scale_max_label: string;
    choices: string[];
    is_required: boolean;
}

export interface EvaluationResponse {
    id: number;
    student_id: string;
    student_name: string | null;
    department: string | null;
    course: string | null;
    year_level: string | null;
    submitted_at: string;
}

const FORM_COLUMNS = 'id, event_id, title, description, is_active';
const QUESTION_COLUMNS =
    'id, form_id, order_index, question_text, question_type, scale_min, scale_max, scale_min_label, scale_max_label, choices, is_required';

export const createDraftQuestion = (): DraftQuestion => ({
    clientId: crypto.randomUUID(),
    question_text: '',
    question_type: 'scale',
    scale_min: 1,
    scale_max: 5,
    scale_min_label: 'Poor',
    scale_max_label: 'Excellent',
    choices: ['', ''],
    is_required: true
});

export const toDraftQuestion = (row: any): DraftQuestion => ({
    clientId: crypto.randomUUID(),
    id: row.id,
    question_text: row.question_text ?? '',
    question_type: (row.question_type ?? 'scale') as EvaluationQuestionType,
    scale_min: row.scale_min ?? 1,
    scale_max: row.scale_max ?? 5,
    scale_min_label: row.scale_min_label ?? '',
    scale_max_label: row.scale_max_label ?? '',
    choices: Array.isArray(row.choices) && row.choices.length >= 2 ? row.choices : ['', ''],
    is_required: row.is_required ?? true
});

/**
 * Forms attached to the given events, each with its response count, in one round
 * trip. Drives the "Evaluation (N)" button label on every event card.
 */
export const getEvaluationsForEvents = async (eventIds: number[]) => {
    if (eventIds.length === 0) return new Map<number, { form: EvaluationForm; responseCount: number }>();

    const { data, error } = await supabase
        .from('event_evaluation_forms')
        .select(`${FORM_COLUMNS}, event_evaluation_responses(count)`)
        .in('event_id', eventIds);

    if (error) throw error;

    const map = new Map<number, { form: EvaluationForm; responseCount: number }>();
    for (const row of data ?? []) {
        const anyRow = row as any;
        if (anyRow.event_id == null) continue;
        map.set(anyRow.event_id, {
            form: anyRow as EvaluationForm,
            responseCount: anyRow.event_evaluation_responses?.[0]?.count ?? 0
        });
    }
    return map;
};

export const getQuestions = async (formId: number): Promise<DraftQuestion[]> => {
    const { data, error } = await supabase
        .from('event_evaluation_questions')
        .select(QUESTION_COLUMNS)
        .eq('form_id', formId)
        .order('order_index');

    if (error) throw error;
    return (data ?? []).map(toDraftQuestion);
};

export const listTemplates = async (): Promise<EvaluationForm[]> => {
    const { data, error } = await supabase
        .from('event_evaluation_forms')
        .select(FORM_COLUMNS)
        .is('event_id', null)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as EvaluationForm[];
};

/** Strips settings that do not belong to the chosen type, so a question that
 *  was a scale before it became a text box does not carry stale bounds. */
const toQuestionRow = (question: DraftQuestion, formId: number, index: number) => ({
    ...(question.id ? { id: question.id } : {}),
    form_id: formId,
    order_index: index,
    question_text: question.question_text.trim(),
    question_type: question.question_type,
    scale_min: question.question_type === 'scale' ? question.scale_min : null,
    scale_max: question.question_type === 'scale' ? question.scale_max : null,
    scale_min_label: question.question_type === 'scale' ? question.scale_min_label.trim() || null : null,
    scale_max_label: question.question_type === 'scale' ? question.scale_max_label.trim() || null : null,
    choices:
        question.question_type === 'choice'
            ? question.choices.map((choice) => choice.trim()).filter(Boolean)
            : [],
    is_required: question.is_required
});

export const saveEvaluation = async (
    form: { id?: number; event_id: number | null; title: string; description: string; is_active: boolean },
    questions: DraftQuestion[]
): Promise<number> => {
    const { data: saved, error: formError } = await supabase
        .from('event_evaluation_forms')
        .upsert({
            ...(form.id ? { id: form.id } : {}),
            event_id: form.event_id,
            title: form.title.trim(),
            description: form.description.trim() || null,
            is_active: form.is_active
        })
        .select('id')
        .single();

    if (formError) throw formError;
    const formId = (saved as any).id as number;

    // Questions the staff removed are deleted; survivors keep their id so that
    // answers already recorded against them stay attached to the right question.
    const keptIds = questions.map((q) => q.id).filter((id): id is number => typeof id === 'number');
    let removal = supabase.from('event_evaluation_questions').delete().eq('form_id', formId);
    if (keptIds.length > 0) removal = removal.not('id', 'in', `(${keptIds.join(',')})`);
    const { error: deleteError } = await removal;
    if (deleteError) throw deleteError;

    if (questions.length > 0) {
        const { error: questionError } = await supabase
            .from('event_evaluation_questions')
            .upsert(questions.map((question, index) => toQuestionRow(question, formId, index)));
        if (questionError) throw questionError;
    }

    return formId;
};

export const deleteEvaluation = async (formId: number) => {
    const { error } = await supabase.from('event_evaluation_forms').delete().eq('id', formId);
    if (error) throw error;
};

export const getEvaluationResults = async (formId: number) => {
    const [formResult, questionsResult, responsesResult] = await Promise.all([
        supabase.from('event_evaluation_forms').select(FORM_COLUMNS).eq('id', formId).single(),
        supabase.from('event_evaluation_questions').select(QUESTION_COLUMNS).eq('form_id', formId).order('order_index'),
        supabase
            .from('event_evaluation_responses')
            .select('id, student_id, student_name, department, course, year_level, submitted_at')
            .eq('form_id', formId)
            .order('submitted_at', { ascending: false })
    ]);

    if (formResult.error) throw formResult.error;
    if (questionsResult.error) throw questionsResult.error;
    if (responsesResult.error) throw responsesResult.error;

    const form = formResult.data as unknown as EvaluationForm;
    const responses = (responsesResult.data ?? []) as unknown as EvaluationResponse[];
    if (responses.length === 0) {
        return { form, questions: (questionsResult.data ?? []) as unknown as EvaluationQuestion[], responses, answers: [] as EvaluationAnswer[] };
    }

    const { data: answerRows, error: answerError } = await supabase
        .from('event_evaluation_answers')
        .select('response_id, question_id, answer_value, answer_text')
        .in('response_id', responses.map((response) => response.id));

    if (answerError) throw answerError;

    return {
        form,
        questions: (questionsResult.data ?? []) as unknown as EvaluationQuestion[],
        responses,
        answers: (answerRows ?? []) as unknown as Array<EvaluationAnswer & { response_id: number }>
    };
};
