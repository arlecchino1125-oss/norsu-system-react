import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PublicAnnouncementsSlideshow from './PublicAnnouncementsSlideshow';
import type { PublicEvent } from '../publicEventsService';

const mockAnnouncements: PublicEvent[] = [
    {
        id: 1,
        created_at: '2026-08-01T00:00:00Z',
        title: 'Midterm Exam Schedule Released',
        type: 'Announcement',
        description: 'Please check your portal for room assignments and reminders.',
        location: 'Campus Wide',
        event_date: '2026-08-15',
        event_time: null,
        end_time: null,
        attendees: null,
        is_archived: false,
        participation_mode: null,
        audience_type: null,
        audience_departments: null,
        audience_courses: null,
        audience_year_levels: null,
        audience_sections: null,
        allow_walk_ins: null,
        capacity: null,
        registration_deadline: null,
        require_photo: null,
        require_geolocation: null,
        attendance_closes_at: null,
    },
    {
        id: 2,
        created_at: '2026-08-02T00:00:00Z',
        title: 'Free Counseling Sessions Available',
        type: 'Announcement',
        description: 'CARE Office is open for walk-in and online appointments.',
        location: 'CARE Center 2nd Floor',
        event_date: '2026-08-20',
        event_time: null,
        end_time: null,
        attendees: null,
        is_archived: false,
        participation_mode: null,
        audience_type: null,
        audience_departments: null,
        audience_courses: null,
        audience_year_levels: null,
        audience_sections: null,
        allow_walk_ins: null,
        capacity: null,
        registration_deadline: null,
        require_photo: null,
        require_geolocation: null,
        attendance_closes_at: null,
    }
];

describe('PublicAnnouncementsSlideshow', () => {
    it('renders nothing when announcements list is empty and not loading', () => {
        const { container } = render(
            <PublicAnnouncementsSlideshow announcements={[]} isLoading={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders loading skeleton when isLoading is true', () => {
        const { container } = render(
            <PublicAnnouncementsSlideshow announcements={[]} isLoading={true} />
        );
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders the first announcement with title and description', () => {
        render(
            <PublicAnnouncementsSlideshow announcements={mockAnnouncements} isLoading={false} />
        );

        expect(screen.getByText('Midterm Exam Schedule Released')).toBeInTheDocument();
        expect(screen.getByText('Please check your portal for room assignments and reminders.')).toBeInTheDocument();
        expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('cycles slides on Next / Previous arrow click', () => {
        render(
            <PublicAnnouncementsSlideshow announcements={mockAnnouncements} isLoading={false} />
        );

        const nextButton = screen.getByLabelText('Next announcement');
        fireEvent.click(nextButton);

        expect(screen.getByText('Free Counseling Sessions Available')).toBeInTheDocument();
        expect(screen.getByText('2 of 2')).toBeInTheDocument();

        const prevButton = screen.getByLabelText('Previous announcement');
        fireEvent.click(prevButton);

        expect(screen.getByText('Midterm Exam Schedule Released')).toBeInTheDocument();
        expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('opens detail modal when clicking announcement card and closes on close button', () => {
        render(
            <PublicAnnouncementsSlideshow announcements={mockAnnouncements} isLoading={false} />
        );

        const cardButton = screen.getByRole('button', { name: /Midterm Exam Schedule Released/i });
        fireEvent.click(cardButton);

        expect(screen.getByText('Campus Wide')).toBeInTheDocument();
        expect(screen.getByText('Close')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Close'));
        expect(screen.queryByText('Campus Wide')).not.toBeInTheDocument();
    });

    it('renders and supports active scholarship slides alongside announcements', () => {
        const mockScholarships = [
            {
                id: 101,
                title: 'CoScho Coconut Farmers Scholarship',
                description: 'Full tuition and allowance for qualified coconut farmers children.',
                deadline: '2026-08-31',
                requirements: 'Certificate of eligibility from PCA.'
            }
        ];
        const onOpenScholarships = vi.fn();

        render(
            <PublicAnnouncementsSlideshow
                announcements={mockAnnouncements}
                scholarships={mockScholarships}
                isLoading={false}
                onOpenScholarships={onOpenScholarships}
            />
        );

        expect(screen.getByText('1 of 3')).toBeInTheDocument();

        // Navigate to the 3rd slide (the scholarship)
        const nextButton = screen.getByLabelText('Next announcement');
        fireEvent.click(nextButton); // slide 2
        fireEvent.click(nextButton); // slide 3

        expect(screen.getByText('CoScho Coconut Farmers Scholarship')).toBeInTheDocument();
        expect(screen.getByText('3 of 3')).toBeInTheDocument();

        // Open scholarship modal
        const cardButton = screen.getByRole('button', { name: /CoScho Coconut Farmers Scholarship/i });
        fireEvent.click(cardButton);

        expect(screen.getByText('Scholarship Opportunity')).toBeInTheDocument();
        expect(screen.getByText('Certificate of eligibility from PCA.')).toBeInTheDocument();

        // Click Action button
        const actionButton = screen.getByText('View & Apply in Scholarships');
        fireEvent.click(actionButton);

        expect(onOpenScholarships).toHaveBeenCalledWith(mockScholarships[0]);
    });

    it('renders and supports campus event slides with onOpenEvents action', () => {
        const mockEvents: PublicEvent[] = [
            {
                id: 201,
                created_at: '2026-08-01T00:00:00Z',
                title: 'Mental Health Awareness Seminar',
                type: 'Seminar',
                description: 'Join us for an inspiring session on wellness and stress management.',
                location: 'Main Auditorium',
                event_date: '2026-08-30',
                event_time: '13:00:00',
                end_time: '16:00:00',
                attendees: 50,
                is_archived: false,
                participation_mode: 'open_to_all',
                audience_type: null,
                audience_departments: null,
                audience_courses: null,
                audience_year_levels: null,
                audience_sections: null,
                allow_walk_ins: true,
                capacity: 100,
                registration_deadline: null,
                require_photo: null,
                require_geolocation: null,
                attendance_closes_at: null,
            }
        ];
        const onOpenEvents = vi.fn();

        render(
            <PublicAnnouncementsSlideshow
                events={mockEvents}
                isLoading={false}
                onOpenEvents={onOpenEvents}
            />
        );

        expect(screen.getByText('Mental Health Awareness Seminar')).toBeInTheDocument();
        expect(screen.getByText('Seminar')).toBeInTheDocument();

        // Open modal
        const cardButton = screen.getByRole('button', { name: /Mental Health Awareness Seminar/i });
        fireEvent.click(cardButton);

        expect(screen.getAllByText('Seminar').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Main Auditorium')).toBeInTheDocument();

        // Click Open in Events button
        const openButton = screen.getByText('Open in Events & Attendance');
        fireEvent.click(openButton);

        expect(onOpenEvents).toHaveBeenCalledWith(mockEvents[0]);
    });
});
