import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CareStaffEventsPage from './CareStaffEventsPage';
import { getEvaluationsForEvents } from '../eventEvaluationService';
import { useCareStaffEvents, createEmptyEvent } from '../hooks/useCareStaffEvents';

vi.mock('../eventEvaluationService', async () => {
    const actual = await vi.importActual<typeof import('../eventEvaluationService')>('../eventEvaluationService');
    return { ...actual, getEvaluationsForEvents: vi.fn() };
});

vi.mock('../hooks/useCareStaffEvents', async () => {
    const actual = await vi.importActual<typeof import('../hooks/useCareStaffEvents')>('../hooks/useCareStaffEvents');
    return { ...actual, useCareStaffEvents: vi.fn() };
});

const feedbackList = Array.from({ length: 21 }, (_, index) => ({
    id: index + 1,
    event_id: 3,
    student_id: `student-${index + 1}`,
    student_name: `Student ${index + 1}`,
    sex: null,
    college: 'CAS',
    date_of_activity: '2026-07-26',
    rating: 5,
    feedback: null,
    q1_score: 5,
    q2_score: 5,
    q3_score: 5,
    q4_score: 5,
    q5_score: 5,
    q6_score: 5,
    q7_score: 5,
    open_best: 'Organization',
    open_suggestions: 'None',
    open_comments: `Review ${index + 1}`,
    submitted_at: '2026-07-26T12:00:00Z'
}));

const baseHookState = {
    showToast: vi.fn(),
    canArchiveRecords: false,
    eventFilter: 'All Items',
    setEventFilter: vi.fn(),
    isRefreshingData: false,
    events: [],
    archivedEvents: [],
    showEventModal: false,
    showDeleteEventModal: false,
    showAttendeesModal: false,
    showAbsentModal: false,
    showRegistrantsModal: false,
    showFeedbackModal: false,
    detailEvent: null,
    attendees: [],
    expectedStudents: [],
    registrations: [],
    feedbackList: [],
    selectedEventTitle: 'Sample event',
    selectedAttendanceEvent: { id: 3, title: 'Sample event', type: 'Event', attendance_required: true },
    selectedFeedbackEvent: null,
    selectedRegistrationEvent: null,
    attendeeFilter: 'All',
    yearLevelFilter: 'All',
    attendeeCourseFilter: 'All',
    attendeeSectionFilter: 'All',
    registrantStatusFilter: 'All',
    setShowAttendeesModal: vi.fn(),
    setShowAbsentModal: vi.fn(),
    setShowFeedbackModal: vi.fn(),
    setExpectedStudents: vi.fn(),
    setSelectedAttendanceEvent: vi.fn(),
    handleRescheduleEvent: vi.fn(),
    handleVoidAttendance: vi.fn(),
    applyScheduleField: vi.fn()
};

