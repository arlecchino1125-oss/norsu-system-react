import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { getProfileCategoryForDatabaseField, uploadR2Document } from './r2DocumentService';

vi.mock('../lib/invokeEdgeFunction', () => ({
    invokeEdgeFunction: vi.fn()
}));

const invokeMock = vi.mocked(invokeEdgeFunction);

describe('r2DocumentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps stored profile database fields to authoritative locators', () => {
        expect(getProfileCategoryForDatabaseField('profile_picture_url')).toBe('profile-photo');
        expect(getProfileCategoryForDatabaseField('pwd_document_url')).toBe('claim-pwd');
        expect(getProfileCategoryForDatabaseField('ip_document_url')).toBe('claim-indigenous');
        expect(getProfileCategoryForDatabaseField('four_ps_document_url')).toBe('claim-four-ps');
        expect(getProfileCategoryForDatabaseField('solo_parent_document_url')).toBe('claim-solo-parent');
        expect(getProfileCategoryForDatabaseField('senior_citizen_document_url')).toBe('claim-senior-citizen');
        expect(() => getProfileCategoryForDatabaseField('email')).toThrow('Unsupported profile document field.');
    });

    it('signs, uploads, verifies, and returns only the stored reference', async () => {
        invokeMock
            .mockResolvedValueOnce({
                success: true,
                uploadUrl: 'https://r2.example/signed-put',
                objectKey: 'students/245/profile/photo/file.jpg',
                contentType: 'image/jpeg'
            })
            .mockResolvedValueOnce({
                success: true,
                storedReference: 'r2:students/245/profile/photo/file.jpg'
            });
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const file = new File(['portrait'], 'private-name.jpg', { type: 'image/jpeg' });

        const result = await uploadR2Document(file, { category: 'profile-photo' });

        expect(result).toEqual({
            storedReference: 'r2:students/245/profile/photo/file.jpg',
            uploadGroupId: undefined
        });
        expect(invokeMock).toHaveBeenNthCalledWith(1, 'manage-r2-documents', expect.objectContaining({
            requireAuth: true,
            body: {
                action: 'create-upload',
                category: 'profile-photo',
                contentType: 'image/jpeg',
                size: file.size
            }
        }));
        expect(fetchMock).toHaveBeenCalledWith('https://r2.example/signed-put', {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            body: file
        });
        expect(invokeMock).toHaveBeenNthCalledWith(2, 'manage-r2-documents', expect.objectContaining({
            body: {
                action: 'complete-upload',
                category: 'profile-photo',
                objectKey: 'students/245/profile/photo/file.jpg'
            }
        }));
    });

    it('reuses the server-issued support upload group during finalization', async () => {
        invokeMock
            .mockResolvedValueOnce({
                success: true,
                uploadUrl: 'https://r2.example/signed-put',
                objectKey: 'students/245/support/group/student-documents/file.pdf',
                contentType: 'application/pdf',
                uploadGroupId: 'server-group'
            })
            .mockResolvedValueOnce({
                success: true,
                storedReference: 'r2:students/245/support/group/student-documents/file.pdf'
            });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

        const result = await uploadR2Document(
            new File(['support'], 'support.pdf', { type: 'application/pdf' }),
            { category: 'support-student' }
        );

        expect(result.uploadGroupId).toBe('server-group');
        expect(invokeMock).toHaveBeenNthCalledWith(2, 'manage-r2-documents', expect.objectContaining({
            body: expect.objectContaining({ uploadGroupId: 'server-group' })
        }));
    });

    it('does not finalize or return a reference when the direct upload fails', async () => {
        invokeMock.mockResolvedValueOnce({
            success: true,
            uploadUrl: 'https://r2.example/signed-put',
            objectKey: 'students/245/profile/photo/file.jpg',
            contentType: 'image/jpeg'
        });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

        await expect(uploadR2Document(
            new File(['portrait'], 'portrait.jpg', { type: 'image/jpeg' }),
            { category: 'profile-photo' }
        )).rejects.toThrow('Unable to upload the selected file.');
        expect(invokeMock).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid files before requesting a signed URL', async () => {
        const file = new File(['document'], 'portrait.pdf', { type: 'application/pdf' });

        await expect(uploadR2Document(file, { category: 'profile-photo' }))
            .rejects.toThrow('Unsupported file type.');
        expect(invokeMock).not.toHaveBeenCalled();
    });
});
