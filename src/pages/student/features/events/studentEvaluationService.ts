import { supabase } from '../../../../lib/supabase';

export interface StudentEvaluationQuestion {
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

export interface StudentEvaluationForm {
    id: number;
    title: string;
    description: string | null;
}

/**
 * Events whose evaluation this student can still fill in.
 *
 * No attendance check is written here on purpose: the RLS policy on
 * event_evaluation_forms already limits SELECT to events the student attended
 * and timed out of, so this query cannot return anything they are not entitled
 * to even if the client is tampered with.
 */
export const getPendingEvaluationEventIds = async (studentId: string): Promise<Set<number>> => {
    if (!studentId) return new Set();

    const { data: forms, error: formsError } = await supabase
        .from('event_evaluation_forms')
        .select('id, event_id')
        .not('event_id', 'is', null)
        .eq('is_active', true);

    if (formsError) throw formsError;
    if (!forms || forms.length === 0) return new Set();

    const { data: answered, error: answeredError } = await supabase
        .from('event_evaluation_responses')
        .select('form_id')
        .eq('student_id', studentId);

    if (answeredError) throw answeredError;

    const answeredIds = new Set((answered ?? []).map((row: any) => row.form_id));
    const pending = new Set<number>();
    for (const form of forms as any[]) {
        if (!answeredIds.has(form.id) && form.event_id != null) pending.add(form.event_id);
    }
    return pending;
};

export const getEvaluationForEvent = async (eventId: number) => {
    const { data: form, error: formError } = await supabase
        .from('event_evaluation_forms')
        .select('id, title, description')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .maybeSingle();

    if (formError) throw formError;
    if (!form) return null;

    const { data: questions, error: questionsError } = await supabase
        .from('event_evaluation_questions')
        .select('id, order_index, question_text, question_type, scale_min, scale_max, scale_min_label, scale_max_label, choices, is_required')
        .eq('form_id', (form as any).id)
        .order('order_index');

    if (questionsError) throw questionsError;

    return {
        form: form as unknown as StudentEvaluationForm,
        questions: (questions ?? []) as unknown as StudentEvaluationQuestion[]
    };
};

/**
 * Identity columns are deliberately not sent: a database trigger stamps
 * student_id, name, department, course and year from the students table, so the
 * client cannot submit under another student's details.
 */
export const submitEvaluation = async (
    formId: number,
    questions: StudentEvaluationQuestion[],
    responses: Record<number, string | number>
) => {
    const { data: response, error: responseError } = await supabase
        .from('event_evaluation_responses')
        .insert([{ form_id: formId }] as any)
        .select('id')
        .single();

    if (responseError) throw responseError;

    const payload = questions
        .filter((question) => responses[question.id] !== undefined && responses[question.id] !== '')
        .map((question) => ({
            response_id: (response as any).id,
            question_id: question.id,
            answer_value: question.question_type === 'scale' ? Number(responses[question.id]) : null,
            answer_text: question.question_type === 'scale' ? null : String(responses[question.id])
        }));

    if (payload.length > 0) {
        const { error: answersError } = await supabase.from('event_evaluation_answers').insert(payload);
        if (answersError) throw answersError;
    }
};
