import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CareStaffEventsPage from './CareStaffEventsPage';
import { getEvaluationsForEvents, getQuestions, listTemplates } from '../eventEvaluationService';
import { useCareStaffEvents, createEmptyEvent } from '../hooks/useCareStaffEvents';
import { exportToExcel } from '../../../../../utils/dashboardUtils';

vi.mock('../../../../../utils/dashboardUtils', () => ({
    exportToExcel: vi.fn()
}));

vi.mock('../eventEvaluationService', async () => {
    const actual = await vi.importActual<typeof import('../eventEvaluationService')>('../eventEvaluationService');
    return { ...actual, getEvaluationsForEvents: vi.fn(), getQuestions: vi.fn(), listTemplates: vi.fn() };
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

beforeEach(() => {
    vi.mocked(listTemplates).mockReset().mockResolvedValue([]);
    vi.mocked(getQuestions).mockReset().mockResolvedValue([]);
});

describe('CareStaffEventsPage creation templates', () => {
    beforeEach(() => { vi.mocked(getEvaluationsForEvents).mockImplementation(() => new Promise(() => {})); });
    const scheduledEvent = { ...createEmptyEvent(), event_date: '2026-10-11', event_time: '09:00', end_time: '11:00' };
    const templates = [
        { id: 8, event_id: null, title: 'Recent saved evaluation', description: 'Saved questions', is_active: true },
        { id: 4, event_id: null, title: 'Older saved evaluation', description: null, is_active: true }
    ];

    const renderCreation = (overrides: Record<string, unknown> = {}) => {
        const createEvent = vi.fn();
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState, showEventModal: true, editingEventId: null, newEvent: scheduledEvent,
            setNewEvent: vi.fn(), setShowEventModal: vi.fn(), setEditingEventId: vi.fn(), createEvent,
            departmentOptions: [], courseOptions: [], getCurrentLocation: vi.fn(), renderAudienceCheckboxGroup: () => null,
            ...overrides
        } as any);
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={queryClient}><CareStaffEventsPage functions={{ showToast: vi.fn() }} /></QueryClientProvider>);
        return createEvent;
    };

    it('includes the latest saved template by default and allows another saved template', async () => {
        vi.mocked(listTemplates).mockResolvedValue(templates);
        const createEvent = renderCreation();
        const select = await screen.findByLabelText('Evaluation form');
        expect(select).toHaveValue('8');
        fireEvent.submit(document.getElementById('event-form')!);
        expect(createEvent).toHaveBeenLastCalledWith(expect.anything(), templates[0]);
        fireEvent.change(select, { target: { value: '4' } });
        fireEvent.submit(document.getElementById('event-form')!);
        expect(createEvent).toHaveBeenLastCalledWith(expect.anything(), templates[1]);
    });

    it('prevents saving while templates load or fail to load', async () => {
        vi.mocked(listTemplates).mockRejectedValue(new Error('Unavailable'));
        const createEvent = renderCreation();
        expect(screen.getByRole('button', { name: 'Create Event' })).toBeDisabled();
        fireEvent.submit(document.getElementById('event-form')!);
        expect(createEvent).not.toHaveBeenCalled();
        expect(await screen.findByRole('alert')).toHaveTextContent('Could not load saved templates');
        expect(screen.getByRole('button', { name: 'Create Event' })).toBeDisabled();
    });

    it('shows the missing-template state without inventing a form', async () => {
        const createEvent = renderCreation();
        expect(await screen.findByText(/No saved evaluation templates/)).toBeInTheDocument();
        fireEvent.submit(document.getElementById('event-form')!);
        expect(createEvent).toHaveBeenCalledWith(expect.anything(), undefined);
    });

    it.each(['announcement', 'edit'])('does not attach a template in an %s form', kind => {
        renderCreation(kind === 'edit' ? { editingEventId: 3 } : { newEvent: { ...createEmptyEvent(), type: 'Announcement' } });
        expect(screen.queryByText('Evaluation form')).not.toBeInTheDocument();
        expect(listTemplates).not.toHaveBeenCalled();
    });

    it('previews the chosen saved form before Advanced without submitting or losing event details', async () => {
        vi.mocked(listTemplates).mockResolvedValue(templates);
        vi.mocked(getQuestions).mockResolvedValue([{
            clientId: 'saved-question', question_text: 'Was this event useful?', question_type: 'scale',
            scale_min: 1, scale_max: 5, scale_min_label: 'Poor', scale_max_label: 'Excellent', choices: [], is_required: true
        }]);
        const createEvent = renderCreation({ newEvent: { ...scheduledEvent, title: 'Career day', description: 'Meet employers' } });
        const select = await screen.findByLabelText('Evaluation form');
        expect(select.compareDocumentPosition(screen.getByText('Advanced')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        fireEvent.change(select, { target: { value: '4' } });
        fireEvent.click(screen.getByRole('button', { name: 'Preview form' }));
        const preview = screen.getByRole('dialog', { name: 'Evaluation form preview' });
        expect(await within(preview).findByText('1. Was this event useful?')).toBeInTheDocument();
        expect(getQuestions).toHaveBeenCalledWith(4);
        expect(createEvent).not.toHaveBeenCalled();
        fireEvent.click(within(preview).getAllByRole('button', { name: 'Close' }).at(-1)!);
        expect(screen.getByLabelText('Title *')).toHaveValue('Career day');
        expect(screen.getByLabelText('Description *')).toHaveValue('Meet employers');
        expect(select).toHaveValue('4');
    });

    it('shows the default deadline using the three-hour end fallback', async () => {
        renderCreation({ newEvent: { ...scheduledEvent, end_time: '' } });
        await screen.findByText(/No saved evaluation templates/);
        const expectedDeadline = new Date('2026-10-14T12:00:00').toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        expect(screen.getByText(/^Default:/)).toHaveTextContent(expectedDeadline);
        expect(screen.getByLabelText('Attendance & evaluation deadline')).toHaveValue('');
        expect(screen.getByLabelText(/Start time/)).toBeRequired();
        expect(screen.getByText(/Students can evaluate after the event ends/)).toBeInTheDocument();
    });

    it.each([
        [{ event_time: '' }, 'Pick a valid start time.', /Start time/],
        [{ end_time: '08:00' }, 'End time must be later than start time.', /End time/],
        [{ attendance_closes_at: '2026-10-11T11:00' }, 'Attendance and evaluation deadline must be after the event ends.', /Attendance & evaluation deadline/]
    ])('blocks an invalid schedule and focuses the affected field', async (fields, message, label) => {
        const createEvent = renderCreation({ newEvent: { ...scheduledEvent, ...fields } });
        await screen.findByText(/No saved evaluation templates/);
        fireEvent.submit(document.getElementById('event-form')!);
        expect(createEvent).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(message);
        expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(label)).toHaveFocus();
    });

    it.each([false, true])('only shows location tools when geolocation is enabled (%s)', async enabled => {
        renderCreation({ newEvent: { ...scheduledEvent, require_geolocation: enabled } });
        await screen.findByText(/No saved evaluation templates/);
        fireEvent.click(screen.getByText('Advanced'));
        if (enabled) {
            expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
            expect(screen.getByLabelText('Longitude')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'My location' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Reset campus' })).toBeInTheDocument();
        } else {
            expect(screen.queryByLabelText('Latitude')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Longitude')).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'My location' })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Reset campus' })).not.toBeInTheDocument();
        }
    });
});

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

        const dialog = screen.getByRole('dialog', { name: 'Event Feedback' });
        expect(dialog).toBeInTheDocument();
        expect(screen.getByText('"Review 20"')).toBeInTheDocument();
        expect(screen.queryByText('"Review 21"')).not.toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Next page' }));

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

    it('offers an attendance and evaluation deadline and tucks the proof toggles under Advanced', async () => {
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

        await screen.findByText(/No saved evaluation templates/);
        expect(screen.getByLabelText(/Attendance & evaluation deadline/)).toBeInTheDocument();

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
    beforeEach(() => {
        vi.clearAllMocks();
    });

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

    it('shows female and male count pills, gender pills, and exports gender identifiers in attendees modal', () => {
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            showAttendeesModal: true,
            attendees: [
                {
                    id: 1,
                    student_id: '420135326',
                    student_name: 'Alice Smith',
                    department: 'CAS',
                    course: 'BSCS',
                    year_level: '2nd Year',
                    section: 'A',
                    sex: 'Female',
                    gender_identity: 'CIS Gender',
                    time_in: '2026-07-26T09:00:00Z',
                    time_out: '2026-07-26T11:00:00Z'
                },
                {
                    id: 2,
                    student_id: '420135327',
                    student_name: 'Bob Jones',
                    department: 'CAS',
                    course: 'BSCS',
                    year_level: '2nd Year',
                    section: 'A',
                    sex: 'Male',
                    gender_identity: 'Transgender',
                    time_in: '2026-07-26T09:05:00Z',
                    time_out: null
                }
            ],
            selectedAttendanceEvent: { id: 3, title: 'Sample event', type: 'Event', attendance_required: true },
            selectedEventTitle: 'Sample event'
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByText('1 Female')).toBeInTheDocument();
        expect(screen.getByText('1 Male')).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Student Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Gender' })).toBeInTheDocument();
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Jones')).toBeInTheDocument();
        expect(screen.getByText('Female')).toBeInTheDocument();
        expect(screen.getByText('Male')).toBeInTheDocument();

        const exportBtn = screen.getByRole('button', { name: /Export/i });
        act(() => {
            fireEvent.click(exportBtn);
        });

        expect(exportToExcel).toHaveBeenCalled();
        const [headers, rows] = vi.mocked(exportToExcel).mock.calls[0];
        expect(headers).toContain('Student ID');
        expect(headers).toContain('Sex Assigned at Birth');
        expect(headers).toContain('Gender Identity');
        expect(rows[0]).toContain('Female');
        expect(rows[0]).toContain('CIS Gender');
        expect(rows[1]).toContain('Male');
        expect(rows[1]).toContain('Transgender');
    });

    it('toggles demographics panel and filters attendees by gender in attendees modal', () => {
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            showAttendeesModal: true,
            attendees: [
                {
                    id: 1,
                    student_id: '420135326',
                    student_name: 'Alice Smith',
                    department: 'CAS',
                    course: 'BSCS',
                    year_level: '2nd Year',
                    section: 'A',
                    sex: 'Female',
                    gender_identity: 'CIS Gender',
                    time_in: '2026-07-26T09:00:00Z',
                    time_out: '2026-07-26T11:00:00Z'
                },
                {
                    id: 2,
                    student_id: '420135327',
                    student_name: 'Bob Jones',
                    department: 'CAS',
                    course: 'BSCS',
                    year_level: '2nd Year',
                    section: 'A',
                    sex: 'Male',
                    gender_identity: 'Transgender',
                    time_in: '2026-07-26T09:05:00Z',
                    time_out: null
                }
            ],
            selectedAttendanceEvent: { id: 3, title: 'Sample event', type: 'Event', attendance_required: true },
            selectedEventTitle: 'Sample event'
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        // Toggle demographics
        const demoToggle = screen.getByRole('button', { name: /Demographics/i });
        expect(screen.queryByText('Sex Assigned at Birth')).not.toBeInTheDocument();

        act(() => {
            fireEvent.click(demoToggle);
        });
        expect(screen.getByText('Sex Assigned at Birth')).toBeInTheDocument();

        // Gender filter select
        const genderSelect = screen.getByDisplayValue('All Genders');
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Jones')).toBeInTheDocument();

        act(() => {
            fireEvent.change(genderSelect, { target: { value: 'Female' } });
        });

        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
    });

    it('exports Sex Assigned at Birth and Gender Identity in absent modal', () => {
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            showAbsentModal: true,
            attendees: [],
            expectedStudents: [
                {
                    student_id: '420135328',
                    first_name: 'Charlie',
                    last_name: 'Brown',
                    department: 'CAS',
                    course: 'BSCS',
                    year_level: '1st Year',
                    sex: 'Male',
                    gender_identity: 'CIS Gender'
                }
            ],
            selectedAttendanceEvent: { id: 3, title: 'Sample event', type: 'Event', attendance_required: true },
            selectedEventTitle: 'Sample event'
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        const exportBtn = screen.getByRole('button', { name: /Export Excel/i });
        act(() => {
            fireEvent.click(exportBtn);
        });

        expect(exportToExcel).toHaveBeenCalled();
        const [headers, rows] = vi.mocked(exportToExcel).mock.calls[0];
        expect(headers).toContain('Student ID');
        expect(headers).toContain('Sex Assigned at Birth');
        expect(headers).toContain('Gender Identity');
        expect(rows[0]).toContain('Male');
        expect(rows[0]).toContain('CIS Gender');
    });
});

