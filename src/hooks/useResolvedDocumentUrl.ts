import { useQuery } from '@tanstack/react-query';
import type { R2DocumentLocator } from '../services/r2DocumentService';
import { resolveStoredAssetUrl } from '../utils/storageAssets';

export const useResolvedDocumentUrl = (
    bucket: string,
    storedValue: string | null | undefined,
    locator?: R2DocumentLocator
) => {
    const normalized = String(storedValue || '').trim();
    const isLocalPreview = normalized.startsWith('blob:') || normalized.startsWith('data:');
    const query = useQuery({
        queryKey: ['resolved-document-url', bucket, normalized, locator || null],
        queryFn: () => resolveStoredAssetUrl(bucket, normalized, 300, locator),
        enabled: Boolean(normalized) && !isLocalPreview,
        staleTime: 240_000,
        gcTime: 300_000,
        retry: 1
    });

    return {
        url: isLocalPreview ? normalized : query.data || null,
        isLoading: query.isLoading,
        error: query.error
    };
};
