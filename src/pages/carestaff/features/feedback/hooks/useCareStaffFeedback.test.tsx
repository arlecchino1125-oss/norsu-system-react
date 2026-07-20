import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCareStaffFeedback } from './useCareStaffFeedback';

vi.mock('../../../../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@tanstack/react-query', () => ({
    useQuery: () => ({ data: undefined, isLoading: false, refetch: vi.fn() }),
}));

describe('useCareStaffFeedback printing', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('clones rendered feedback into the print document without writing HTML', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useCareStaffFeedback({ functions: {} }));
        const source = document.createElement('section');
        const comment = document.createElement('p');
        const feedback = '<img src=x onerror="alert(1)">';
        comment.textContent = feedback;
        source.append(comment);
        result.current.printRef.current = source;

        const printDocument = document.implementation.createHTMLDocument();
        const write = vi.spyOn(printDocument, 'write');
        const printWindow = {
            document: printDocument,
            focus: vi.fn(),
            print: vi.fn(),
            close: vi.fn(),
        } as unknown as Window;
        vi.spyOn(window, 'open').mockReturnValue(printWindow);

        act(() => result.current.handlePrintEval());

        expect(write).not.toHaveBeenCalled();
        expect(printDocument.body.textContent).toContain(feedback);
        expect(printDocument.body.querySelector('img')).toBeNull();
    });
});
