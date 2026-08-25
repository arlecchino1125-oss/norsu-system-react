import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    computeEvaluationDemographics,
    exportCounselingEvaluationsCsv,
    exportCounselingEvaluationsExcel,
    exportCounselingEvaluationsPdf,
    exportSingleCounselingEvaluationPdf
} from './counselingEvaluationExport';
import type {
    CounselingEvaluationQuestion,
    CounselingEvaluationResponse
} from './counselingEvaluationService';

const { mockAutoTable, mockJsPdfInstance, mockXlsx } = vi.hoisted(() => {
    const mockJsPdfInstance = {
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        setTextColor: vi.fn(),
        setFillColor: vi.fn(),
        setDrawColor: vi.fn(),
        roundedRect: vi.fn(),
        text: vi.fn(),
        line: vi.fn(),
        addPage: vi.fn(),
        save: vi.fn(),
        internal: {
            pageSize: {
                getWidth: vi.fn(() => 210),
                getHeight: vi.fn(() => 297)
            }
        },
        lastAutoTable: { finalY: 60 }
    };

    const mockAutoTable = vi.fn();

    const mockXlsx = {
        utils: {
            aoa_to_sheet: vi.fn((data: any) => ({ '!data': data })),
            book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
            book_append_sheet: vi.fn()
        },
        writeFile: vi.fn()
    };

    return { mockAutoTable, mockJsPdfInstance, mockXlsx };
});

vi.mock('../../../../lib/exportVendors', () => ({
    loadJsPdfAutoTable: vi.fn(async () => ({
        jsPDF: vi.fn(() => mockJsPdfInstance),
        autoTable: mockAutoTable
    })),
    loadXlsx: vi.fn(async () => mockXlsx)
}));

