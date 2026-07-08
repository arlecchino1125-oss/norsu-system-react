import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider } from '../../../components/ui/toast/ToastProvider';
import { useStudentToast } from './useStudentToast';

function Harness() {
    const { showToast } = useStudentToast();
    return <button onClick={() => showToast('Profile saved', 'success')}>save</button>;
}

describe('useStudentToast (shared-manager adapter)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('renders through the shared ToastProvider surface', () => {
        render(
            <ToastProvider>
                <Harness />
            </ToastProvider>,
        );

        act(() => { screen.getByText('save').click(); });

        const toast = screen.getByRole('status');
        expect(toast).toHaveTextContent('Profile saved');
    });
});
