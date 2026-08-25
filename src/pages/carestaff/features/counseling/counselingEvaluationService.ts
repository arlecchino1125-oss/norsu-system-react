import { supabase } from '../../../../lib/supabase';

// The counseling_evaluation_* tables were added after src/types/database.ts was
// last generated, so the typed client does not know them yet. Route through an
// any-typed alias (same convention as the public_* RPC helpers elsewhere).
const db = supabase as any;

export type CounselingEvaluationQuestionType = 'scale' | 'text' | 'choice';

export interface CounselingEvaluationQuestion {
    id: number;
    form_id: number;
    order_index: number;
    question_text: string;
    question_type: CounselingEvaluationQuestionType;
    scale_min?: number | null;
    scale_max?: number | null;
    scale_min_label?: string | null;
    scale_max_label?: string | null;
    choices?: string[] | null;
    is_required?: boolean;
}

export interface CounselingEvaluationForm {
    id: number;
    title: string;
    description: string | null;
    is_active: boolean;
    is_global: boolean;
    created_at?: string | null;
}

/** A question being edited. `id` is absent until it has been saved once. */
export interface DraftQuestion {
    clientId: string;
    id?: number;
    question_text: string;
    question_type: CounselingEvaluationQuestionType;
    scale_min: number;
    scale_max: number;
    scale_min_label: string;
    scale_max_label: string;
    choices: string[];
    is_required: boolean;
}

export interface CounselingEvaluationAnswer {
    question_id: number;
    answer_value?: number | null;
    answer_text?: string | null;
}

export interface CounselingEvaluationResponse {
    id: number;
    form_id: number;
    counseling_request_id: number | null;
    student_id: string;
    student_name: string | null;
    department: string | null;
    course: string | null;
    year_level: string | null;
    sex: string | null;
    gender_identity: string | null;
    submitted_at: string;
    counseling_requests?: { id: number; created_at: string; scheduled_date: string | null } | null;
    counseling_evaluation_answers?: Array<{ question_id: number; answer_value: number | null; answer_text: string | null }>;
}

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
    question_type: (row.question_type ?? 'scale') as CounselingEvaluationQuestionType,
    scale_min: row.scale_min ?? 1,
    scale_max: row.scale_max ?? 5,
    scale_min_label: row.scale_min_label ?? '',
    scale_max_label: row.scale_max_label ?? '',
    choices: Array.isArray(row.choices) && row.choices.length >= 2 ? row.choices : ['', ''],
    is_required: row.is_required ?? true
});

/** The single global form (and its questions), or nulls when none exists yet. */
export const getGlobalEvaluationForm = async (): Promise<{
    form: CounselingEvaluationForm | null;
    questions: CounselingEvaluationQuestion[];
}> => {
    const { data: form, error } = await db
        .from('counseling_evaluation_forms')
        .select('id, counseling_request_id, title, description, is_active, is_global, created_at')
        .eq('is_global', true)
        .maybeSingle();

    if (error) throw error;
    if (!form) return { form: null, questions: [] };

    const { data: questions, error: questionsError } = await db
        .from('counseling_evaluation_questions')
        .select(QUESTION_COLUMNS)
        .eq('form_id', form.id)
        .order('order_index');

    if (questionsError) throw questionsError;
    return {
        form: form as CounselingEvaluationForm,
        questions: (questions ?? []) as CounselingEvaluationQuestion[]
    };
};

/** Questions for the given form (used when loading the builder for editing). */
export const getQuestions = async (formId: number): Promise<CounselingEvaluationQuestion[]> => {
    const { data, error } = await db
        .from('counseling_evaluation_questions')
        .select(QUESTION_COLUMNS)
        .eq('form_id', formId)
        .order('order_index');

    if (error) throw error;
    return (data ?? []) as CounselingEvaluationQuestion[];
};

const toQuestionRow = (question: DraftQuestion, formId: number, index: number) => ({
    ...(question.id ? { id: question.id } : {}),
    form_id: formId,
    order_index: index,
    question_text: question.question_text.trim(),
    question_type: question.question_type,
    scale_min: question.question_type === 'scale' ? question.scale_min : null,
    scale_max: question.question_type === 'scale' ? question.scale_max : null,
    scale_min_label: question.question_type === 'scale' ? question.scale_min_label.trim() : null,
    scale_max_label: question.question_type === 'scale' ? question.scale_max_label.trim() : null,
    choices: question.question_type === 'choice' ? question.choices.map((choice) => choice.trim()).filter(Boolean) : [],
    is_required: question.is_required
});

/**
 * Upsert the single global form and replace its questions. Deleted questions
 * drop their answers via the ON DELETE CASCADE on the answers table.
 */
export const saveGlobalEvaluation = async (
    form: { id?: number; title: string; description: string; is_active: boolean },
    questions: DraftQuestion[]
): Promise<number> => {
    const { data: saved, error: formError } = await db
        .from('counseling_evaluation_forms')
        .upsert({
            ...(form.id ? { id: form.id } : {}),
            counseling_request_id: null,
            title: form.title.trim(),
            description: form.description.trim() || null,
            is_active: form.is_active,
            is_global: true
        })
        .select('id')
        .single();

    if (formError) throw formError;
    const formId = saved.id as number;

    const keptIds = questions.map((q) => q.id).filter((id): id is number => typeof id === 'number');
    let removal = db.from('counseling_evaluation_questions').delete().eq('form_id', formId);
    if (keptIds.length > 0) removal = removal.not('id', 'in', `(${keptIds.join(',')})`);
    const { error: deleteError } = await removal;
    if (deleteError) throw deleteError;

    if (questions.length > 0) {
        const { error: questionError } = await db
            .from('counseling_evaluation_questions')
            .upsert(questions.map((question, index) => toQuestionRow(question, formId, index)));
        if (questionError) throw questionError;
    }

    return formId;
};

/**
 * Every evaluation response (system-session linked AND open) with its answers
 * and the linked session's dates embedded. Grouping by student happens in the
 * view so the list can expand per student.
 */
export const getCounselingEvaluations = async (): Promise<CounselingEvaluationResponse[]> => {
    const { data, error } = await db
        .from('counseling_evaluation_responses')
        .select(
            `id, form_id, counseling_request_id, student_id, student_name, department, course, year_level, submitted_at,
             counseling_requests(id, created_at, scheduled_date),
             counseling_evaluation_answers(question_id, answer_value, answer_text),
             students(sex, gender_identity)`
        )
        .order('submitted_at', { ascending: false })
        .limit(10000);

    if (error) throw error;
    // ponytail: flatten students join into top-level sex/gender_identity
    return ((data ?? []) as any[]).map(row => ({
        ...row,
        sex: row.students?.sex ?? null,
        gender_identity: row.students?.gender_identity ?? null,
        students: undefined
    })) as CounselingEvaluationResponse[];
};
