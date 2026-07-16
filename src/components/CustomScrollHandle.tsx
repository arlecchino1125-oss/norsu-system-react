import React, { useCallback, useEffect, useState, useRef } from 'react';

export const CustomScrollHandle = ({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement> }) => {
    const [scrollRatio, setScrollRatio] = useState(0);
    const [showHandle, setShowHandle] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [thumbHeight, setThumbHeight] = useState(60);
    const trackRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<number | null>(null);

    const updateScrollState = useCallback(() => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        
        // If content fits in the container, don't show the handle
        if (scrollHeight <= clientHeight) {
            setShowHandle(false);
            return;
        }

        setShowHandle(true);
        const ratio = scrollTop / (scrollHeight - clientHeight);
        setScrollRatio(isNaN(ratio) ? 0 : ratio);

        // Dynamically calculate thumb height (minimum 40px)
        const calculatedHeight = Math.max(40, (clientHeight / scrollHeight) * 200);
        setThumbHeight(calculatedHeight);

        // Auto-hide after 2 seconds of inactivity
        if (!isDragging) {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = window.setTimeout(() => {
                setShowHandle(false);
            }, 2000);
        }
    }, [scrollRef, isDragging]);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.addEventListener('scroll', updateScrollState, { passive: true });
            // Initial check
            updateScrollState();

            // Re-check after images load or content changes
            const resizeObserver = new ResizeObserver(() => updateScrollState());
            resizeObserver.observe(el);

            return () => {
                el.removeEventListener('scroll', updateScrollState);
                resizeObserver.disconnect();
            };
        }
    }, [scrollRef, updateScrollState]);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !scrollRef.current || !trackRef.current) return;
        
        const trackRect = trackRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(e.clientY - trackRect.top, trackRect.height));
        
        const newRatio = y / trackRect.height;
        const { scrollHeight, clientHeight } = scrollRef.current;
        
        scrollRef.current.scrollTop = newRatio * (scrollHeight - clientHeight);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        updateScrollState(); // restart auto-hide
    };

    return (
        <div 
            className={`fixed right-1 top-1/2 -translate-y-1/2 h-[50vh] w-8 z-[99999] pointer-events-none transition-opacity duration-300 ${showHandle || isDragging ? 'opacity-100' : 'opacity-0'}`}
        >
            <div 
                ref={trackRef}
                className="absolute right-2 top-0 bottom-0 w-2 bg-slate-200/50 rounded-full overflow-hidden pointer-events-auto backdrop-blur-sm"
                onPointerDown={(e) => {
                    // Click on track to jump
                    if (!scrollRef.current || !trackRef.current) return;
                    const trackRect = trackRef.current.getBoundingClientRect();
                    const y = Math.max(0, Math.min(e.clientY - trackRect.top, trackRect.height));
                    const newRatio = y / trackRect.height;
                    const { scrollHeight, clientHeight } = scrollRef.current;
                    scrollRef.current.scrollTop = newRatio * (scrollHeight - clientHeight);
                }}
            >
                <div 
                    className={`absolute w-full bg-slate-500 rounded-full transition-colors cursor-grab active:cursor-grabbing hover:bg-slate-600 ${isDragging ? 'bg-slate-700' : ''}`}
                    style={{ 
                        height: `${thumbHeight}px`,
                        top: `calc(${scrollRatio * 100}% - ${thumbHeight * scrollRatio}px)`,
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePointerDown(e);
                    }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                />
            </div>
            
            {/* Action Buttons for explicit tap scrolling */}
            <div className="absolute right-0 top-0 -translate-y-full pb-2 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    onClick={() => {
                        if (scrollRef.current) scrollRef.current.scrollBy({ top: -300, behavior: 'smooth' });
                        updateScrollState();
                    }}
                    aria-label="Scroll up"
                    className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
            </div>
            <div className="absolute right-0 bottom-0 translate-y-full pt-2 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    onClick={() => {
                        if (scrollRef.current) scrollRef.current.scrollBy({ top: 300, behavior: 'smooth' });
                        updateScrollState();
                    }}
                    aria-label="Scroll down"
                    className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
            </div>
        </div>
    );
};
