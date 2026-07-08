import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal accessibility', () => {
    it('exposes dialog semantics and labels itself from the title', () => {
        render(
            <Modal open onClose={vi.fn()} title="Edit student">
                <button>Save</button>
            </Modal>,
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        // aria-labelledby should point at the heading element carrying the title.
        const labelledBy = dialog.getAttribute('aria-labelledby');
        expect(labelledBy).toBeTruthy();
        expect(document.getElementById(labelledBy as string)).toHaveTextContent('Edit student');
    });

    it('moves focus into the dialog when opened', () => {
        render(
            <Modal open onClose={vi.fn()} title="Edit student">
                <button>Save</button>
            </Modal>,
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it('closes on Escape', () => {
        const onClose = vi.fn();
        render(
            <Modal open onClose={onClose} title="Edit student">
                <button>Save</button>
            </Modal>,
        );

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
