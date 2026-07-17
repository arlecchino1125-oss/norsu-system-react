import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { usePortalTabRoute } from './usePortalTabRoute';

const TABS = ['home', 'population', 'analytics'] as const;
type Tab = (typeof TABS)[number];

function Harness() {
    const { activeTab, goToTab } = usePortalTabRoute<Tab>({
        basePath: '/p',
        tabs: TABS,
        defaultTab: 'home',
    });
    const navigate = useNavigate();
    return (
        <div>
            <span data-testid="active">{activeTab}</span>
            <span data-testid="path">{useLocation().pathname}</span>
            <button onClick={() => goToTab('population')}>go-pop</button>
            <button onClick={() => goToTab('analytics')}>go-analytics</button>
            <button onClick={() => navigate(-1)}>back</button>
        </div>
    );
}

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/p" element={<Navigate to="/p/home" replace />} />
                <Route path="/p/:tab" element={<Harness />} />
            </Routes>
        </MemoryRouter>,
    );

describe('usePortalTabRoute', () => {
    it('seeds the active tab from a deep-linked URL with no flash', () => {
        renderAt('/p/analytics');
        expect(screen.getByTestId('active')).toHaveTextContent('analytics');
        expect(screen.getByTestId('path')).toHaveTextContent('/p/analytics');
    });

    it('pushes the URL when goToTab is called', async () => {
        renderAt('/p/home');
        await userEvent.click(screen.getByText('go-pop'));
        await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/p/population'));
        expect(screen.getByTestId('active')).toHaveTextContent('population');
    });

    it('returns to the previous tab on browser Back', async () => {
        renderAt('/p/home');
        await userEvent.click(screen.getByText('go-pop'));
        await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('population'));
        await userEvent.click(screen.getByText('go-analytics'));
        await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('analytics'));

        await userEvent.click(screen.getByText('back'));
        await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('population'));
        expect(screen.getByTestId('path')).toHaveTextContent('/p/population');
    });

    it('normalizes an unknown tab segment to the default', async () => {
        renderAt('/p/bogus');
        await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/p/home'));
        expect(screen.getByTestId('active')).toHaveTextContent('home');
    });
});
