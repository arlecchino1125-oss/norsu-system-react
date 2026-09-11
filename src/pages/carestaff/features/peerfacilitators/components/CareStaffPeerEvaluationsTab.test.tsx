import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CareStaffPeerEvaluationsTab from './CareStaffPeerEvaluationsTab';
import * as exportUtils from '../peerEventEvaluationExport';

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false }
        }
    });

const renderComponent = (props: any) => {
    const client = createTestQueryClient();
    return render(
        <QueryClientProvider client={client}>
            <CareStaffPeerEvaluationsTab {...props} />
        </QueryClientProvider>
    );
};

const mockPeerEvents = [
    {
        id: 101,
        title: 'Peer Facilitator Leadership Training',
        description: 'Annual training seminar for active peer facilitators.',
        event_date: '2026-09-15',
        event_time: '09:00 AM',
        end_time: '04:00 PM',
        location: 'CARE Training Hall',
        audience_type: 'peer_facilitators',
        event_attendance: [{ count: 15 }],
        event_evaluation_forms: [
            {
                id: 201,
                title: 'Peer Training Evaluation Form',
                description: 'Feedback on leadership modules and facilitation techniques.',
                is_active: true,
                created_at: '2026-09-10T08:00:00.000Z',
                event_evaluation_responses: [{ count: 2 }]
            }
        ]
    }
];

const mockQuestions = [
    {
        id: 1,
        form_id: 201,
        question_text: 'The training objectives were clearly explained.',
        question_type: 'scale',
        scale_max: 5,
        order_index: 1
    },
    {
        id: 2,
        form_id: 201,
        question_text: 'What did you find most useful about the training?',
        question_type: 'text',
        scale_max: null,
        order_index: 2
    }
];

const mockResponses = [
    {
        id: 301,
        student_id: '420135501',
        student_name: 'Reynel Repaso',
        department: 'CAFF',
        course: 'Bachelor of Science in Agribusiness',
        year_level: '1st Year',
        submitted_at: '2026-09-15T16:30:00.000Z',
        students: {
            student_id: '420135501',
            first_name: 'Reynel',
            last_name: 'Repaso',
            department: 'CAFF',
            course: 'Bachelor of Science in Agribusiness',
            year_level: '1st Year',
            sex: 'Male',
            gender_identity: 'CIS Gender'
        },
        event_evaluation_answers: [
            { response_id: 301, question_id: 1, answer_value: 5, answer_text: null },
            { response_id: 301, question_id: 2, answer_value: null, answer_text: 'Role playing scenarios was very insightful.' }
        ]
    }
];

vi.mock('../../../../../lib/supabase', () => ({
    supabase: {
        from: (table: string) => {
            if (table === 'events') {
                return {
                    select: () => ({
                        eq: () => ({
                            order: vi.fn().mockResolvedValue({ data: mockPeerEvents, error: null })
                        })
                    })
                };
            }
            if (table === 'event_evaluation_forms') {
                return {
                    update: () => ({
                        eq: vi.fn().mockResolvedValue({ error: null })
                    })
                };
            }
            if (table === 'event_evaluation_questions') {
                return {
                    select: () => ({
                        eq: () => ({
                            order: vi.fn().mockResolvedValue({ data: mockQuestions, error: null })
                        })
                    })
                };
            }
            if (table === 'event_evaluation_responses') {
                return {
                    select: () => ({
                        eq: () => ({
                            order: () => ({
                                limit: vi.fn().mockResolvedValue({ data: mockResponses, error: null })
                            })
                        })
                    })
                };
            }
            return {
                select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) })
            };
        }
    }
}));

describe('CareStaffPeerEvaluationsTab', () => {
    const showToast = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders peer event cards with title, attendance, and evaluation count', async () => {
        renderComponent({ functions: { showToast } });

        expect(await screen.findByText('Peer Facilitator Leadership Training')).toBeInTheDocument();
        expect(screen.getByText('CARE Training Hall')).toBeInTheDocument();
        expect(screen.getByText('View details')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('navigates to event details and displays respondents table', async () => {
        renderComponent({ functions: { showToast } });

        const viewDetailsBtn = await screen.findByText('View details');
        fireEvent.click(viewDetailsBtn);

        expect(await screen.findByText('Back to Peer Events')).toBeInTheDocument();
        expect(await screen.findByText('Reynel Repaso')).toBeInTheDocument();
        expect(screen.getByText('420135501')).toBeInTheDocument();
        expect(screen.getByText('Bachelor of Science in Agribusiness')).toBeInTheDocument();
        expect(screen.getByText(/View answers/)).toBeInTheDocument();
    });

    it('opens student answers view and navigates back to the respondents table', async () => {
        renderComponent({ functions: { showToast } });

        fireEvent.click(await screen.findByText('View details'));

        const viewAnswersBtn = await screen.findByText(/View answers/);
        fireEvent.click(viewAnswersBtn);

        expect(await screen.findByText('Back to respondents')).toBeInTheDocument();
        expect(screen.getByText(/The training objectives were clearly explained/)).toBeInTheDocument();
        expect(screen.getByText('Score: 5 / 5')).toBeInTheDocument();
        expect(screen.getByText('Role playing scenarios was very insightful.')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Back to respondents'));
        expect(await screen.findByText('Back to Peer Events')).toBeInTheDocument();
    });

    it('triggers Excel and PDF export functions', async () => {
        const excelSpy = vi.spyOn(exportUtils, 'exportPeerEventEvaluationExcel').mockResolvedValue(undefined);
        const pdfSpy = vi.spyOn(exportUtils, 'exportPeerEventEvaluationPdf').mockResolvedValue(undefined);

        renderComponent({ functions: { showToast } });

        fireEvent.click(await screen.findByText('View details'));
        expect(await screen.findByText('Reynel Repaso')).toBeInTheDocument();

        const excelBtn = await screen.findByText('Export Excel');
        fireEvent.click(excelBtn);

        await waitFor(() => {
            expect(excelSpy).toHaveBeenCalled();
            expect(showToast).toHaveBeenCalledWith('Excel report generated successfully.', 'success');
        });

        const pdfBtn = screen.getByText('Export PDF');
        fireEvent.click(pdfBtn);

        await waitFor(() => {
            expect(pdfSpy).toHaveBeenCalled();
            expect(showToast).toHaveBeenCalledWith('PDF report generated successfully.', 'success');
        });
    });
});
