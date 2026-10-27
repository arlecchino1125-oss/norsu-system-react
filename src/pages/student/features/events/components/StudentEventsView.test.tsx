import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentEventsView from './StudentEventsView';
import * as Icons from '../../../components/StudentPortalIcons';

const mocks = vi.hoisted(() => ({ pending: new Set([12]) }));
const event = {
    id: 12,
    title: 'Campus Workshop',
    type: 'Event',
    event_date: '2026-10-10',
    event_time: '09:00:00',
    end_time: '11:00:00',
    attendance_closes_at: '2026-10-12T11:00:00',
    require_photo: false,
};

vi.mock('../hooks/useStudentEventsData', () => ({
    useStudentEventsData: () => ({ eventsList: [event] }),
}));
vi.mock('@tanstack/react-query', () => ({
    useQuery: () => ({ data: mocks.pending, refetch: vi.fn() }),
}));
vi.mock('../studentEvaluationService', () => ({ getPendingEvaluationEventIds: vi.fn() }));
vi.mock('./StudentEvaluationModal', () => ({
    default: ({ eventId }: { eventId: number }) => <div role="dialog">Evaluation for {eventId}</div>,
}));

const renderEvents = (ratedEvents: number[] = []) => {
    const handleRateEvent = vi.fn();
    const setSelectedEvent = vi.fn();
    render(<StudentEventsView
        eventFilter="All"
        setEventFilter={vi.fn()}
        attendanceMap={{}}
        registrationMap={{}}
        fetchHistory={vi.fn()}
        handleTimeIn={vi.fn()}
        handleTimeOut={vi.fn()}
        handleRateEvent={handleRateEvent}
        ratedEvents={ratedEvents}
        setSelectedEvent={setSelectedEvent}
        personalInfo={{ studentId: 'student-1' }}
        Icons={Icons}
    />);
    return { handleRateEvent, setSelectedEvent };
};

describe('StudentEventsView card feedback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-10T12:00:00'));
        mocks.pending = new Set([event.id]);
    });

    afterEach(() => vi.useRealTimers());

    it('opens feedback without opening event details, including keyboard activation', () => {
        const { handleRateEvent, setSelectedEvent } = renderEvents();
        const rate = screen.getByRole('button', { name: 'Rate' });
        const evaluation = screen.getByRole('button', { name: 'Evaluation Form' });
        expect(evaluation).toHaveClass('w-full');
        expect(evaluation.parentElement).toContainElement(screen.getByRole('button', { name: 'Time In' }));
        expect(evaluation.parentElement).not.toContainElement(rate);

        fireEvent.keyDown(rate, { key: 'Enter' });
        fireEvent.click(rate);
        fireEvent.keyDown(evaluation, { key: ' ' });
        fireEvent.click(evaluation);

        expect(handleRateEvent).toHaveBeenCalledWith(event);
        expect(screen.getByRole('dialog')).toHaveTextContent('Evaluation for 12');
        expect(setSelectedEvent).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Time In' })).toBeEnabled();

        fireEvent.keyDown(screen.getByText(event.title).closest('[role="button"]')!, { key: 'Enter' });
        expect(setSelectedEvent).toHaveBeenCalledWith(event);
    });

    it('keeps answered feedback hidden', () => {
        mocks.pending = new Set();
        renderEvents([event.id]);
        expect(screen.queryByRole('button', { name: 'Rate' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Evaluation Form' })).not.toBeInTheDocument();
    });
});
