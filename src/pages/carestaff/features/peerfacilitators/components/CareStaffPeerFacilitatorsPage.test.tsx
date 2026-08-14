import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CareStaffPeerFacilitatorsPage from './CareStaffPeerFacilitatorsPage';

const applications = [{
    id: 'application-1',
    student_id: '420135501',
    school_year: '2026',
    status: 'pending',
    created_at: '2026-07-24T08:00:00.000Z',
    organizations: 'Student Council',
    motivation: 'Support fellow students.',
    skills: 'Listening',
    commitment: 'Available weekly',
    students: {
        first_name: 'Reynel',
        middle_name: null,
        last_name: 'Repaso',
        suffix: null,
        age: 20,
        sex: 'Male',
        course: 'Bachelor of Science in Agribusiness',
        department: 'CAFF',
        year_level: '1st Year',
        email: 'reynel@example.com',
        mobile: '09123456789'
    }
}];

const facilitators = [{
    id: 'facilitator-1',
    student_id: '420135501',
    peer_year: '2026',
    source: 'application',
    created_at: '2026-07-24T08:00:00.000Z',
    students: applications[0].students
}];

const sessions = [{
    id: 'session-1',
    student_id: '420135501',
    time_in: '2026-07-26T08:00:00.000Z',
    time_out: '2026-07-26T10:00:00.000Z',
    students: applications[0].students
}];

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useQuery: ({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === 'peer-facilitator-settings') {
            return { data: { school_year: '2026', applications_open: false, time_in_enabled: true }, isLoading: false };
        }
        if (queryKey[0] === 'care-staff-volunteer-apps') return { data: applications, isLoading: false };
        if (queryKey[0] === 'care-staff-active-facilitators') return { data: facilitators, isLoading: false };
        if (queryKey[0] === 'care-staff-facilitator-hours') return { data: sessions, isLoading: false };
        return { data: [], isLoading: false, isFetching: false };
    }
}));

const renderPage = () => render(
    <main id="staff-content-region" className="relative">
        <CareStaffPeerFacilitatorsPage functions={{ showToast: vi.fn() }} />
    </main>
);

const expectFullRegionDialog = (name: string) => {
    const dialog = screen.getByRole('dialog', { name });
    expect(dialog.parentElement).toHaveClass('absolute', 'inset-x-0', 'bottom-0', 'top-[4.25rem]');
    return dialog;
};

describe('CareStaffPeerFacilitatorsPage layout', () => {
    beforeEach(() => vi.clearAllMocks());

    it('keeps application controls beside the tabs and anchors application review to the content region', async () => {
        renderPage();

        const controls = await screen.findByLabelText('Application controls');
        expect(controls).toContainElement(screen.getByLabelText('Current application year'));
        expect(controls.parentElement).toContainElement(screen.getByRole('tablist', { name: 'Peer facilitator sections' }));
        expect(controls.firstElementChild).toHaveClass('2xl:flex-nowrap');

        const applicationsTable = screen.getByRole('table');
        expect(applicationsTable.parentElement).toHaveClass('min-h-0', 'flex-1', 'overflow-auto');
        expect(applicationsTable.parentElement?.parentElement).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');

        fireEvent.click(screen.getByRole('button', { name: 'Review' }));
        expectFullRegionDialog('Application Details');
    });

    // The staff asked for approval to live with the college designate, who knows
    // the applicant. CARE staff keep the read-only view of what was submitted.
    it('offers no approve or reject action on an application', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Review' }));
        const dialog = expectFullRegionDialog('Application Details');
        expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
        expect(within(dialog).getByText('Approved or rejected by the college designate.')).toBeInTheDocument();
    });

    it('anchors the add facilitator workflow and offers no archive action', () => {
        renderPage();
        fireEvent.click(screen.getByRole('tab', { name: 'Active Facilitators' }));

        const activeTable = screen.getByRole('table');
        expect(activeTable.parentElement).toHaveClass('min-h-0', 'flex-1', 'overflow-auto');
        expect(activeTable.parentElement?.parentElement).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');

        fireEvent.click(screen.getByRole('button', { name: 'Add Facilitator' }));
        const addDialog = expectFullRegionDialog('Add Peer Facilitator');
        expect(within(addDialog).getByRole('button', { name: 'Add to Active' })).toBeInTheDocument();
        fireEvent.click(within(addDialog).getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByRole('button', { name: 'Archive facilitator' })).not.toBeInTheDocument();
    });

    it('anchors daily time record details to the content region', () => {
        renderPage();
        fireEvent.click(screen.getByRole('tab', { name: 'Facilitator Hours' }));
        fireEvent.click(screen.getByRole('button', { name: 'Reynel Repaso' }));

        const dialog = expectFullRegionDialog('Reynel Repaso');
        expect(within(dialog).getByText('Total for the day')).toBeInTheDocument();
    });
});
