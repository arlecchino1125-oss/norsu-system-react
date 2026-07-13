import { describe, expect, it, vi } from 'vitest';
import { createR2Client } from './r2Client';

const config = {
    endpoint: 'https://account.r2.cloudflarestorage.com/',
    bucket: 'care-documents-prod'
};

describe('R2 client', () => {
    it('query-signs a path-safe PUT with an exact content type and expiry', async () => {
        const sign = vi.fn(async (url: string, init: RequestInit & { aws?: { signQuery?: boolean } }) =>
            new Request(url, init));
        const client = createR2Client(config, { sign, fetch: vi.fn() });

        const result = await client.signUpload(
            'students/245/profile/photo/image name.jpg',
            'image/jpeg',
            600
        );

        expect(result).toContain('/care-documents-prod/students/245/profile/photo/image%20name.jpg');
        expect(result).toContain('X-Amz-Expires=600');
        expect(sign).toHaveBeenCalledWith(expect.stringContaining('X-Amz-Expires=600'), expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            aws: { signQuery: true, allHeaders: true }
        }));
    });

    it('returns verified HEAD metadata and rejects a missing object', async () => {
        const awsFetch = vi.fn()
            .mockResolvedValueOnce(new Response(null, {
                status: 200,
                headers: { 'Content-Type': 'application/pdf', 'Content-Length': '512' }
            }))
            .mockResolvedValueOnce(new Response(null, { status: 404 }));
        const client = createR2Client(config, { sign: vi.fn(), fetch: awsFetch });

        await expect(client.headObject('students/245/file.pdf')).resolves.toEqual({
            contentType: 'application/pdf',
            size: 512
        });
        await expect(client.headObject('students/245/missing.pdf')).rejects.toThrow('Uploaded object was not found.');
    });

    it('uses authenticated DELETE only for a supplied object key', async () => {
        const awsFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
        const client = createR2Client(config, { sign: vi.fn(), fetch: awsFetch });

        await client.deleteObject('students/245/invalid.pdf');

        expect(awsFetch).toHaveBeenCalledWith(
            'https://account.r2.cloudflarestorage.com/care-documents-prod/students/245/invalid.pdf',
            { method: 'DELETE' }
        );
    });
});
