import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NatApplicationDetailsModal from './NatApplicationDetailsModal';

const baseProps = {
    closeSelectedAppModal: vi.fn(),
    formatAssignedSlot: (value: string) => value,
    isLoadingSelectedApp: false,
    showModal: true,
    supportsAttendance: true,
    updateStatus: vi.fn()
};

const application = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    first_name: 'Ada',
    last_name: 'Lovelace',
    status: 'Test Taken',
    time_in: '2026-07-14T00:30:00.000Z',
    time_out: null
};

describe('NAT application result controls', () => {
    it('greys out Pass until both attendance timestamps exist', () => {
        const { rerender } = render(
            <NatApplicationDetailsModal {...baseProps} selectedApp={application} />
        );

        const passButton = screen.getByRole('button', { name: 'Pass' });
        expect(passButton).toBeDisabled();
        expect(passButton).toHaveClass('bg-slate-200', 'text-slate-400');

        rerender(
            <NatApplicationDetailsModal
                {...baseProps}
                selectedApp={{
                    ...application,
                    time_out: '2026-07-14T02:00:00.000Z'
                }}
            />
        );

        expect(screen.getByRole('button', { name: 'Pass' })).toBeEnabled();
    });
});
