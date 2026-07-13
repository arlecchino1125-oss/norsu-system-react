import { uploadR2Document } from '../../../../services/r2DocumentService';

export const uploadAttendanceProof = async (file: File, eventId: number) => {
    const result = await uploadR2Document(file, {
        category: 'attendance-proof',
        eventId
    });
    return result.storedReference;
};
