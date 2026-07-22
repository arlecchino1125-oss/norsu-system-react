export type EvaluationQuestionType = 'scale' | 'text' | 'choice';

export interface EvaluationQuestion {
    id: number;
    question_text: string;
    question_type: EvaluationQuestionType;
    scale_min?: number | null;
    scale_max?: number | null;
    choices?: string[] | null;
    order_index?: number | null;
}

export interface EvaluationAnswer {
    question_id: number;
    answer_value?: number | null;
    answer_text?: string | null;
}

export interface EvaluationQuestionSummary {
    question: EvaluationQuestion;
    answered: number;
    average: number | null;
    counts: Array<{ label: string; count: number }>;
    texts: string[];
}

/**
 * Per-question rollup for the staff results view.
 *
 * Unanswered questions are skipped rather than counted as zero -- optional
 * questions exist, and averaging a skipped scale question as 0 would drag every
 * report down and quietly misreport the event.
 */
export const summarizeEvaluation = (
    questions: EvaluationQuestion[],
    answers: EvaluationAnswer[]
): EvaluationQuestionSummary[] => {
    const byQuestion = new Map<number, EvaluationAnswer[]>();
    for (const answer of answers) {
        const bucket = byQuestion.get(answer.question_id);
        if (bucket) bucket.push(answer);
        else byQuestion.set(answer.question_id, [answer]);
    }

    return [...questions]
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((question) => {
            const given = byQuestion.get(question.id) ?? [];

            if (question.question_type === 'scale') {
                const values = given
                    .map((a) => a.answer_value)
                    .filter((v): v is number => typeof v === 'number');
                const average = values.length
                    ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
                    : null;
                return { question, answered: values.length, average, counts: [], texts: [] };
            }

            if (question.question_type === 'choice') {
                const tally = new Map<string, number>();
                // Seed every offered option so a zero-vote choice still shows up --
                // "nobody picked this" is a finding, not an absence.
                for (const option of question.choices ?? []) tally.set(option, 0);

                let answered = 0;
                for (const a of given) {
                    const picked = (a.answer_text ?? '').trim();
                    if (!picked) continue;
                    answered += 1;
                    tally.set(picked, (tally.get(picked) ?? 0) + 1);
                }

                return {
                    question,
                    answered,
                    average: null,
                    counts: [...tally].map(([label, count]) => ({ label, count })),
                    texts: []
                };
            }

            const texts = given
                .map((a) => (a.answer_text ?? '').trim())
                .filter((t) => t.length > 0);
            return { question, answered: texts.length, average: null, counts: [], texts };
        });
};
