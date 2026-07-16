import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StaffPortalLayout from './StaffPortalLayout';

describe('StaffPortalLayout accessibility', () => {
  it('names the mobile navigation button', () => {
    render(
      <StaffPortalLayout
        sidebarSections={[]}
        activeTab="home"
        onTabChange={vi.fn()}
        onLogout={vi.fn()}
        headerTitle="Dashboard"
      >
        Content
      </StaffPortalLayout>,
    );

    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
  });
});
