import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CareStaffLoginSkeleton, LandingPageSkeleton } from './App';

describe('LandingPageSkeleton', () => {
  it('exposes an accessible loading state', () => {
    render(<LandingPageSkeleton />);

    expect(screen.getByRole('status', { name: 'Loading landing page' })).toHaveAttribute('aria-busy', 'true');
  });
});

describe('CareStaffLoginSkeleton', () => {
  it('exposes an accessible loading state', () => {
    render(<CareStaffLoginSkeleton />);

    expect(screen.getByRole('status', { name: 'Loading CARE staff login' })).toHaveAttribute('aria-busy', 'true');
  });
});
