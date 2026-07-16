import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchableSelect from './SearchableSelect';

describe('SearchableSelect accessibility', () => {
    it('uses native buttons for the backdrop and options', () => {
        const onChange = vi.fn();
        render(
            <SearchableSelect
                label="Course"
                value=""
                options={[{ label: 'Computer Science', value: 'cs' }]}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /select an option/i }));

        const option = screen.getByRole('button', { name: 'Computer Science' });
        expect(option.tagName).toBe('BUTTON');
        expect(screen.getByRole('button', { name: 'Close options' })).toBeInTheDocument();

        fireEvent.click(option);
        expect(onChange).toHaveBeenCalledWith('cs');
    });
});
