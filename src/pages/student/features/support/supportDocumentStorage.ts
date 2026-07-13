import { uploadR2Document } from '../../../../services/r2DocumentService';

export const uploadStudentSupportDocuments = async (files: File[]) => {
    const storedReferences: string[] = [];
    let uploadGroupId: string | undefined;
    for (const file of files) {
        const result = await uploadR2Document(file, {
            category: 'support-student',
            uploadGroupId
        });
        uploadGroupId = result.uploadGroupId || uploadGroupId;
        storedReferences.push(result.storedReference);
    }
    return storedReferences;
};

export const uploadCareEndorsement = async (file: File, requestId: number) => {
    const result = await uploadR2Document(file, {
        category: 'support-endorsement',
        requestId
    });
    return result.storedReference;
};
