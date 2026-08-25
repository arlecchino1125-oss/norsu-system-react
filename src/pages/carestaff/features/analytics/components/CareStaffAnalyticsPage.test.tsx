import { describe, expect, it } from 'vitest';

import {
    buildQuestionStats,
    collectAllRows,
    fetchCohortQuestionStats,
    sameLineageForms,
    withComparisonDeltas
} from './CareStaffAnalyticsPage';

describe('collectAllRows', () => {
    /** Stands in for PostgREST: honours the cursor, but never returns more than
     *  `serverCap` rows however many the caller asked for. Ids are sparse so a
     *  cursor that assumed contiguous ids would be caught. */
    const pager = (total: number, serverCap: number) => {
        const rows = Array.from({ length: total }, (_, i) => ({ id: (i + 1) * 7 }));
        const calls: Array<[number, number]> = [];
        const fetchAfter = async (afterId: number, limit: number) => {
            calls.push([afterId, limit]);
            return rows.filter(r => r.id > afterId).slice(0, Math.min(limit, serverCap));
        };
        return { rows, fetchAfter, calls };
    };

    it('returns every row when the server cap is smaller than the requested page', async () => {
        // A short page means "the server capped this", not "we are done" -- treating
        // it as the end would have silently dropped everything after the first page.
        const { rows, fetchAfter } = pager(2500, 400);
        expect(await collectAllRows(fetchAfter, 1000)).toEqual(rows);
    });

    it('collects rows in order with no duplicates or gaps', async () => {
        const { rows, fetchAfter } = pager(1207, 500);
        expect(await collectAllRows(fetchAfter, 500)).toEqual(rows);
    });

    it('advances the cursor strictly, so it cannot re-read a page forever', async () => {
        const { fetchAfter, calls } = pager(900, 400);
        await collectAllRows(fetchAfter, 400);
        const cursors = calls.map(([afterId]) => afterId);
        expect(cursors).toEqual([...cursors].sort((a, b) => a - b));
        expect(new Set(cursors).size).toBe(cursors.length);
        expect(cursors[0]).toBe(0);
    });

    it('stops on the first empty page', async () => {
        const { fetchAfter, calls } = pager(150, 1000);
        expect(await collectAllRows(fetchAfter, 1000)).toHaveLength(150);
        expect(calls).toHaveLength(2); // one full read, one empty read to confirm the end
    });

    it('handles an empty table in a single request', async () => {
        const { fetchAfter, calls } = pager(0, 1000);
        expect(await collectAllRows(fetchAfter, 1000)).toEqual([]);
        expect(calls).toHaveLength(1);
    });

    it('gives up at maxPages instead of spinning forever', async () => {
        const { fetchAfter } = pager(10_000, 100);
        expect(await collectAllRows(fetchAfter, 100, 3)).toHaveLength(300);
    });
});

describe('sameLineageForms', () => {
    // 1 is the original; 2 and 3 are re-runs of it. 9 is an unrelated form.
    const forms = [
        { id: 1, source_form_id: null },
        { id: 2, source_form_id: 1 },
        { id: 3, source_form_id: 1 },
        { id: 9, source_form_id: null }
    ];

    it('offers the re-runs when the original is selected', () => {
        expect(sameLineageForms(forms, 1).map(f => f.id)).toEqual([2, 3]);
    });

    it('offers the original and the siblings when a re-run is selected', () => {
        expect(sameLineageForms(forms, 2).map(f => f.id)).toEqual([1, 3]);
    });

    it('never offers the selected form itself, nor unrelated forms', () => {
        expect(sameLineageForms(forms, 3).map(f => f.id)).toEqual([1, 2]);
        expect(sameLineageForms(forms, 9)).toEqual([]);
    });

    it('returns nothing for a form id that is not in the list', () => {
        expect(sameLineageForms(forms, 404)).toEqual([]);
        expect(sameLineageForms(forms, null)).toEqual([]);
    });
});

const statOf = (question_text: string, average: number, total: number) => ({ question: { question_text }, average, total });

