import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadR2Document } from '../../../../services/r2DocumentService';
import {
    getProfileDocumentCategory,
    uploadProfileDocument
} from './profileDocumentStorage';

vi.mock('../../../../services/r2DocumentService', () => ({ uploadR2Document: vi.fn() }));
const uploadMock = vi.mocked(uploadR2Document);

describe('profile document storage mapping', () => {
    beforeEach(() => vi.clearAllMocks());

    it.each([
        ['profile_picture_url', 'profile-photo'],
        ['pwdDocumentUrl', 'claim-pwd'],
        ['ipDocumentUrl', 'claim-indigenous'],
        ['fourPsDocumentUrl', 'claim-four-ps'],
        ['soloParentDocumentUrl', 'claim-solo-parent'],
        ['seniorCitizenDocumentUrl', 'claim-senior-citizen']
    ] as const)('maps %s to %s', (field, category) => {
        expect(getProfileDocumentCategory(field)).toBe(category);
    });

    it('uploads through the mapped R2 category', async () => {
        uploadMock.mockResolvedValue({
            storedReference: 'r2:students/245/profile/claims/pwd/file.pdf',
            uploadGroupId: undefined
        });
        const file = new File(['pwd'], 'pwd.pdf', { type: 'application/pdf' });

        await expect(uploadProfileDocument(file, 'pwdDocumentUrl'))
            .resolves.toBe('r2:students/245/profile/claims/pwd/file.pdf');
        expect(uploadMock).toHaveBeenCalledWith(file, { category: 'claim-pwd' });
    });

    it('rejects unknown profile storage fields', () => {
        expect(() => getProfileDocumentCategory('unknown')).toThrow('Unsupported profile document field.');
    });
});
