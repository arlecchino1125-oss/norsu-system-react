import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';

export type R2ClaimCategory =
    | 'claim-pwd'
    | 'claim-indigenous'
    | 'claim-four-ps'
    | 'claim-solo-parent'
    | 'claim-senior-citizen';

export type R2UploadRequest =
    | { category: 'profile-photo' | R2ClaimCategory }
    | { category: 'support-student'; uploadGroupId?: string }
    | { category: 'support-endorsement'; requestId: number }
    | { category: 'attendance-proof'; eventId: number };

export type R2DocumentLocator =
    | { category: 'profile-photo' | R2ClaimCategory; studentId: string }
    | { category: 'support-student'; requestId: number; index: number }
    | { category: 'support-endorsement'; requestId: number }
    | { category: 'attendance-proof'; attendanceId: number };

type CreateUploadResponse = {
    success: true;
    uploadUrl: string;
    objectKey: string;
    contentType: string;
    uploadGroupId?: string;
};

type CompleteUploadResponse = {
    success: true;
    storedReference: string;
};

const MAX_DOCUMENT_BYTES = 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, 'application/pdf']);
const PROFILE_DATABASE_CATEGORIES: Record<string, 'profile-photo' | R2ClaimCategory> = {
    profile_picture_url: 'profile-photo',
    pwd_document_url: 'claim-pwd',
    ip_document_url: 'claim-indigenous',
    four_ps_document_url: 'claim-four-ps',
    solo_parent_document_url: 'claim-solo-parent',
    senior_citizen_document_url: 'claim-senior-citizen'
};

export const getProfileCategoryForDatabaseField = (field: string) => {
    const category = PROFILE_DATABASE_CATEGORIES[field];
    if (!category) throw new Error('Unsupported profile document field.');
    return category;
};

const validateFile = (file: File, request: R2UploadRequest) => {
    if (file.size < 1) throw new Error('File is empty.');
    if (file.size > MAX_DOCUMENT_BYTES) throw new Error('File must be under 1 MB.');
    const imageOnly = request.category === 'profile-photo' || request.category === 'attendance-proof';
    if (!(imageOnly ? IMAGE_TYPES : DOCUMENT_TYPES).has(file.type)) {
        throw new Error('Unsupported file type.');
    }
};

const MAX_IMAGE_DIMENSION = 1280;
const COMPRESSION_QUALITIES = [0.8, 0.6, 0.4];

// ponytail: single-pass canvas downscale + quality step-down, not a full image pipeline. Good enough for phone camera photos.
const compressImageIfNeeded = async (file: File): Promise<File> => {
    if (!IMAGE_TYPES.has(file.type) || file.size <= MAX_DOCUMENT_BYTES) return file;

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close();
        return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    for (const quality of COMPRESSION_QUALITIES) {
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) continue;
        if (blob.size <= MAX_DOCUMENT_BYTES || quality === COMPRESSION_QUALITIES[COMPRESSION_QUALITIES.length - 1]) {
            return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
        }
    }
    return file;
};

export const uploadR2Document = async (file: File, request: R2UploadRequest) => {
    const uploadFile = await compressImageIfNeeded(file);
    validateFile(uploadFile, request);

    const upload = await invokeEdgeFunction<CreateUploadResponse>('manage-r2-documents', {
        requireAuth: true,
        body: {
            action: 'create-upload',
            ...request,
            contentType: uploadFile.type,
            size: uploadFile.size
        },
        fallbackMessage: 'Unable to prepare the document upload.'
    });
    if (!upload?.uploadUrl || !upload.objectKey || !upload.contentType) {
        throw new Error('Unable to prepare the document upload.');
    }

    const uploadResponse = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': upload.contentType },
        body: uploadFile
    });
    if (!uploadResponse.ok) {
        throw new Error('Unable to upload the selected file.');
    }

    const completed = await invokeEdgeFunction<CompleteUploadResponse>('manage-r2-documents', {
        requireAuth: true,
        body: {
            action: 'complete-upload',
            ...request,
            ...(upload.uploadGroupId ? { uploadGroupId: upload.uploadGroupId } : {}),
            objectKey: upload.objectKey
        },
        fallbackMessage: 'Unable to verify the uploaded document.'
    });
    if (!completed?.storedReference?.startsWith('r2:')) {
        throw new Error('Unable to verify the uploaded document.');
    }

    return {
        storedReference: completed.storedReference,
        uploadGroupId: upload.uploadGroupId
    };
};
