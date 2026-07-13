import { describe, expect, it, vi } from 'vitest';
import { uploadR2Document } from '../../../../services/r2DocumentService';
import { uploadAttendanceProof } from './attendanceProofStorage';

vi.mock('../../../../services/r2DocumentService', () => ({ uploadR2Document: vi.fn() }));

describe('attendance proof storage', () => {
    it('binds the proof to the selected event and returns its stored reference', async () => {
        const uploadMock = vi.mocked(uploadR2Document).mockResolvedValue({
            storedReference: 'r2:students/245/events/52/attendance/file.jpg',
            uploadGroupId: undefined
        });
        const file = new File(['proof'], 'proof.jpg', { type: 'image/jpeg' });

        await expect(uploadAttendanceProof(file, 52))
            .resolves.toBe('r2:students/245/events/52/attendance/file.jpg');
        expect(uploadMock).toHaveBeenCalledWith(file, {
            category: 'attendance-proof',
            eventId: 52
        });
    });

});
