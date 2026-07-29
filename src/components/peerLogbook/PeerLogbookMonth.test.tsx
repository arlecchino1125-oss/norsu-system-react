import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        isSaving: false,
        onSaveEntry: vi.fn().mockResolvedValue(undefined),
        onDeleteEntry: vi.fn().mockResolvedValue(undefined)
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

    const fillNewEntry = () => {
        fireEvent.click(screen.getByRole('button', { name: /add entry/i }));
        fireEvent.change(screen.getByLabelText(/type of activity/i), { target: { value: 'Group session' } });
        fireEvent.change(screen.getByLabelText(/concern/i), { target: { value: 'Exam stress' } });
        fireEvent.change(screen.getByLabelText(/action taken/i), { target: { value: 'Talked it through' } });
    };

    // Campus wifi drops mid-save. Closing on the call rather than on the write
    // would bin everything the peer typed -- the longest text in the feature.
    it('keeps the entry open when the save fails', async () => {
        const onSaveEntry = vi.fn().mockRejectedValue(new Error('offline'));
        render(<PeerLogbookMonth {...baseProps} onSaveEntry={onSaveEntry} entries={[]} readOnly={false} />);

        fillNewEntry();
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

        await waitFor(() => expect(onSaveEntry).toHaveBeenCalled());
        expect(screen.getByLabelText(/concern/i)).toHaveValue('Exam stress');
    });

    it('closes the entry once the save lands', async () => {
        const onSaveEntry = vi.fn().mockResolvedValue(undefined);
        render(<PeerLogbookMonth {...baseProps} onSaveEntry={onSaveEntry} entries={[]} readOnly={false} />);

        fillNewEntry();
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

        await waitFor(() => expect(screen.queryByLabelText(/concern/i)).not.toBeInTheDocument());
    });
});
