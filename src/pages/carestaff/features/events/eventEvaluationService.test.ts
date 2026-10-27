import { beforeEach, describe, expect, it, vi } from 'vitest';

import { supabase } from '../../../../lib/supabase';
import { attachEvaluationTemplate, type EvaluationForm } from './eventEvaluationService';

vi.mock('../../../../lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const template: EvaluationForm = {
    id: 12,
    event_id: null,
    title: 'Saved feedback form',
    description: 'Please tell us about the activity.',
    is_active: false
};
const templateQuestions = [
    { id: 21, question_text: 'How useful was the activity?', question_type: 'scale', scale_min: 1, scale_max: 5, scale_min_label: 'Poor', scale_max_label: 'Excellent', is_required: true },
    { id: 22, question_text: 'What worked best?', question_type: 'text', is_required: false },
    { id: 23, question_text: 'Would you attend again?', question_type: 'choice', choices: ['Yes', 'No'], is_required: true }
];

const mockQueries = () => {
    const lookup = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    };
    const templateRead = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: templateQuestions, error: null })
    };
    const formWrite = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 101 }, error: null })
    };
    const questionRemoval = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
    };
    const questionWrite = { upsert: vi.fn().mockResolvedValue({ error: null }) };
    const activation = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
    };
    lookup.select.mockReturnValue(lookup);
    templateRead.select.mockReturnValue(templateRead);
    formWrite.upsert.mockReturnValue(formWrite);
    questionRemoval.delete.mockReturnValue(questionRemoval);
    activation.update.mockReturnValue(activation);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'event_evaluation_forms') {
            return { select: lookup.select, upsert: formWrite.upsert, update: activation.update } as any;
        }
        return { select: templateRead.select, delete: questionRemoval.delete, upsert: questionWrite.upsert } as any;
    });
    return { lookup, templateRead, formWrite, questionRemoval, questionWrite, activation };
};

describe('attachEvaluationTemplate', () => {
    beforeEach(() => vi.clearAllMocks());

    it('copies saved template contents without linking the original question ids', async () => {
        const queries = mockQueries();
        const original = structuredClone({ template, templateQuestions });

        await attachEvaluationTemplate(7, template);

        expect(queries.templateRead.eq).toHaveBeenCalledWith('form_id', 12);
        expect(queries.formWrite.upsert).toHaveBeenCalledWith({
            event_id: 7,
            title: template.title,
            description: template.description,
            is_active: false
        });
        expect(queries.questionWrite.upsert).toHaveBeenCalledWith([
            { form_id: 101, order_index: 0, question_text: 'How useful was the activity?', question_type: 'scale', scale_min: 1, scale_max: 5, scale_min_label: 'Poor', scale_max_label: 'Excellent', choices: [], is_required: true },
            { form_id: 101, order_index: 1, question_text: 'What worked best?', question_type: 'text', scale_min: null, scale_max: null, scale_min_label: null, scale_max_label: null, choices: [], is_required: false },
            { form_id: 101, order_index: 2, question_text: 'Would you attend again?', question_type: 'choice', scale_min: null, scale_max: null, scale_min_label: null, scale_max_label: null, choices: ['Yes', 'No'], is_required: true }
        ]);
        expect(queries.activation.update).toHaveBeenCalledWith({ is_active: true });
        expect(queries.activation.eq).toHaveBeenCalledWith('id', 101);
        expect(queries.questionWrite.upsert.mock.invocationCallOrder[0]).toBeLessThan(queries.activation.update.mock.invocationCallOrder[0]);
        expect({ template, templateQuestions }).toEqual(original);
    });

    it('recovers the same event form on retry after question persistence fails', async () => {
        const queries = mockQueries();
        const error = new Error('Question save failed');
        queries.questionWrite.upsert.mockResolvedValueOnce({ error } as any);

        await expect(attachEvaluationTemplate(7, template)).rejects.toThrow('Question save failed');
        expect(queries.activation.update).not.toHaveBeenCalled();

        queries.lookup.maybeSingle.mockResolvedValue({ data: { id: 101 }, error: null } as any);
        await attachEvaluationTemplate(7, template);

        expect(queries.lookup.eq).toHaveBeenCalledWith('event_id', 7);
        expect(queries.formWrite.upsert).toHaveBeenLastCalledWith({
            id: 101,
            event_id: 7,
            title: template.title,
            description: template.description,
            is_active: false
        });
        expect(queries.activation.update).toHaveBeenCalledTimes(1);
    });

    it('rejects an empty saved template before creating a form', async () => {
        const queries = mockQueries();
        queries.templateRead.order.mockResolvedValue({ data: [], error: null });

        await expect(attachEvaluationTemplate(7, template)).rejects.toThrow('has no questions');

        expect(queries.formWrite.upsert).not.toHaveBeenCalled();
        expect(queries.activation.update).not.toHaveBeenCalled();
    });

    it('keeps a completed attachment and its student answers untouched on retry', async () => {
        const queries = mockQueries();
        queries.lookup.maybeSingle.mockResolvedValue({ data: { id: 101, is_active: true }, error: null } as any);
        queries.templateRead.order.mockResolvedValue({ data: [], error: null });

        await attachEvaluationTemplate(7, template);

        expect(queries.formWrite.upsert).not.toHaveBeenCalled();
        expect(queries.questionRemoval.delete).not.toHaveBeenCalled();
        expect(queries.questionWrite.upsert).not.toHaveBeenCalled();
        expect(queries.templateRead.order).not.toHaveBeenCalled();
    });

    it('reports lookup and activation failures', async () => {
        const queries = mockQueries();
        queries.lookup.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('Lookup failed') } as any);

        await expect(attachEvaluationTemplate(7, template)).rejects.toThrow('Lookup failed');
        expect(queries.formWrite.upsert).not.toHaveBeenCalled();

        queries.activation.eq.mockResolvedValue({ error: new Error('Activation failed') } as any);
        await expect(attachEvaluationTemplate(7, template)).rejects.toThrow('Activation failed');
    });
});
