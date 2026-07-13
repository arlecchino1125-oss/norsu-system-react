import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import {
    isR2Reference,
    resolveStoredAssetUrl,
    resolveStoredAssetUrlsBulk
} from './storageAssets';

vi.mock('../lib/invokeEdgeFunction', () => ({ invokeEdgeFunction: vi.fn() }));
vi.mock('../lib/supabase', () => ({
    supabase: {
        storage: {
            from: vi.fn(() => ({
                createSignedUrl: vi.fn(),
                createSignedUrls: vi.fn(),
                getPublicUrl: vi.fn()
            }))
        }
    }
}));

const invokeMock = vi.mocked(invokeEdgeFunction);
const locator = { category: 'profile-photo' as const, studentId: '2026-0001' };

describe('R2 stored asset resolution', () => {
    beforeEach(() => vi.clearAllMocks());

    it('recognizes only explicit r2 references', () => {
        expect(isR2Reference('r2:students/245/profile/photo/a.jpg')).toBe(true);
        expect(isR2Reference('https://example.com/r2:file')).toBe(false);
        expect(isR2Reference('old-storage-path.jpg')).toBe(false);
    });

    it('keeps legacy external URLs unchanged without invoking the signer', async () => {
        await expect(resolveStoredAssetUrl(
            'profile-pictures',
            'https://drive.google.com/file/d/abc/view'
        )).resolves.toBe('https://drive.google.com/file/d/abc/view');
        expect(invokeMock).not.toHaveBeenCalled();
    });

    it('requires an authoritative locator before resolving an r2 reference', async () => {
        await expect(resolveStoredAssetUrl(
            'profile-pictures',
            'r2:students/245/profile/photo/a.jpg'
        )).rejects.toThrow('Document authorization details are required.');
        expect(invokeMock).not.toHaveBeenCalled();
    });

    it('resolves an r2 reference through the authenticated Edge Function', async () => {
        invokeMock.mockResolvedValue({
            success: true,
            url: 'https://r2.example/signed-get',
            expiresAt: '2026-07-13T00:05:00.000Z'
        });

        await expect(resolveStoredAssetUrl(
            'profile-pictures',
            'r2:students/245/profile/photo/a.jpg',
            300,
            locator
        )).resolves.toBe('https://r2.example/signed-get');
        expect(invokeMock).toHaveBeenCalledWith('manage-r2-documents', expect.objectContaining({
            requireAuth: true,
            body: { action: 'create-view', locator }
        }));
    });

    it('batch-resolves r2 entries while retaining legacy URLs', async () => {
        invokeMock.mockResolvedValue({
            success: true,
            urls: { profile: 'https://r2.example/signed-get' },
            expiresAt: '2026-07-13T00:05:00.000Z'
        });
        const r2Value = 'r2:students/245/profile/photo/a.jpg';
        const legacyValue = 'https://drive.google.com/file/d/abc/view';

        const result = await resolveStoredAssetUrlsBulk(
            'profile-pictures',
            [r2Value, legacyValue],
            300,
            { [r2Value]: { key: 'profile', locator } }
        );

        expect(result).toEqual({
            [r2Value]: 'https://r2.example/signed-get',
            [legacyValue]: legacyValue
        });
    });
});
