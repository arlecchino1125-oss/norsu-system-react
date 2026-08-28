import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PublicHelpGuideModal from './PublicHelpGuideModal';

describe('PublicHelpGuideModal', () => {
    it('does not render when open is false', () => {
        const { container } = render(<PublicHelpGuideModal open={false} onClose={vi.fn()} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders when open is true and shows services guide by default', () => {
        render(<PublicHelpGuideModal open={true} onClose={vi.fn()} />);
        expect(screen.getByText(/How to Use the Public Hub/i)).toBeInTheDocument();
        expect(screen.getByText(/Events & Attendance/i)).toBeInTheDocument();
        expect(screen.getByText(/Scholarships/i)).toBeInTheDocument();
        expect(screen.getByText(/Counseling Services/i)).toBeInTheDocument();
    });

    it('switches to FAQs tab when clicked', () => {
        render(<PublicHelpGuideModal open={true} onClose={vi.fn()} />);
        const faqTabButton = screen.getByRole('button', { name: /Questions & FAQs/i });
        fireEvent.click(faqTabButton);
        expect(screen.getByText(/Do I need a password to use this Public Page\?/i)).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<PublicHelpGuideModal open={true} onClose={onClose} />);
        const closeBtn = screen.getByRole('button', { name: /Close guide/i });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });
});
