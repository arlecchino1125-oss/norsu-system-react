import { Profiler } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';

function Controls() {
    const { showToast, toast, dismissToast } = useToast();
    return (
        <div>
            <button onClick={() => showToast('Saved', 'success')}>fire-success</button>
            <button onClick={() => showToast('Broke', 'error')}>fire-error</button>
            <button onClick={() => dismissToast(toast({ message: 'Manual', durationMs: 0 }))}>fire-and-dismiss</button>
        </div>
    );
}

function ContextConsumer() {
    useToast();
    return null;
}

const renderWithProvider = () =>
    render(
        <ToastProvider>
            <Controls />
        </ToastProvider>,
    );

describe('ToastProvider', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('shows a toast and auto-dismisses it after the duration', () => {
        renderWithProvider();
        act(() => { screen.getByText('fire-success').click(); });
        expect(screen.getByText('Saved')).toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(4000); });
        expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('stacks multiple toasts at once', () => {
        renderWithProvider();
        act(() => {
            screen.getByText('fire-success').click();
            screen.getByText('fire-error').click();
        });
        expect(screen.getByText('Saved')).toBeInTheDocument();
        expect(screen.getByText('Broke')).toBeInTheDocument();
        expect(screen.getAllByRole('status')).toHaveLength(2);
    });

    it('does not redraw context consumers when only toast viewport state changes', () => {
        const onRender = vi.fn();
        render(
            <ToastProvider>
                <Controls />
                <Profiler id="toast-consumer" onRender={onRender}>
                    <ContextConsumer />
                </Profiler>
            </ToastProvider>,
        );

        expect(onRender).toHaveBeenCalledTimes(1);
        act(() => { screen.getByText('fire-success').click(); });
        expect(onRender).toHaveBeenCalledTimes(1);
    });
});
