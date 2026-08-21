import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getPublicAssessmentForms,
    getPublicAssessmentFormQuestions,
    submitPublicAssessment,
    type PublicAssessmentForm,
    type PublicAssessmentQuestion,
} from '../publicEventsService';
import type { PublicIdentity } from './usePublicEvents';

const EMPTY_FORM_LIST: PublicAssessmentForm[] = [];

export const usePublicAssessmentData = (identity: PublicIdentity | null, options?: { enabled?: boolean }) => {
    const studentId = identity?.student.student_id;

    const { data: formsList = EMPTY_FORM_LIST, isLoading, isError } = useQuery({
        queryKey: ['public_assessment_forms', studentId],
        queryFn: () => getPublicAssessmentForms(studentId),
        staleTime: 2 * 60 * 1000,
        enabled: options?.enabled ?? true,
    });

    const queryClient = useQueryClient();
    const refreshForms = useCallback(
        () => queryClient.invalidateQueries({ queryKey: ['public_assessment_forms', studentId] }),
        [queryClient, studentId]
    );

    return { formsList, isLoading, isError, refreshForms };
};

export const usePublicAssessmentActions = (
    identity: PublicIdentity | null,
    showToast: (message: string, type?: string) => void,
    refreshForms: () => Promise<unknown>,
) => {
    const [loadingFormId, setLoadingFormId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const loadFormQuestions = useCallback(
        async (formId: number): Promise<PublicAssessmentQuestion[]> => {
            setLoadingFormId(formId);
            try {
                return await getPublicAssessmentFormQuestions(formId);
            } finally {
                setLoadingFormId(null);
            }
        },
        []
    );

    const handleSubmit = useCallback(
        async (
            formId: number,
            responses: Record<number, string | number>
        ) => {
            if (!identity) {
                showToast('Please sign in with your Student ID first.', 'error');
                return false;
            }
            if (submitting) return false;

            setSubmitting(true);
            try {
                const answers = Object.entries(responses).map(([qid, val]) => ({
                    question_id: Number(qid),
                    answer_value:
                        typeof val === 'number' ? val : val === '' ? null : Number(val),
                    answer_text: typeof val === 'string' && val !== '' ? val : null,
                }));

                await submitPublicAssessment(identity.student.student_id, formId, answers);
                showToast('Assessment submitted successfully.');
                await refreshForms();
                return true;
            } catch (err: any) {
                showToast(err.message || 'Something went wrong.', 'error');
                return false;
            } finally {
                setSubmitting(false);
            }
        },
        [identity, submitting, showToast, refreshForms],
    );

    return { loadingFormId, submitting, loadFormQuestions, handleSubmit };
};