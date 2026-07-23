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

  it('does not repeat the current page title in the top bar', () => {
    render(
      <StaffPortalLayout
        sidebarSections={[]}
        activeTab="population"
        onTabChange={vi.fn()}
        onLogout={vi.fn()}
        headerTitle="Student Population"
      >
        Content
      </StaffPortalLayout>,
    );

    expect(screen.getByRole('banner', { name: 'Student Population page header' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Student Population' })).not.toBeInTheDocument();
  });

  it('promotes the portal label in the top bar', () => {
    render(
      <StaffPortalLayout
        sidebarSections={[]}
        activeTab="population"
        onTabChange={vi.fn()}
        onLogout={vi.fn()}
        headerTitle="Student Population"
      >
        Content
      </StaffPortalLayout>,
    );

    expect(screen.getByText('NORSU-G CARE')).toHaveClass('text-sm');
  });
});
