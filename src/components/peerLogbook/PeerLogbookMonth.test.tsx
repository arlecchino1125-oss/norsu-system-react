import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PeerLogbookMonth from './PeerLogbookMonth';

vi.mock('@tanstack/react-query', () => ({
    useQuery: () => ({ data: [], isFetching: false })
}));

const entries = [{
    id: 'entry-1',
    logbook_id: 'book-1',
    logbook_month: '2026-07-01',
    entry_date: '2026-07-14',
    logged_at: '2026-07-14T06:30:00.000Z',
    activity_type: 'One-on-one peer support',
    assisted_student_id: '420135501',
    assisted_initials: null,
    concern: 'Struggling with academic load',
    action_taken: 'Listened and shared study planning',
    remarks: 'Check back next week',
    referred: true,
    students: { first_name: 'Reynel', last_name: 'Repaso' }
}];

describe('PeerLogbookMonth', () => {
    const baseProps = {
        entries,
        monthKey: '2026-07',
        peerStudentId: '420100001',
        isSaving: false,
        onSaveEntry: vi.fn(),
        onDeleteEntry: vi.fn()
    };

    it('shows only the date and activity type on the card', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly={false} />);
        expect(screen.getByText('One-on-one peer support')).toBeInTheDocument();
    });

    // The whole point of the two-line card: a logbook open on a phone in a
    // corridor must not expose who was assisted or what was discussed.
    it('never leaks the assisted student or the concern to the list', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly={false} />);
        expect(screen.queryByText(/Reynel/)).not.toBeInTheDocument();
        expect(screen.queryByText(/R\.R\./)).not.toBeInTheDocument();
        expect(screen.queryByText(/Struggling with academic load/)).not.toBeInTheDocument();
    });

    it('flags a referred entry without naming anyone', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly={false} />);
        expect(screen.getByText('Referred')).toBeInTheDocument();
    });

    it('offers no way to add an entry when read only', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly />);
        expect(screen.queryByRole('button', { name: /add entry/i })).not.toBeInTheDocument();
    });

    it('offers an add button when editable', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly={false} />);
        expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
    });

    it('tells the peer the month is empty', () => {
        render(<PeerLogbookMonth {...baseProps} entries={[]} readOnly={false} />);
        expect(screen.getByText(/no peer support logged/i)).toBeInTheDocument();
    });
});
