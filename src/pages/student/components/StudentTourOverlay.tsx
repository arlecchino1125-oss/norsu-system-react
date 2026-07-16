import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface StudentTourStep {
    title: string;
    description: string;
    icon: ReactNode;
    highlightId: string | null;
}

interface StudentTourOverlayProps {
    isOpen: boolean;
    currentTourStep: StudentTourStep | undefined;
    highlightRect: DOMRect | null;
    isCompactPortalLayout: boolean;
    tourStep: number;
    totalSteps: number;
    onNext: () => void;
}

export function StudentTourOverlay({
    isOpen,
    currentTourStep,
    highlightRect,
    isCompactPortalLayout,
    tourStep,
    totalSteps,
    onNext
}: StudentTourOverlayProps) {
    if (!isOpen || !currentTourStep) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-auto">
            <div className="absolute inset-0 bg-black/60 transition-all duration-300 pointer-events-none" style={
                highlightRect ? {
                    clipPath: `polygon(
                        0% 0%, 0% 100%, 
                        ${highlightRect.left - 8}px 100%, 
                        ${highlightRect.left - 8}px ${highlightRect.top - 8}px, 
                        ${highlightRect.right + 8}px ${highlightRect.top - 8}px, 
                        ${highlightRect.right + 8}px ${highlightRect.bottom + 8}px, 
                        ${highlightRect.left - 8}px ${highlightRect.bottom + 8}px, 
                        ${highlightRect.left - 8}px 100%, 
                        100% 100%, 100% 0%
                    )`
                } : { clipPath: 'none' }
            } />

            {highlightRect && (
                <div className="absolute border-2 border-indigo-400 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 animate-pulse pointer-events-none"
                    style={{
                        top: highlightRect.top - 8,
                        left: highlightRect.left - 8,
                        width: highlightRect.width + 16,
                        height: highlightRect.height + 16
                    }}
                />
            )}

            <div className="absolute transition-all duration-500 max-w-sm w-full bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto"
                style={
                    highlightRect ? (
                        isCompactPortalLayout ? {
                            top: highlightRect.top > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400) ? 'auto' : highlightRect.bottom + 16,
                            bottom: highlightRect.top > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400) ? (typeof window !== 'undefined' ? window.innerHeight - highlightRect.top + 16 : 16) : 'auto',
                            left: '16px',
                            width: 'calc(100vw - 32px)',
                            transform: 'none',
                        } : {
                            top: highlightRect.top + highlightRect.height / 2,
                            left: highlightRect.right + 24,
                            transform: 'translateY(-50%)',
                        }
                    ) : {
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                    }
                }>
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-indigo-50 rounded-xl">
                        <div className="text-indigo-600 [&>svg]:w-6 [&>svg]:h-6">{currentTourStep.icon}</div>
                    </div>
                    <div className="flex-1 mt-1">
                        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{currentTourStep.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{currentTourStep.description}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                    <div className="flex gap-1.5">
                        {Array.from({ length: totalSteps }).map((_, index) => (
                            <div key={index} className={`h-1.5 rounded-full transition-all ${index === tourStep ? 'w-4 bg-indigo-600' : 'w-1.5 bg-slate-200'}`} />
                        ))}
                    </div>
                    <button type="button" onClick={onNext} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-colors shadow-md shadow-indigo-500/20">
                        {tourStep === totalSteps - 1 ? "Let's Go!" : "Next"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
