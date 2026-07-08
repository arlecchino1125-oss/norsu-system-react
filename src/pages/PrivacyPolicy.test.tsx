import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import PrivacyPolicy from './PrivacyPolicy';

describe('PrivacyPolicy', () => {
    it('renders the temporary privacy policy summary', () => {
        render(
            <MemoryRouter>
                <PrivacyPolicy />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
        expect(screen.getByText(/temporary version/i)).toBeInTheDocument();
        const footer = screen.getByRole('contentinfo');
        expect(within(footer).getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
    });
});
