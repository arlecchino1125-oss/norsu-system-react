import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { StudentSidebar } from '../../pages/student/layout/StudentSidebar';

describe('Portal Privacy Policy Navigation', () => {
  it('renders Privacy Policy link in staff/dept shared Sidebar', () => {
    render(
      <MemoryRouter>
        <Sidebar
          sections={[]}
          activeTab="dashboard"
          onTabChange={vi.fn()}
          onLogout={vi.fn()}
          isCollapsed={false}
          onToggleCollapse={vi.fn()}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/privacy-policy');
  });

  it('renders Privacy Policy link in StudentSidebar', () => {
    render(
      <MemoryRouter>
        <StudentSidebar
          isOpen={true}
          activeView="dashboard"
          visibleSidebarLinks={[]}
          Icons={{ Logout: () => <span>LogoutIcon</span> }}
          onClose={vi.fn()}
          onSelectView={vi.fn()}
          onLogout={vi.fn()}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/privacy-policy');
  });
});
