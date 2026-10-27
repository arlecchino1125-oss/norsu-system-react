import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PublicEventsView from './PublicEventsView';
import type { PublicEvent, PublicEventStatus } from '../publicEventsService';

const event: PublicEvent = {
    id: 12,
    created_at: '2026-10-10T09:00:00',
    title: 'Campus Workshop',
    type: 'Event',
    description: 'Workshop details',
    location: 'CARE Center',
    event_date: '2026-10-10',
    event_time: '09:00:00',
    end_time: '11:00:00',
    attendees: null,
    is_archived: false,
    participation_mode: 'open_to_all',
    audience_type: 'all_students',
    audience_departments: null,
    audience_courses: null,
    audience_year_levels: null,
    audience_sections: null,
    allow_walk_ins: true,
    capacity: null,
    registration_deadline: null,
    require_photo: false,
    require_geolocation: false,
    attendance_closes_at: '2026-10-12T11:00:00',
};

const status: PublicEventStatus = {
    event_id: event.id,
    time_in: null,
    time_out: null,
    rated: false,
    evaluated: false,
    has_evaluation_form: true,
};

const renderEvents = (currentStatus = status) => {
    const onRate = vi.fn();
    const onEvaluate = vi.fn();
    render(<PublicEventsView
        eventsList={[event]}
        statusMap={{ [event.id]: currentStatus }}
        isSignedIn
        isLoading={false}
        isError={false}
        timingInEventId={null}
        timingOutEventId={null}
        onRefresh={vi.fn()}
        onTimeIn={vi.fn()}
        onTimeOut={vi.fn()}
        onRate={onRate}
        onEvaluate={onEvaluate}
    />);
    return { onRate, onEvaluate };
};

describe('PublicEventsView card feedback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-10T12:00:00'));
    });

    afterEach(() => vi.useRealTimers());

    it('opens feedback from card buttons without opening event details, including keyboard activation', () => {
        const { onRate, onEvaluate } = renderEvents();
        const rate = screen.getByRole('button', { name: 'Rate' });
        const evaluation = screen.getByRole('button', { name: 'Evaluation Form' });
        expect(evaluation).toHaveClass('w-full');
        expect(evaluation.parentElement).toContainElement(screen.getByRole('button', { name: 'Time In' }));
        expect(evaluation.parentElement).not.toContainElement(rate);

        fireEvent.keyDown(rate, { key: 'Enter' });
        fireEvent.click(rate);
        fireEvent.keyDown(evaluation, { key: ' ' });
        fireEvent.click(evaluation);

        expect(onRate).toHaveBeenCalledWith(event);
        expect(onEvaluate).toHaveBeenCalledWith(event);
        expect(screen.queryByText('Workshop details')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Time In' })).toBeEnabled();

        fireEvent.keyDown(screen.getByText(event.title).closest('[role="button"]')!, { key: 'Enter' });
        expect(screen.getByText('Workshop details')).toBeInTheDocument();
    });

    it('keeps answered feedback hidden', () => {
        renderEvents({ ...status, rated: true, evaluated: true });
        expect(screen.queryByRole('button', { name: 'Rate' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Evaluation Form' })).not.toBeInTheDocument();
    });
});
