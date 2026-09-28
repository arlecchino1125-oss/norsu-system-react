import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu from './ContextMenu';

describe('ContextMenu component', () => {
    it('renders with menu semantics when open with position', () => {
        render(
            <ContextMenu open position={{ x: 100, y: 150 }} onClose={vi.fn()}>
                <button role="menuitem">Item 1</button>
                <button role="menuitem">Item 2</button>
            </ContextMenu>
        );

        const menu = screen.getByRole('menu');
        expect(menu).toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('does not render when open is false or position is null', () => {
        const { rerender } = render(
            <ContextMenu open={false} position={{ x: 100, y: 150 }} onClose={vi.fn()}>
                <button role="menuitem">Item 1</button>
            </ContextMenu>
        );
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();

        rerender(
            <ContextMenu open position={null} onClose={vi.fn()}>
                <button role="menuitem">Item 1</button>
            </ContextMenu>
        );
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('calls onClose on Escape key', () => {
        const onClose = vi.fn();
        render(
            <ContextMenu open position={{ x: 50, y: 50 }} onClose={onClose}>
                <button role="menuitem">Item 1</button>
            </ContextMenu>
        );

        const menu = screen.getByRole('menu');
        fireEvent.keyDown(menu, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('navigates menu items with ArrowDown and ArrowUp', () => {
        render(
            <ContextMenu open position={{ x: 50, y: 50 }} onClose={vi.fn()}>
                <button role="menuitem">First</button>
                <button role="menuitem">Second</button>
            </ContextMenu>
        );

        const menu = screen.getByRole('menu');
        const first = screen.getByText('First');
        const second = screen.getByText('Second');

        first.focus();
        expect(document.activeElement).toBe(first);

        fireEvent.keyDown(menu, { key: 'ArrowDown' });
        expect(document.activeElement).toBe(second);

        fireEvent.keyDown(menu, { key: 'ArrowUp' });
        expect(document.activeElement).toBe(first);
    });

    it('calls onClose on click outside', () => {
        const onClose = vi.fn();
        render(
            <div>
                <div data-testid="outside">Outside area</div>
                <ContextMenu open position={{ x: 50, y: 50 }} onClose={onClose}>
                    <button role="menuitem">Inside</button>
                </ContextMenu>
            </div>
        );

        fireEvent.mouseDown(screen.getByTestId('outside'));
        expect(onClose).toHaveBeenCalled();
    });
});
