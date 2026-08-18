import { supabase } from '../../../../lib/supabase';

export interface StudentCounselingEvaluationQuestion {
    id: number;
    order_index: number | null;
    question_text: string;
    question_type: 'scale' | 'text' | 'choice';
    scale_min: number | null;
    scale_max: number | null;
    scale_min_label: string | null;
    scale_max_label: string | null;
    choices: string[] | null;
    is_required: boolean;
}

export interface StudentCounselingEvaluationForm {
    id: number;
    title: string;
    description: string | null;
}

const db = supabase as any;

/**
 * Returns the set of counseling_request_id's that this student has ALREADY evaluated.
 */
export const getEvaluatedCounselingRequestIds = async (studentId: string): Promise<Set<number>> => {
    if (!studentId) return new Set();

    const { data, error } = await db
        .from('counseling_evaluation_responses')
        .select('counseling_request_id')
        .eq('student_id', studentId)
        .not('counseling_request_id', 'is', null);

    if (error) throw error;

    const evaluated = new Set<number>();
    for (const row of data ?? []) {
        if (row.counseling_request_id != null) {
            evaluated.add(row.counseling_request_id);
        }
    }
    return evaluated;
};

/**
 * Loads the active global counseling evaluation form and its questions for students.
 * Uses RPC first (which bypasses RLS and works for both walk-in and scheduled students),
 * then falls back to direct table query.
 */
export const getGlobalEvaluationFormForStudent = async (requestId: number | null = null): Promise<{
    form: StudentCounselingEvaluationForm | null;
    questions: StudentCounselingEvaluationQuestion[];
}> => {
    try {
        // Use RPC to fetch the form and questions safely, bypassing the RLS restriction
        // on counseling_evaluation_forms that requires a completed session (to allow walk-ins).
        const { data, error } = await db.rpc('public_get_counseling_evaluation_form', {
            p_request_id: requestId
        });
        if (!error && data?.success && data?.form) {
            return {
                form: data.form as StudentCounselingEvaluationForm,
                questions: (data.questions ?? []) as StudentCounselingEvaluationQuestion[]
            };
        }
    } catch {
        // Fall back to direct query
    }

    const { data: form, error: formError } = await db
        .from('counseling_evaluation_forms')
        .select('id, title, description')
        .eq('is_global', true)
        .eq('is_active', true)
        .maybeSingle();

    if (formError) throw formError;
    if (!form) return { form: null, questions: [] };

    const { data: questions, error: questionsError } = await db
        .from('counseling_evaluation_questions')
        .select('id, order_index, question_text, question_type, scale_min, scale_max, scale_min_label, scale_max_label, choices, is_required')
        .eq('form_id', form.id)
        .order('order_index');

    if (questionsError) throw questionsError;

    return {
        form: form as StudentCounselingEvaluationForm,
        questions: (questions ?? []) as StudentCounselingEvaluationQuestion[]
    };
};

/**
 * Submits either a session-linked evaluation or an open in-person counseling evaluation.
 * Uses the database RPC for reliable server-side identity stamping and validation.
 */
export const submitCounselingEvaluation = async (
    formId: number,
    requestId: number | null,
    studentId: string,
    questions: StudentCounselingEvaluationQuestion[],
    responses: Record<number, string | number>
) => {
    const answersPayload = questions
        .filter((question) => responses[question.id] !== undefined && responses[question.id] !== '')
        .map((question) => ({
            question_id: question.id,
            answer_value: question.question_type === 'scale' ? Number(responses[question.id]) : null,
            answer_text: question.question_type === 'scale' ? null : String(responses[question.id])
        }));

    // Use RPC for atomic validation, server stamping and answer insertion
    const { data, error } = await db.rpc('public_counseling_evaluate', {
        p_student_id: studentId,
        p_request_id: requestId,
        p_answers: answersPayload
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error || 'Could not submit evaluation.');
};
