import { describe, expect, it } from 'vitest';

import { summarizeEvaluation, type EvaluationQuestion } from './evaluationSummary';

const scale: EvaluationQuestion = {
    id: 1,
    question_text: 'How well organised was the event?',
    question_type: 'scale',
    scale_min: 1,
    scale_max: 5,
    order_index: 0
};

const choice: EvaluationQuestion = {
    id: 2,
    question_text: 'How did you hear about it?',
    question_type: 'choice',
    choices: ['Facebook', 'Classmate', 'Poster'],
    order_index: 1
};

const text: EvaluationQuestion = {
    id: 3,
    question_text: 'Any suggestions?',
    question_type: 'text',
    order_index: 2
};

describe('summarizeEvaluation', () => {
    it('averages scale answers and ignores students who skipped the question', () => {
        const [result] = summarizeEvaluation([scale], [
            { question_id: 1, answer_value: 5 },
            { question_id: 1, answer_value: 4 },
            { question_id: 1, answer_value: null }
        ]);

        // 5 and 4 average to 4.5. Counting the skip as 0 would give 3 -- the bug
        // this test exists to catch.
        expect(result.average).toBe(4.5);
        expect(result.answered).toBe(2);
    });

    it('counts every offered choice, including options nobody picked', () => {
        const [result] = summarizeEvaluation([choice], [
            { question_id: 2, answer_text: 'Facebook' },
            { question_id: 2, answer_text: 'Facebook' },
            { question_id: 2, answer_text: 'Poster' }
        ]);

        expect(result.counts).toEqual([
            { label: 'Facebook', count: 2 },
            { label: 'Classmate', count: 0 },
            { label: 'Poster', count: 1 }
        ]);
        expect(result.answered).toBe(3);
    });

    it('collects text answers and drops blank ones', () => {
        const [result] = summarizeEvaluation([text], [
            { question_id: 3, answer_text: 'More snacks' },
            { question_id: 3, answer_text: '   ' },
            { question_id: 3, answer_text: null }
        ]);

        expect(result.texts).toEqual(['More snacks']);
        expect(result.answered).toBe(1);
    });

    it('returns questions in display order even when answers arrive jumbled', () => {
        const result = summarizeEvaluation([text, scale, choice], [
            { question_id: 2, answer_text: 'Poster' },
            { question_id: 1, answer_value: 3 }
        ]);

        expect(result.map((r) => r.question.id)).toEqual([1, 2, 3]);
    });

    it('reports no average when a scale question got no answers at all', () => {
        const [result] = summarizeEvaluation([scale], []);

        // null, not 0 -- "nobody answered" and "everybody rated it zero" are
        // different findings and must not render the same.
        expect(result.average).toBeNull();
        expect(result.answered).toBe(0);
    });
});
