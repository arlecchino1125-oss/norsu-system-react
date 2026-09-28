import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuPosition {
    x: number;
    y: number;
}

export interface ContextMenuProps {
    open: boolean;
    position: ContextMenuPosition | null;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    ariaLabel?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    open,
    position,
    onClose,
    children,
    className = '',
    ariaLabel = 'Context Menu'
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
    const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

    // Capture previous focused element on open and restore on close
    useEffect(() => {
        if (open) {
            previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
        } else if (previouslyFocusedElementRef.current) {
            previouslyFocusedElementRef.current.focus();
            previouslyFocusedElementRef.current = null;
        }
    }, [open]);

    // Viewport clamping
    useLayoutEffect(() => {
        if (!open || !position) return;

        const menu = menuRef.current;
        const width = menu?.offsetWidth || 220;
        const height = menu?.offsetHeight || 200;
        const padding = 12;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let nextX = position.x;
        let nextY = position.y;

        if (nextX + width > viewportWidth - padding) {
            nextX = Math.max(padding, viewportWidth - width - padding);
        }
        if (nextY + height > viewportHeight - padding) {
            nextY = Math.max(padding, viewportHeight - height - padding);
        }

        setAdjustedPosition({ x: Math.max(padding, nextX), y: Math.max(padding, nextY) });
    }, [open, position]);

    // Focus first item when opened
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            const firstItem = menuRef.current?.querySelector<HTMLElement>(
                '[role="menuitem"]:not([disabled])'
            );
            firstItem?.focus();
        }, 10);
        return () => clearTimeout(timer);
    }, [open]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            const items = Array.from(
                menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') || []
            );
            if (items.length === 0) return;

            const currentIndex = items.indexOf(document.activeElement as HTMLElement);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                items[nextIndex]?.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items[prevIndex]?.focus();
            }
        },
        [onClose]
    );

    // Event listeners: click outside, scroll, resize
    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleScrollOrResize = () => {
            onClose();
        };

        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('touchstart', handlePointerDown);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('touchstart', handlePointerDown);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [open, onClose]);

    if (!open || !position) return null;

    return createPortal(
        <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            aria-orientation="vertical"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            style={{
                position: 'fixed',
                top: `${adjustedPosition.y}px`,
                left: `${adjustedPosition.x}px`,
                zIndex: 9999
            }}
            className={`min-w-[14rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl ${className}`}
        >
            {children}
        </div>,
        document.body
    );
};

export default ContextMenu;