describe('CareStaffEventsPage modals', () => {
    beforeEach(() => {
        vi.mocked(getEvaluationsForEvents).mockImplementation(() => new Promise(() => {}));
        vi.mocked(useCareStaffEvents).mockReturnValue(baseHookState as any);
    });

    it('uses the full event modal layout and shows 20 reviews per page', () => {
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            showFeedbackModal: true,
            feedbackList
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByRole('dialog', { name: 'Event Feedback' })).toBeInTheDocument();
        expect(screen.getByText('"Review 20"')).toBeInTheDocument();
        expect(screen.queryByText('"Review 21"')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

        expect(screen.getByText('"Review 21"')).toBeInTheDocument();
        expect(screen.queryByText('"Review 1"')).not.toBeInTheDocument();
    });

    it('shows the event and evaluation dates in the feedback header', async () => {
        vi.mocked(getEvaluationsForEvents).mockResolvedValue(new Map([[
            3,
            {
                form: {
                    id: 8,
                    event_id: 3,
                    title: 'Sample evaluation',
                    description: null,
                    is_active: true,
                    created_at: '2026-07-25T12:00:00Z'
                },
                responseCount: 2
            }
        ]]));
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            events: [{ id: 3, title: 'Sample event', type: 'Event', event_date: '2026-07-26' }],
            showFeedbackModal: true,
            feedbackList,
            selectedFeedbackEvent: { id: 3, title: 'Sample event', type: 'Event', event_date: '2026-07-26' }
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByText('Event date').parentElement).toHaveTextContent('7/26/2026');
        expect(await screen.findByText('Evaluation created')).toBeInTheDocument();
        expect(screen.getByText('Evaluation created').parentElement).toHaveTextContent('7/25/2026');
    });

    it.each([
        ['attendees', 'showAttendeesModal', 'Loading attendees'],
        ['absent students', 'showAbsentModal', 'Loading absent students']
    ])('shows a shape-matched loading state inside the %s modal', (_name, modalFlag, loadingLabel) => {
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            [modalFlag]: true,
            isAttendanceLoading: true
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByRole('status', { name: loadingLabel })).toBeInTheDocument();
    });

    it('offers an attendance closing date and tucks the proof toggles under Advanced', () => {
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            showEventModal: true,
            editingEventId: null,
            newEvent: { ...createEmptyEvent(), type: 'Event' },
            setNewEvent: vi.fn(),
            setShowEventModal: vi.fn(),
            setEditingEventId: vi.fn(),
            createEvent: vi.fn(),
            departmentOptions: [],
            courseOptions: [],
            getCurrentLocation: vi.fn(),
            renderAudienceCheckboxGroup: () => null
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByLabelText(/attendance closes/i)).toBeInTheDocument();

        // <details> keeps its children mounted while closed, so the toggles are
        // findable — what this asserts is that they start collapsed, not absent.
        const advanced = screen.getByText('Advanced').closest('details') as HTMLDetailsElement;
        expect(advanced).not.toBeNull();
        expect(advanced.open).toBe(false);
        expect(screen.getByLabelText(/require photo on time in/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/require geolocation/i)).toBeInTheDocument();
    });
});

describe('CareStaffEventsPage reschedule & void UI', () => {
    it('opens the reschedule modal pre-filled and confirms through the handler', () => {
        const handleRescheduleEvent = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            events: [{
                id: 3,
                title: 'Sample event',
                type: 'Event',
                event_date: '2026-07-26',
                event_time: '09:00',
                end_time: '12:00',
                description: 'A sample attendance event'
            }],
            handleRescheduleEvent
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }));
        });
        const dateInput = screen.getByLabelText('Date') as HTMLInputElement;
        expect(dateInput.value).toBe('2026-07-26');
        expect((screen.getByLabelText('Start time') as HTMLInputElement).value).toBe('09:00');
        expect((screen.getByLabelText('End time') as HTMLInputElement).value).toBe('12:00');

        act(() => {
            fireEvent.change(dateInput, { target: { value: '2026-07-27' } });
        });
        act(() => {
            fireEvent.click(screen.getAllByRole('button', { name: 'Reschedule' })[1]); // modal confirm
        });

        expect(handleRescheduleEvent).toHaveBeenCalledWith(
            expect.objectContaining({ id: 3 }),
            { event_date: '2026-07-27', event_time: '09:00', end_time: '12:00' }
        );
    });

    it('shows the void confirm only when there are attendees and confirms via the handler', () => {
        const handleVoidAttendance = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            showAttendeesModal: true,
            attendees: [{ id: 1, student_id: 'S1', student_name: 'Alice', department: 'CAS', course: 'BSCS', year_level: '2nd Year', section: 'A', time_in: '2026-07-26T09:00:00Z' }],
            selectedAttendanceEvent: { id: 3, title: 'Sample event', type: 'Event', attendance_required: true },
            handleVoidAttendance
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        const voidButton = screen.getByRole('button', { name: 'Void All Attendance' });
        expect(voidButton).toBeInTheDocument();
        act(() => {
            fireEvent.click(voidButton);
        });

        expect(screen.getByText('Void all attendance?')).toBeInTheDocument();
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Yes, void all attendance' }));
        });

        expect(handleVoidAttendance).toHaveBeenCalledWith(3);
    });

    it('hides the void button when the event has no attendees', () => {
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            showAttendeesModal: true,
            attendees: []
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.queryByRole('button', { name: 'Void All Attendance' })).not.toBeInTheDocument();
    });
});