describe('CareStaffEventsPage visual UI & UX', () => {
    beforeEach(() => {
        vi.mocked(getEvaluationsForEvents).mockImplementation(() => new Promise(() => {}));
        vi.mocked(useCareStaffEvents).mockReturnValue(baseHookState as any);
    });

    it('renders the header with gradient, title, subtitle, and 3 action buttons', () => {
        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByRole('heading', { level: 1, name: 'Events & Announcements' })).toBeInTheDocument();
        expect(screen.getByText('Manage campus activities and broadcast official notices.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Refresh Data' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Evaluation Templates' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create New' })).toBeInTheDocument();
    });

    it('renders the toolbar with pill tabs and item counters', () => {
        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByRole('button', { name: /All Items/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Activities/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Announcements/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Archived/i })).toBeInTheDocument();
        expect(screen.getByText('Active: 0')).toBeInTheDocument();
    });

    it('displays the centered empty state when there are no items', () => {
        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByText('No active events or announcements found.')).toBeInTheDocument();
    });

    it('renders announcement and activity cards with action links, blue theme line, and audience tag', () => {
        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            eventFilter: 'Archived',
            archivedEvents: [
                {
                    id: 101,
                    title: 'Sample notice',
                    type: 'Announcement',
                    description: 'Ignore this announcement',
                    location: 'Online/General',
                    event_date: '2026-08-28'
                },
                {
                    id: 102,
                    title: 'Mental Health Awareness Activity',
                    type: 'Orientation',
                    description: 'Theme: "From Stress to Strength: Promoting Mental Wellness Among College Students"\nSession details here.',
                    location: 'NORSU - Guihulngan Campus Gymnasium',
                    event_date: '2026-08-10',
                    event_time: '13:00',
                    end_time: '17:00:00',
                    attendees: 190,
                    avgRating: '4.8',
                    feedbackCount: 10,
                    audience_type: 'all_students'
                }
            ]
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        // Counter label for archived tab
        expect(screen.getByText('Archived: 2')).toBeInTheDocument();

        // Announcement card
        expect(screen.getByText('Sample notice')).toBeInTheDocument();
        expect(screen.getByText('Ignore this announcement')).toBeInTheDocument();
        expect(screen.getByText('Online/General')).toBeInTheDocument();
        expect(screen.getByText('2026-08-28')).toBeInTheDocument();

        // Orientation / Activity card
        expect(screen.getByText('Mental Health Awareness Activity')).toBeInTheDocument();
        expect(screen.getByText('💙 Theme: "From Stress to Strength: Promoting Mental Wellness Among College Students"')).toBeInTheDocument();
        expect(screen.getByText('Session details here.')).toBeInTheDocument();
        expect(screen.getByText('NORSU - Guihulngan Campus Gymnasium')).toBeInTheDocument();
        expect(screen.getByText('2026-08-10')).toBeInTheDocument();
        expect(screen.getByText('13:00 → 17:00:00')).toBeInTheDocument();
        expect(screen.getByText('190 Attendees')).toBeInTheDocument();
        expect(screen.getByText(/4\.8/)).toBeInTheDocument();
        expect(screen.getByText('All students')).toBeInTheDocument();

        // Action links
        expect(screen.getByRole('button', { name: /Reviews \(10\)/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Attendees \(190\)/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Absent/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Extend attendance/i })).toBeInTheDocument();
    });

    it('renders the pagination container and paginates event lists', () => {
        const eventsList = Array.from({ length: 15 }, (_, i) => ({
            id: i + 1,
            title: `Event ${i + 1}`,
            type: 'Event',
            event_date: '2026-09-10',
            location: 'Main Hall'
        }));

        vi.mocked(useCareStaffEvents).mockReturnValue({
            ...baseHookState,
            events: eventsList
        } as any);

        render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

        // Shows items 1-10 on page 1
        expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 1–10 of 15');
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
        expect(screen.getByText('Event 1')).toBeInTheDocument();
        expect(screen.getByText('Event 10')).toBeInTheDocument();
        expect(screen.queryByText('Event 11')).not.toBeInTheDocument();

        // Navigate to page 2
        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

        expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 11–15 of 15');
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
        expect(screen.getByText('Event 11')).toBeInTheDocument();
        expect(screen.queryByText('Event 10')).not.toBeInTheDocument();
    });
});