describe('counselingEvaluationExport', () => {
    const mockQuestions: CounselingEvaluationQuestion[] = [
        {
            id: 1,
            form_id: 10,
            question_text: 'How satisfied were you with the guidance provided?',
            question_type: 'scale',
            order_index: 1,
            is_required: true
        },
        {
            id: 2,
            form_id: 10,
            question_text: 'Any additional comments?',
            question_type: 'text',
            order_index: 2,
            is_required: false
        }
    ];

    const mockEvaluations: CounselingEvaluationResponse[] = [
        {
            id: 101,
            form_id: 10,
            counseling_request_id: 501,
            student_id: 'STUD-001',
            student_name: 'Alice Johnson',
            department: 'College of Arts and Sciences',
            course: 'BS Psychology',
            year_level: '3rd Year',
            sex: 'Female',
            gender_identity: 'Cisgender',
            submitted_at: '2026-08-20T10:00:00.000Z',
            counseling_requests: {
                id: 501,
                created_at: '2026-08-19T08:00:00.000Z',
                scheduled_date: '2026-08-20T09:00:00.000Z'
            },
            counseling_evaluation_answers: [
                { question_id: 1, answer_value: 5, answer_text: null },
                { question_id: 2, answer_value: null, answer_text: 'Very helpful!' }
            ]
        },
        {
            id: 102,
            form_id: 10,
            counseling_request_id: null,
            student_id: 'STUD-002',
            student_name: 'Bob Smith',
            department: 'College of Computer Studies',
            course: 'BSIT',
            year_level: '2nd Year',
            sex: 'Male',
            gender_identity: 'Cisgender',
            submitted_at: '2026-08-21T14:30:00.000Z',
            counseling_requests: null,
            counseling_evaluation_answers: [
                { question_id: 1, answer_value: 4, answer_text: null },
                { question_id: 2, answer_value: null, answer_text: 'Good session' }
            ]
        },
        {
            // Same student as first, to test deduplication in demographics
            id: 103,
            form_id: 10,
            counseling_request_id: 502,
            student_id: 'STUD-001',
            student_name: 'Alice Johnson',
            department: 'College of Arts and Sciences',
            course: 'BS Psychology',
            year_level: '3rd Year',
            sex: 'Female',
            gender_identity: 'Cisgender',
            submitted_at: '2026-08-22T11:00:00.000Z',
            counseling_requests: {
                id: 502,
                created_at: '2026-08-21T08:00:00.000Z',
                scheduled_date: '2026-08-22T10:00:00.000Z'
            },
            counseling_evaluation_answers: [
                { question_id: 1, answer_value: 5, answer_text: null }
            ]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('computeEvaluationDemographics', () => {
        it('deduplicates evaluations by student_id and computes accurate distribution', () => {
            const demo = computeEvaluationDemographics(mockEvaluations);

            expect(demo.totalResponses).toBe(3);
            expect(demo.uniqueStudents).toBe(2);
            expect(demo.sexCounts.Female).toBe(1);
            expect(demo.sexCounts.Male).toBe(1);
            expect(demo.genderCounts.Cisgender).toBe(2);
        });

        it('handles unspecified or empty sex/gender safely', () => {
            const evals: CounselingEvaluationResponse[] = [
                {
                    id: 201,
                    form_id: 10,
                    counseling_request_id: null,
                    student_id: 'STUD-999',
                    student_name: 'Unknown Student',
                    department: null,
                    course: null,
                    year_level: null,
                    sex: null,
                    gender_identity: '',
                    submitted_at: '2026-08-23T10:00:00.000Z'
                }
            ];

            const demo = computeEvaluationDemographics(evals);
            expect(demo.uniqueStudents).toBe(1);
            expect(demo.sexCounts.Unspecified).toBe(1);
            expect(demo.genderCounts.Unspecified).toBe(1);
        });
    });

    describe('exportCounselingEvaluationsExcel', () => {
        it('creates an Excel workbook with Demographics and Responses sheets', async () => {
            await exportCounselingEvaluationsExcel(mockEvaluations, mockQuestions, 'Search: "Psychology"');

            expect(mockXlsx.utils.book_new).toHaveBeenCalledTimes(1);
            expect(mockXlsx.utils.book_append_sheet).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                'Demographics'
            );
            expect(mockXlsx.utils.book_append_sheet).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                'Responses'
            );
            expect(mockXlsx.writeFile).toHaveBeenCalledTimes(1);
            expect(mockXlsx.writeFile.mock.calls[0][1]).toMatch(/^Counseling_Evaluations_\d{4}-\d{2}-\d{2}\.xlsx$/);
        });
    });

    describe('exportCounselingEvaluationsPdf', () => {
        it('generates a PDF report with Demographics and Responses tables', async () => {
            await exportCounselingEvaluationsPdf(mockEvaluations, mockQuestions);

            expect(mockAutoTable).toHaveBeenCalledTimes(2); // Demographics table + Responses table
            expect(mockJsPdfInstance.save).toHaveBeenCalledTimes(1);
            expect(mockJsPdfInstance.save.mock.calls[0][0]).toMatch(/^Counseling_Evaluations_\d{4}-\d{2}-\d{2}\.pdf$/);
        });
    });

    describe('exportCounselingEvaluationsCsv', () => {
        it('creates a CSV download link and clicks it', () => {
            const createObjectURLMock = vi.fn(() => 'blob:mock-url');
            const revokeObjectURLMock = vi.fn();
            window.URL.createObjectURL = createObjectURLMock;
            window.URL.revokeObjectURL = revokeObjectURLMock;

            const appendChildSpy = vi.spyOn(document.body, 'appendChild');
            const removeChildSpy = vi.spyOn(document.body, 'removeChild');

            exportCounselingEvaluationsCsv(mockEvaluations, mockQuestions);

            expect(createObjectURLMock).toHaveBeenCalledTimes(1);
            expect(appendChildSpy).toHaveBeenCalledTimes(1);
            expect(removeChildSpy).toHaveBeenCalledTimes(1);
            expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
        });
    });

    describe('exportSingleCounselingEvaluationPdf', () => {
        it('generates an individual student counseling evaluation PDF', async () => {
            await exportSingleCounselingEvaluationPdf(mockEvaluations[0], mockQuestions);

            expect(mockAutoTable).toHaveBeenCalledTimes(1);
            expect(mockJsPdfInstance.save).toHaveBeenCalledTimes(1);
            expect(mockJsPdfInstance.save.mock.calls[0][0]).toBe('Counseling_Evaluation_Alice_Johnson.pdf');
        });
    });
});
