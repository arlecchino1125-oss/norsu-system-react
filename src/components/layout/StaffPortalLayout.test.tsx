import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import StaffPortalLayout from './StaffPortalLayout';

describe('StaffPortalLayout accessibility', () => {
  it('names the mobile navigation button and renders Privacy Policy link', () => {
    render(
      <MemoryRouter>
        <StaffPortalLayout
          sidebarSections={[]}
          activeTab="home"
          onTabChange={vi.fn()}
          onLogout={vi.fn()}
          headerTitle="Dashboard"
        >
          Content
        </StaffPortalLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy-policy');
  });

  it('does not repeat the current page title in the top bar', () => {
    render(
      <MemoryRouter>
        <StaffPortalLayout
          sidebarSections={[]}
          activeTab="population"
          onTabChange={vi.fn()}
          onLogout={vi.fn()}
          headerTitle="Student Population"
        >
          Content
        </StaffPortalLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner', { name: 'Student Population page header' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Student Population' })).not.toBeInTheDocument();
  });

  it('promotes the portal label in the top bar', () => {
    render(
      <MemoryRouter>
        <StaffPortalLayout
          sidebarSections={[]}
          activeTab="population"
          onTabChange={vi.fn()}
          onLogout={vi.fn()}
          headerTitle="Student Population"
        >
          Content
        </StaffPortalLayout>
      </MemoryRouter>,
    );

    expect(screen.getByText('NORSU-G CARE')).toHaveClass('text-sm');
  });
});
