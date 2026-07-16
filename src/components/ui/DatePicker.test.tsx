import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DatePicker from './DatePicker';

describe('DatePicker accessibility', () => {
    it('names the month navigation and selectors', () => {
        render(<DatePicker value="" onChange={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Select date' }));

        expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Month' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Year' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    });
});
