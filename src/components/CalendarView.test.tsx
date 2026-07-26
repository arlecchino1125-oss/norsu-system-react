import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CalendarView from './CalendarView';

describe('CalendarView', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('fits the month grid into the available calendar height', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-26T08:00:00.000Z'));

        render(<CalendarView requests={[]} />);

        expect(screen.getByRole('region', { name: 'July 2026 counseling calendar' })).toHaveClass('h-full');
        expect(screen.getByRole('grid', { name: 'July 2026 counseling calendar' })).toHaveStyle({
            gridTemplateRows: 'repeat(5, minmax(0, 1fr))'
        });
    });
});
