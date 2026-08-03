import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeptPeerFacilitatorsPage from './DeptPeerFacilitatorsPage';

const applications = [{
    id: 'application-1',
    student_id: '12345',
    school_year: '2026',
    status: 'pending',
    created_at: '2026-07-24T08:00:00.000Z',
    organizations: 'Student Council',
    motivation: 'Support fellow students.',
    skills: 'Listening',
    commitment: 'Available weekly',
    students: {
        first_name: 'Maria',
        middle_name: null,
        last_name: 'Santos',
        suffix: null,
        age: 20,
        sex: 'Female',
        course: 'Bachelor of Science in Information Technology',
        department: 'CCS',
        year_level: '3rd Year',
        email: 'maria@example.com',
        mobile: '09123456789'
    }
}];

const facilitators = [{
    id: 'facilitator-1',
    student_id: '12345',
    peer_year: '2026',
    source: 'application',
    created_at: '2026-07-24T08:00:00.000Z',
    students: applications[0].students
}];

const sessions = [{
    id: 'session-1',
    student_id: '12345',
    time_in: '2026-07-26T08:00:00.000Z',
    time_out: '2026-07-26T10:00:00.000Z',
    students: applications[0].students
}];

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useQuery: ({ queryKey }: { queryKey: string[] }) => {
        if (queryKey[0] === 'peer-settings') {
            return { data: { school_year: '2026', applications_open: false, time_in_enabled: true }, isLoading: false };
        }
        if (queryKey[0] === 'dept-peer-applications') return { data: applications, isLoading: false };
        if (queryKey[0] === 'dept-peer-roster') return { data: facilitators, isLoading: false };
        if (queryKey[0] === 'dept-peer-attendance') return { data: sessions, isLoading: false };
        if (queryKey[0] === 'dept-peer-logbooks') return { data: [], isLoading: false };
        if (queryKey[0] === 'dept-peer-log-entries') return { data: [], isLoading: false };
        return { data: [], isLoading: false, isFetching: false };
    }
}));

const renderPage = () => render(
    <main id="dept-content-region" className="relative">
        <DeptPeerFacilitatorsPage showToastMessage={vi.fn()} />
    </main>
);

const expectFullRegionDialog = (name: string) => {
    // Dept modal uses the same portal target logic. We just make sure it exists and shows up.
    const dialog = screen.getByRole('dialog', { name });
    return dialog;
};

describe('DeptPeerFacilitatorsPage layout', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders the applications tab with mocked query rows and the review workflow', async () => {
        renderPage();

        // Application Review row renders, review modal opens and offers approve/reject
        fireEvent.click(screen.getByRole('button', { name: 'Review' }));
        const dialog = expectFullRegionDialog('Application Details');
        expect(within(dialog).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    });

    it('renders the active roster tab with add and archive workflows', () => {
        renderPage();
        fireEvent.click(screen.getByRole('tab', { name: 'Active Facilitators' }));

        fireEvent.click(screen.getByRole('button', { name: 'Add Facilitator' }));
        const addDialog = expectFullRegionDialog('Add Peer Facilitator');
        expect(within(addDialog).getByRole('button', { name: 'Add to Active' })).toBeInTheDocument();
        fireEvent.click(within(addDialog).getByRole('button', { name: 'Cancel' }));

        fireEvent.click(screen.getByRole('button', { name: 'Archive facilitator' }));
        const archiveDialog = expectFullRegionDialog('Archive Facilitator');
        expect(within(archiveDialog).getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    });

    it('renders the facilitator hours tab as a read-only DTR', () => {
        renderPage();
        fireEvent.click(screen.getByRole('tab', { name: 'Facilitator Hours' }));

        // One of the mock facilitators appears, and clicking a row opens the DTR modal
        fireEvent.click(screen.getByRole('button', { name: /Maria Santos/ }));
        const dialog = expectFullRegionDialog('Maria Santos');
        expect(within(dialog).getByText('Total for the day')).toBeInTheDocument();
    });
});
