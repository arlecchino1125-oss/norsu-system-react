import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();
vi.mock('../../../../lib/supabase', () => ({ supabase: { rpc: (...args: any[]) => rpcMock(...args) } }));

import {
    verifyPublicStudent,
    getPublicEvents,
    timeInPublicEvent,
    getPublicAssessmentForms,
    getPublicAssessmentFormQuestions,
    submitPublicAssessment,
    submitPublicGeneralFeedback,
} from './publicEventsService';

describe('publicEventsService sends an id and never an email', () => {
    beforeEach(() => rpcMock.mockReset());

    it('verifies with the student id alone', async () => {
        rpcMock.mockResolvedValue({ data: { success: true, student: { student_id: '202600001' } }, error: null });
        await verifyPublicStudent(' 202600001 ');
        expect(rpcMock).toHaveBeenCalledWith('public_verify_student', { p_student_id: '202600001' });
    });

    it('passes the id to the event list so the server narrows the audience', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        await getPublicEvents('202600001');
        expect(rpcMock).toHaveBeenCalledWith('public_get_active_events', { p_student_id: '202600001' });
    });

    it('sends no id at all for a signed-out guest', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        await getPublicEvents();
        expect(rpcMock).toHaveBeenCalledWith('public_get_active_events', { p_student_id: null });
    });

    it('times in with the id alone', async () => {
        rpcMock.mockResolvedValue({ data: { success: true }, error: null });
        await timeInPublicEvent(7, '202600001');
        expect(rpcMock).toHaveBeenCalledWith('public_event_time_in', { p_event_id: 7, p_student_id: '202600001' });
    });
});
describe('publicEventsService assessment + feedback sends an id and never an email', () => {
    beforeEach(() => rpcMock.mockReset());

    it('lists assessment forms with the current id so completion state is server-side', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        await getPublicAssessmentForms('202600001');
        expect(rpcMock).toHaveBeenCalledWith('public_get_assessment_forms', { p_student_id: '202600001' });
    });

    it('lists active forms for a guest (no id)', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        await getPublicAssessmentForms();
        expect(rpcMock).toHaveBeenCalledWith('public_get_assessment_forms', { p_student_id: null });
    });

    it('loads questions by form id only (no student context needed)', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        await getPublicAssessmentFormQuestions(41);
        expect(rpcMock).toHaveBeenCalledWith('public_get_assessment_form_questions', { p_form_id: 41 });
    });

    it('submits an assessment with the student id alone', async () => {
        rpcMock.mockResolvedValue({ data: { success: true }, error: null });
        const answers = [{ question_id: 1, answer_value: 3, answer_text: null }];
        await submitPublicAssessment('202600001', 41, answers);
        expect(rpcMock).toHaveBeenCalledWith('public_submit_assessment', {
            p_student_id: '202600001',
            p_form_id: 41,
            p_answers: answers,
        });
    });

    it('submits general feedback anonymously when no id is provided', async () => {
        rpcMock.mockResolvedValue({ data: { success: true }, error: null });
        await submitPublicGeneralFeedback({ service_availed: 'Counseling', sqd0: 5 });
        expect(rpcMock).toHaveBeenCalledWith('public_submit_general_feedback', {
            p_data: { service_availed: 'Counseling', sqd0: 5 },
            p_student_id: null,
        });
    });

    it('attributes general feedback to the student when an id is provided', async () => {
        rpcMock.mockResolvedValue({ data: { success: true }, error: null });
        await submitPublicGeneralFeedback({ service_availed: 'Registrar' }, ' 202600001 ');
        expect(rpcMock).toHaveBeenCalledWith('public_submit_general_feedback', {
            p_data: { service_availed: 'Registrar' },
            p_student_id: '202600001',
        });
    });
});
