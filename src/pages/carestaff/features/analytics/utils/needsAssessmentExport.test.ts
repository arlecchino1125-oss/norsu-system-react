import { describe, expect, it } from 'vitest';
import {
    buildStudentResponsesSheetData,
    computeGenderDemographics,
    getDescriptiveEquivalent,
    processQuestionStatsForExport,
    sanitizeFileName
} from './needsAssessmentExport';

describe('needsAssessmentExport statistical processing', () => {
    describe('getDescriptiveEquivalent', () => {
        it('maps mean values to correct verbal interpretations', () => {
            expect(getDescriptiveEquivalent(4.85)).toBe('Very High Need');
            expect(getDescriptiveEquivalent(4.20)).toBe('Very High Need');
            expect(getDescriptiveEquivalent(4.19)).toBe('High Need');
            expect(getDescriptiveEquivalent(3.40)).toBe('High Need');
            expect(getDescriptiveEquivalent(3.39)).toBe('Moderate Need');
            expect(getDescriptiveEquivalent(2.60)).toBe('Moderate Need');
            expect(getDescriptiveEquivalent(2.59)).toBe('Low Need');
            expect(getDescriptiveEquivalent(1.80)).toBe('Low Need');
            expect(getDescriptiveEquivalent(1.79)).toBe('Very Low Need');
            expect(getDescriptiveEquivalent(1.00)).toBe('Very Low Need');
            expect(getDescriptiveEquivalent(0)).toBe('No Data');
        });
    });

    describe('sanitizeFileName', () => {
        it('removes invalid characters and keeps clean names', () => {
            expect(sanitizeFileName('2026-2027 Needs Assessment Form / Inventory?')).toBe('2026-2027_Needs_Assessment_Form_Inventory_');
        });
    });

    describe('processQuestionStatsForExport', () => {
        const mockStats = [
            {
                question: { id: 1, question_text: 'Grief over the loss of a loved one.' },
                counts: [10, 20, 30, 40, 100], // total = 200, sum = 10*1 + 20*2 + 30*3 + 40*4 + 100*5 = 10+40+90+160+500 = 800 -> WM = 4.00
                total: 200,
                average: 4.00
            },
            {
                question: { id: 2, question_text: 'Coping with disaster/crisis/calamities.' },
                counts: [5, 10, 15, 20, 150], // total = 200, sum = 5+20+45+80+750 = 900 -> WM = 4.50
                total: 200,
                average: 4.50
            },
            {
                question: { id: 3, question_text: 'Transitioning to a new school.' },
                counts: [100, 50, 30, 10, 10], // total = 200, sum = 100+100+90+40+50 = 380 -> WM = 1.90
                total: 200,
                average: 1.90
            },
            {
                question: { id: 4, question_text: 'Financial distress.' },
                counts: [0, 0, 0, 50, 150], // total = 200, sum = 200 + 750 = 950 -> WM = 4.75
                total: 200,
                average: 4.75
            },
            {
                question: { id: 5, question_text: 'Unanswered question.' },
                counts: [0, 0, 0, 0, 0],
                total: 0,
                average: 0
            }
        ];

        it('computes weighted means and percentage distributions accurately', () => {
            const { items } = processQuestionStatsForExport(mockStats);

            expect(items).toHaveLength(5);

            // Item 1
            expect(items[0].weightedMean).toBe(4.00);
            expect(items[0].descriptiveEquivalent).toBe('High Need');
            expect(items[0].percentages).toEqual([5.0, 10.0, 15.0, 20.0, 50.0]);
            expect(items[0].fivePercentage).toBe(50.0);

            // Item 2
            expect(items[1].weightedMean).toBe(4.50);
            expect(items[1].descriptiveEquivalent).toBe('Very High Need');
            expect(items[1].fivePercentage).toBe(75.0);

            // Item 4
            expect(items[3].weightedMean).toBe(4.75);
            expect(items[3].descriptiveEquivalent).toBe('Very High Need');
            expect(items[3].fivePercentage).toBe(75.0);

            // Unanswered Item 5
            expect(items[4].weightedMean).toBe(0);
            expect(items[4].descriptiveEquivalent).toBe('No Data');
            expect(items[4].rank).toBe(0);
        });

        it('assigns correct descending ranks based on weighted mean', () => {
            const { items } = processQuestionStatsForExport(mockStats);

            // Ranks:
            // Item 4 (WM 4.75) -> Rank 1
            // Item 2 (WM 4.50) -> Rank 2
            // Item 1 (WM 4.00) -> Rank 3
            // Item 3 (WM 1.90) -> Rank 4
            expect(items[3].rank).toBe(1);
            expect(items[1].rank).toBe(2);
            expect(items[0].rank).toBe(3);
            expect(items[2].rank).toBe(4);
        });

        it('extracts top highest and lowest need statements', () => {
            const { topHighestNeeds, topLowestNeeds, grandMean, grandMeanEquivalent } = processQuestionStatsForExport(mockStats);

            expect(topHighestNeeds[0].questionId).toBe(4); // Financial distress (WM 4.75)
            expect(topHighestNeeds[1].questionId).toBe(2); // Coping with disaster (WM 4.50)
            expect(topHighestNeeds[2].questionId).toBe(1); // Grief (WM 4.00)

            expect(topLowestNeeds[0].questionId).toBe(3); // Transitioning to a new school (WM 1.90)

            // Grand Mean of answered items: (4.00 + 4.50 + 1.90 + 4.75) / 4 = 15.15 / 4 = 3.7875 -> 3.79
            expect(grandMean).toBeCloseTo(3.79);
            expect(grandMeanEquivalent).toBe('High Need');
        });
    });

    describe('computeGenderDemographics', () => {
        it('calculates counts for Female, Male, and other sexes accurately', () => {
            const mockSubs = [
                { students: { sex: 'Female', gender_identity: 'Cis-gender' } },
                { students: { sex: 'Female', gender_identity: 'CIS Gender' } },
                { students: { sex: 'female', gender_identity: 'Transgender' } },
                { students: { sex: 'Male', gender_identity: 'Cisgender' } },
                { students: { sex: 'male', gender_identity: 'Non-binary gender' } },
                { students: { sex: 'Other', gender_identity: 'Prefer not to say' } },
                { students: {} }
            ];

            const result = computeGenderDemographics(mockSubs);
            expect(result.total).toBe(7);
            expect(result.sexCounts.female).toBe(3);
            expect(result.sexCounts.male).toBe(2);
            expect(result.sexCounts.other).toBe(2);

            expect(result.genderCounts.cisgender).toBe(3);
            expect(result.genderCounts.transgender).toBe(1);
            expect(result.genderCounts.nonBinary).toBe(1);
            expect(result.genderCounts.preferNotToSay).toBe(1);
            expect(result.genderCounts.other).toBe(1);
        });

        it('handles empty or missing submissions cleanly', () => {
            const emptyResult = computeGenderDemographics([]);
            expect(emptyResult.total).toBe(0);
            expect(emptyResult.sexCounts).toEqual({ female: 0, male: 0, other: 0 });
            expect(emptyResult.genderCounts).toEqual({ cisgender: 0, transgender: 0, nonBinary: 0, preferNotToSay: 0, other: 0 });
        });
    });

    describe('buildStudentResponsesSheetData', () => {
        const mockQuestions = [
            { id: 101, question_text: 'Feeling overwhelmed by academic workload.', question_type: 'scale' },
            { id: 102, question_text: 'Difficulty managing time effectively.', question_type: 'scale' },
            { id: 103, question_text: 'Additional feedback or concerns.', question_type: 'text' }
        ];

        const mockResponses = [
            {
                submissionId: 1,
                studentId: '2023-0001',
                studentName: 'Dela Cruz, Juan',
                department: 'College of Arts and Sciences',
                course: 'BS Computer Science',
                yearLevel: '3rd Year',
                sex: 'Male',
                genderIdentity: 'CIS Gender',
                submittedAt: '9/4/2026, 9:00:00 AM',
                answers: {
                    101: 5,
                    102: 4,
                    103: 'Need tutorial sessions'
                }
            },
            {
                submissionId: 2,
                studentId: '2023-0002',
                studentName: 'Santos, Maria',
                department: 'College of Education',
                course: 'BSEd English',
                yearLevel: '2nd Year',
                sex: 'Female',
                genderIdentity: 'CIS Gender',
                submittedAt: '9/4/2026, 9:15:00 AM',
                answers: {
                    101: 3
                }
            }
        ];

        it('generates correct headers including all questions formatted as Q1, Q2, etc.', () => {
            const { headers } = buildStudentResponsesSheetData(mockResponses, mockQuestions);

            expect(headers).toEqual([
                'Student Name',
                'Student ID',
                'College / Department',
                'Course',
                'Year Level',
                'Sex Assigned at Birth',
                'Gender Identity',
                'Submitted At',
                'Q1: Feeling overwhelmed by academic workload.',
                'Q2: Difficulty managing time effectively.',
                'Q3: Additional feedback or concerns.'
            ]);
        });

        it('maps student demographics and question answers correctly with fallback for missing values', () => {
            const { rows } = buildStudentResponsesSheetData(mockResponses, mockQuestions);

            expect(rows).toHaveLength(2);

            // Row 1
            expect(rows[0]).toEqual([
                'Dela Cruz, Juan',
                '2023-0001',
                'College of Arts and Sciences',
                'BS Computer Science',
                '3rd Year',
                'Male',
                'CIS Gender',
                '9/4/2026, 9:00:00 AM',
                5,
                4,
                'Need tutorial sessions'
            ]);

            // Row 2 (with unanswered questions)
            expect(rows[1]).toEqual([
                'Santos, Maria',
                '2023-0002',
                'College of Education',
                'BSEd English',
                '2nd Year',
                'Female',
                'CIS Gender',
                '9/4/2026, 9:15:00 AM',
                3,
                '—',
                '—'
            ]);
        });

        it('handles empty responses cleanly', () => {
            const { headers, rows } = buildStudentResponsesSheetData([], mockQuestions);
            expect(headers).toHaveLength(8 + mockQuestions.length);
            expect(rows).toEqual([]);
        });
    });
});

