import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CounselingEvaluationsList from './CounselingEvaluationsList';
import type {
    CounselingEvaluationQuestion,
    CounselingEvaluationResponse
} from '../counselingEvaluationService';

const {
    mockExportExcel,
    mockExportPdf,
    mockExportCsv,
    mockExportSinglePdf
} = vi.hoisted(() => ({
    mockExportExcel: vi.fn(async () => {}),
    mockExportPdf: vi.fn(async () => {}),
    mockExportCsv: vi.fn(() => {}),
    mockExportSinglePdf: vi.fn(async () => {})
}));

vi.mock('../counselingEvaluationExport', () => ({
    computeEvaluationDemographics: vi.fn((evals: any[]) => ({
        sexCounts: { Female: 1 },
        genderCounts: { Cisgender: 1 },
        uniqueStudents: evals.length,
        totalResponses: evals.length
    })),
    exportCounselingEvaluationsExcel: mockExportExcel,
    exportCounselingEvaluationsPdf: mockExportPdf,
    exportCounselingEvaluationsCsv: mockExportCsv,
    exportSingleCounselingEvaluationPdf: mockExportSinglePdf
}));

describe('CounselingEvaluationsList', () => {
    const mockQuestions: CounselingEvaluationQuestion[] = [
        {
            id: 1,
            form_id: 10,
            question_text: 'Quality of service',
            question_type: 'scale',
            order_index: 1,
            is_required: true
        }
    ];

    const mockEvaluations: CounselingEvaluationResponse[] = [
        {
            id: 1,
            form_id: 10,
            counseling_request_id: 100,
            student_id: '42010001',
            student_name: 'Alex Reyes',
            department: 'CAS',
            course: 'BS Psychology',
            year_level: '3rd Year',
            sex: 'Female',
            gender_identity: 'Cisgender',
            submitted_at: '2026-08-25T08:00:00.000Z',
            counseling_requests: {
                id: 100,
                created_at: '2026-08-24T08:00:00.000Z',
                scheduled_date: '2026-08-25T07:00:00.000Z'
            },
            counseling_evaluation_answers: [{ question_id: 1, answer_value: 5, answer_text: null }]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the Export button and opens format choices', async () => {
        render(
            <CounselingEvaluationsList
                evaluations={mockEvaluations}
                questions={mockQuestions}
                hasForm={true}
                isLoading={false}
                isError={false}
                onRetry={vi.fn()}
            />
        );

        const exportBtn = screen.getByRole('button', { name: /export/i });
        expect(exportBtn).toBeInTheDocument();

        fireEvent.click(exportBtn);

        expect(screen.getByText('Excel Spreadsheet (.xlsx)')).toBeInTheDocument();
        expect(screen.getByText('PDF Summary Report (.pdf)')).toBeInTheDocument();
        expect(screen.getByText('CSV Data File (.csv)')).toBeInTheDocument();
    });

    it('triggers PDF summary export when PDF option is clicked', async () => {
        render(
            <CounselingEvaluationsList
                evaluations={mockEvaluations}
                questions={mockQuestions}
                hasForm={true}
                isLoading={false}
                isError={false}
                onRetry={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /export/i }));
        fireEvent.click(screen.getByText('PDF Summary Report (.pdf)'));

        await waitFor(() => {
            expect(mockExportPdf).toHaveBeenCalledTimes(1);
            expect(mockExportPdf).toHaveBeenCalledWith(mockEvaluations, mockQuestions, undefined);
        });
    });

    it('triggers Excel export with search scope when search is active', async () => {
        render(
            <CounselingEvaluationsList
                evaluations={mockEvaluations}
                questions={mockQuestions}
                hasForm={true}
                isLoading={false}
                isError={false}
                onRetry={vi.fn()}
            />
        );

        const searchInput = screen.getByPlaceholderText('Filter student or ID...');
        fireEvent.change(searchInput, { target: { value: 'Alex' } });

        fireEvent.click(screen.getByRole('button', { name: /export/i }));
        fireEvent.click(screen.getByText('Excel Spreadsheet (.xlsx)'));

        await waitFor(() => {
            expect(mockExportExcel).toHaveBeenCalledTimes(1);
            expect(mockExportExcel).toHaveBeenCalledWith(
                mockEvaluations,
                mockQuestions,
                'Search: "Alex"'
            );
        });
    });

    it('allows exporting single student evaluation PDF from expanded row', async () => {
        render(
            <CounselingEvaluationsList
                evaluations={mockEvaluations}
                questions={mockQuestions}
                hasForm={true}
                isLoading={false}
                isError={false}
                onRetry={vi.fn()}
            />
        );

        // Expand student accordion
        const studentRow = screen.getByRole('button', { name: /alex reyes/i });
        fireEvent.click(studentRow);

        // Click individual PDF export button
        const singlePdfBtn = screen.getByRole('button', { name: /^pdf$/i });
        expect(singlePdfBtn).toBeInTheDocument();
        fireEvent.click(singlePdfBtn);

        await waitFor(() => {
            expect(mockExportSinglePdf).toHaveBeenCalledTimes(1);
            expect(mockExportSinglePdf).toHaveBeenCalledWith(mockEvaluations[0], mockQuestions);
        });
    });
});
