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

        const trigger = screen.getByLabelText('Course');
        expect(trigger).toHaveAttribute('type', 'button');
        fireEvent.click(trigger);

        const option = screen.getByRole('button', { name: 'Computer Science' });
        expect(option.tagName).toBe('BUTTON');
        expect(screen.getAllByRole('button', { name: 'Close options' })).toHaveLength(2);

        fireEvent.click(option);
        expect(onChange).toHaveBeenCalledWith('cs');
    });
});
