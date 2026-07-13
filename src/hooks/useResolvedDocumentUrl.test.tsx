import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveStoredAssetUrl } from '../utils/storageAssets';
import { useResolvedDocumentUrl } from './useResolvedDocumentUrl';

vi.mock('../utils/storageAssets', () => ({ resolveStoredAssetUrl: vi.fn() }));

const resolveMock = vi.mocked(resolveStoredAssetUrl);

describe('useResolvedDocumentUrl', () => {
    beforeEach(() => vi.clearAllMocks());

    it('resolves private references without persisting the signed URL', async () => {
        resolveMock.mockResolvedValue('https://r2.example/signed-get');
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: PropsWithChildren) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        const locator = { category: 'profile-photo' as const, studentId: '2026-0001' };

        const { result } = renderHook(() => useResolvedDocumentUrl(
            'profile-pictures',
            'r2:students/245/profile/photo/a.jpg',
            locator
        ), { wrapper });

        await waitFor(() => expect(result.current.url).toBe('https://r2.example/signed-get'));
        expect(resolveMock).toHaveBeenCalledWith(
            'profile-pictures',
            'r2:students/245/profile/photo/a.jpg',
            300,
            locator
        );
    });
});