describe('withComparisonDeltas', () => {
    const prior = new Map([
        ['grief over the loss of a loved one.', statOf('x', 3.50, 400)],
        ['dealing with anger.', statOf('x', 4.00, 400)],
        ['nobody answered this one.', statOf('x', 0, 0)]
    ]);

    it('pairs questions on wording ignoring case and stray whitespace', () => {
        const { questionStats, unmatchedCount } = withComparisonDeltas(
            [statOf('  Grief over   the loss of a LOVED one. ', 3.94, 585)],
            prior
        );

        expect(unmatchedCount).toBe(0);
        expect(questionStats[0].delta).toBeCloseTo(0.44);
        expect(questionStats[0].priorAverage).toBe(3.5);
    });

    it('counts reworded questions as unmatched and leaves them without a delta', () => {
        const { questionStats, unmatchedCount } = withComparisonDeltas(
            [statOf('Coping with anger issues.', 4.2, 585), statOf('Dealing with anger.', 4.2, 585)],
            prior
        );

        expect(unmatchedCount).toBe(1);
        expect(questionStats[0].delta).toBeUndefined();
        expect(questionStats[0].priorAverage).toBeUndefined();
        expect(questionStats[1].delta).toBeCloseTo(0.2);
    });

    it('withholds the delta when either side has no answers, but still reports the match', () => {
        const matchedButEmpty = withComparisonDeltas([statOf('Nobody answered this one.', 3, 10)], prior);
        expect(matchedButEmpty.unmatchedCount).toBe(0);
        expect(matchedButEmpty.questionStats[0].delta).toBeUndefined();
        expect(matchedButEmpty.questionStats[0].priorAverage).toBe(0);

        const noneThisTime = withComparisonDeltas([statOf('Dealing with anger.', 0, 0)], prior);
        expect(noneThisTime.questionStats[0].delta).toBeUndefined();
    });

    it('passes stats through untouched when no comparison form is picked', () => {
        const stats = [statOf('Dealing with anger.', 4.2, 585)];
        const result = withComparisonDeltas(stats, null);
        expect(result).toEqual({ questionStats: stats, unmatchedCount: 0 });
    });
});

const questions = [{ id: 1 }, { id: 2 }];

describe('buildQuestionStats', () => {
    it('pivots the long-form RPC rows into per-question counts, totals and means', () => {
        const [first, second] = buildQuestionStats(questions, [
            { question_id: 1, answer_value: 5, responses: 2 },
            { question_id: 1, answer_value: 3, responses: 1 },
            { question_id: 2, answer_value: 1, responses: 1 }
        ]);

        expect(first.counts).toEqual([0, 0, 1, 0, 2]);
        expect(first.total).toBe(3);
        expect(first.average).toBeCloseTo(13 / 3);
        expect(second.counts).toEqual([1, 0, 0, 0, 0]);
        expect(second.average).toBe(1);
    });

    it('copes with counts arriving as strings, which is how Postgres bigint lands', () => {
        const [stat] = buildQuestionStats([{ id: 1 }], [
            { question_id: '1', answer_value: '4', responses: '600' }
        ]);

        expect(stat.counts).toEqual([0, 0, 0, 600, 0]);
        expect(stat.total).toBe(600);
        expect(stat.average).toBe(4);
    });

    it('ignores out-of-range scores and unknown questions, leaving unanswered ones empty', () => {
        const [stat] = buildQuestionStats([{ id: 1 }], [
            { question_id: 1, answer_value: null, responses: 12 },
            { question_id: 1, answer_value: 0, responses: 3 },
            { question_id: 1, answer_value: 9, responses: 3 },
            { question_id: 99, answer_value: 4, responses: 50 }
        ]);

        expect(stat.counts).toEqual([0, 0, 0, 0, 0]);
        expect(stat.total).toBe(0);
        expect(stat.average).toBe(0);
    });
});

describe('fetchCohortQuestionStats', () => {
    it('returns zeroes for all questions when submissionIds list is empty', async () => {
        const stats = await fetchCohortQuestionStats([{ id: 1 }, { id: 2 }], []);
        expect(stats).toHaveLength(2);
        expect(stats[0].total).toBe(0);
        expect(stats[0].counts).toEqual([0, 0, 0, 0, 0]);
        expect(stats[1].total).toBe(0);
        expect(stats[1].counts).toEqual([0, 0, 0, 0, 0]);
    });
});

