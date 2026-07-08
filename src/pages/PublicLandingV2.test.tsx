import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import PublicLandingV2 from './PublicLandingV2';

describe('PublicLandingV2', () => {
    it('shows a privacy policy link in the footer', () => {
        render(
            <MemoryRouter>
                <PublicLandingV2 />
            </MemoryRouter>
        );

        expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy-policy');
    });
});
