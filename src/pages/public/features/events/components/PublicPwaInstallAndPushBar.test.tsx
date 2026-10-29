import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PublicPwaInstallAndPushBar from './PublicPwaInstallAndPushBar';

describe('PublicPwaInstallAndPushBar', () => {
    const baseProps = {
        isStandalone: false,
        isIos: false,
        pushSupported: true,
        pushEnabled: false,
        isSubscribing: false,
        showInstallModal: false,
        setShowInstallModal: vi.fn(),
        onInstallClick: vi.fn(),
        onTogglePush: vi.fn()
    };

    it('renders Download App and Enable Push Alerts buttons when not installed', () => {
        render(<PublicPwaInstallAndPushBar {...baseProps} />);

        expect(screen.getByRole('button', { name: /Download App/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Enable Push Alerts/i })).toBeInTheDocument();
    });

    it('hides the Download App button when already running in standalone mode', () => {
        render(<PublicPwaInstallAndPushBar {...baseProps} isStandalone={true} />);

        expect(screen.queryByRole('button', { name: /Download App/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Enable Push Alerts/i })).toBeInTheDocument();
    });

    it('shows Alerts Enabled state and calls onTogglePush when clicked', () => {
        const onTogglePush = vi.fn();
        render(<PublicPwaInstallAndPushBar {...baseProps} pushEnabled={true} onTogglePush={onTogglePush} />);

        const btn = screen.getByRole('button', { name: /Alerts Enabled/i });
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(btn);
        expect(onTogglePush).toHaveBeenCalledOnce();
    });

    it('displays iOS Safari installation steps when showInstallModal is true on iOS', () => {
        render(<PublicPwaInstallAndPushBar {...baseProps} isIos={true} showInstallModal={true} />);

        expect(screen.getByRole('dialog', { name: /Add CARE Hub to Home Screen/i })).toBeInTheDocument();
        expect(screen.getByText(/On iPhone or iPad \(Safari\):/i)).toBeInTheDocument();
        expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument();
    });
});

