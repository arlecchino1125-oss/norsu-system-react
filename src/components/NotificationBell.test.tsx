import { StrictMode } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotificationBell from './NotificationBell';

describe('NotificationBell open callback', () => {
    // StrictMode double-invokes state updaters, which is what caught onOpen
    // being called from inside the setIsOpen updater.
    it('fires onOpen once per open and never on close', () => {
        const onOpen = vi.fn();
        render(
            <StrictMode>
                <NotificationBell notifications={[]} onOpen={onOpen} />
            </StrictMode>
        );

        const bell = document.querySelector('.notification-bell-button') as HTMLButtonElement;

        fireEvent.click(bell);
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(document.querySelector('.notification-bell-panel')).toBeInTheDocument();

        fireEvent.click(bell);
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(document.querySelector('.notification-bell-panel')).not.toBeInTheDocument();

        fireEvent.click(bell);
        expect(onOpen).toHaveBeenCalledTimes(2);
    });
});
