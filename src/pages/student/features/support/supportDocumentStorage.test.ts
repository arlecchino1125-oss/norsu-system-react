import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadR2Document } from '../../../../services/r2DocumentService';
import {
    uploadCareEndorsement,
    uploadStudentSupportDocuments
} from './supportDocumentStorage';

vi.mock('../../../../services/r2DocumentService', () => ({ uploadR2Document: vi.fn() }));
const uploadMock = vi.mocked(uploadR2Document);

describe('support document storage', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reuses one server-issued group for all student support files', async () => {
        uploadMock
            .mockResolvedValueOnce({ storedReference: 'r2:first.pdf', uploadGroupId: 'group-id' })
            .mockResolvedValueOnce({ storedReference: 'r2:second.jpg', uploadGroupId: 'group-id' });
        const first = new File(['first'], 'first.pdf', { type: 'application/pdf' });
        const second = new File(['second'], 'second.jpg', { type: 'image/jpeg' });

        await expect(uploadStudentSupportDocuments([first, second]))
            .resolves.toEqual(['r2:first.pdf', 'r2:second.jpg']);
        expect(uploadMock).toHaveBeenNthCalledWith(1, first, {
            category: 'support-student',
            uploadGroupId: undefined
        });
        expect(uploadMock).toHaveBeenNthCalledWith(2, second, {
            category: 'support-student',
            uploadGroupId: 'group-id'
        });
    });

    it('stops immediately when one support upload fails', async () => {
        uploadMock.mockRejectedValueOnce(new Error('upload failed'));

        await expect(uploadStudentSupportDocuments([
            new File(['first'], 'first.pdf', { type: 'application/pdf' }),
            new File(['second'], 'second.pdf', { type: 'application/pdf' })
        ])).rejects.toThrow('upload failed');
        expect(uploadMock).toHaveBeenCalledTimes(1);
    });

    it('binds a CARE endorsement to the existing support request', async () => {
        uploadMock.mockResolvedValue({
            storedReference: 'r2:students/245/support/91/endorsement/file.pdf',
            uploadGroupId: undefined
        });
        const file = new File(['letter'], 'letter.pdf', { type: 'application/pdf' });

        await expect(uploadCareEndorsement(file, 91))
            .resolves.toBe('r2:students/245/support/91/endorsement/file.pdf');
        expect(uploadMock).toHaveBeenCalledWith(file, {
            category: 'support-endorsement',
            requestId: 91
        });
    });
});
