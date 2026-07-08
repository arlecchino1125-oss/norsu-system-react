import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import PrivacyPolicy from './PrivacyPolicy';

describe('PrivacyPolicy', () => {
    it('renders the privacy policy', () => {
        render(
            <MemoryRouter>
                <PrivacyPolicy />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
        expect(screen.getAllByText(/data privacy act of 2012/i).length).toBeGreaterThan(0);
        const footer = screen.getByRole('contentinfo');
        expect(within(footer).getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
    });
});
