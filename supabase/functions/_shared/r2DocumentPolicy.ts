export type R2DocumentCategory =
    | 'profile-photo'
    | 'claim-pwd'
    | 'claim-indigenous'
    | 'claim-four-ps'
    | 'claim-solo-parent'
    | 'claim-senior-citizen'
    | 'support-student'
    | 'support-endorsement'
    | 'attendance-proof';

export type R2ClaimCategory = Extract<R2DocumentCategory,
    | 'claim-pwd'
    | 'claim-indigenous'
    | 'claim-four-ps'
    | 'claim-solo-parent'
    | 'claim-senior-citizen'
>;

export type R2StaffRole = 'Admin' | 'Care Staff' | 'Registrar' | 'Department Head';

export type R2Actor = {
    kind: 'student' | 'staff';
    authUserId: string;
    studentDbId?: number;
    role?: R2StaffRole;
    department: string | null;
};

export type R2Resource = {
    category: R2DocumentCategory;
    studentDbId: number;
    department: string | null;
    requestId?: number;
    eventId?: number;
    forwardedToDepartment?: boolean;
    supportStatus?: string;
};

export type BuildR2ObjectKeyInput = {
    category: R2DocumentCategory;
    studentDbId: number;
    objectId: string;
    extension: string;
    uploadGroupId?: string;
    requestId?: number;
    eventId?: number;
};

export const MAX_R2_DOCUMENT_BYTES = 1024 * 1024;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_MIME_EXTENSIONS = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp']
]);
const DOCUMENT_MIME_EXTENSIONS = new Map([
    ...IMAGE_MIME_EXTENSIONS,
    ['application/pdf', 'pdf']
]);
const IMAGE_ONLY_CATEGORIES = new Set<R2DocumentCategory>(['profile-photo', 'attendance-proof']);
const CLAIM_PATHS: Record<R2ClaimCategory, string> = {
    'claim-pwd': 'pwd',
    'claim-indigenous': 'indigenous',
    'claim-four-ps': 'four-ps',
    'claim-solo-parent': 'solo-parent',
    'claim-senior-citizen': 'senior-citizen'
};

const isPositiveInteger = (value: unknown): value is number =>
    Number.isInteger(value) && Number(value) > 0;

const requireUuid = (value: unknown, label: string) => {
    const normalized = String(value || '').trim();
    if (!UUID_PATTERN.test(normalized)) {
        throw new Error(`${label} is invalid.`);
    }
    return normalized;
};

const requirePositiveInteger = (value: unknown, label: string) => {
    if (!isPositiveInteger(value)) {
        throw new Error(`${label} is invalid.`);
    }
    return Number(value);
};

export const validateUploadMetadata = (
    category: R2DocumentCategory,
    mimeType: string,
    size: number
) => {
    if (!Number.isFinite(size) || size < 1) {
        throw new Error('File is empty.');
    }
    if (size > MAX_R2_DOCUMENT_BYTES) {
        throw new Error('File must be under 1 MB.');
    }

    const allowedTypes = IMAGE_ONLY_CATEGORIES.has(category)
        ? IMAGE_MIME_EXTENSIONS
        : DOCUMENT_MIME_EXTENSIONS;
    const extension = allowedTypes.get(String(mimeType || '').trim().toLowerCase());
    if (!extension) {
        throw new Error('Unsupported file type.');
    }

    return { extension };
};

export const buildR2ObjectKey = (input: BuildR2ObjectKeyInput) => {
    const studentDbId = requirePositiveInteger(input.studentDbId, 'Student');
    const objectId = requireUuid(input.objectId, 'Object ID');
    const extension = String(input.extension || '').trim().toLowerCase();
    if (!['jpg', 'png', 'webp', 'pdf'].includes(extension)) {
        throw new Error('File extension is invalid.');
    }

    const prefix = `students/${studentDbId}`;
    if (input.category === 'profile-photo') {
        return `${prefix}/profile/photo/${objectId}.${extension}`;
    }
    if (input.category in CLAIM_PATHS) {
        const claimPath = CLAIM_PATHS[input.category as R2ClaimCategory];
        return `${prefix}/profile/claims/${claimPath}/${objectId}.${extension}`;
    }
    if (input.category === 'support-student') {
        const uploadGroupId = requireUuid(input.uploadGroupId, 'Upload group');
        return `${prefix}/support/${uploadGroupId}/student-documents/${objectId}.${extension}`;
    }
    if (input.category === 'support-endorsement') {
        const requestId = requirePositiveInteger(input.requestId, 'Support request');
        return `${prefix}/support/${requestId}/endorsement/${objectId}.${extension}`;
    }

    const eventId = requirePositiveInteger(input.eventId, 'Event');
    return `${prefix}/events/${eventId}/attendance/${objectId}.${extension}`;
};

export const parseR2Reference = (value: unknown) => {
    const normalized = String(value || '').trim();
    if (!normalized.startsWith('r2:students/')) return null;

    const objectKey = normalized.slice(3);
    if (
        objectKey.includes('..')
        || objectKey.includes('\\')
        || objectKey.includes('//')
        || !/^students\/[1-9]\d*\/.+/.test(objectKey)
    ) {
        return null;
    }
    return objectKey;
};

const isProfileResource = (category: R2DocumentCategory) =>
    category === 'profile-photo' || category.startsWith('claim-');

const isSameDepartment = (actor: R2Actor, resource: R2Resource) =>
    Boolean(actor.department)
    && String(actor.department).trim() === String(resource.department || '').trim();

export const canUploadR2Resource = (actor: R2Actor, resource: R2Resource) => {
    if (actor.kind === 'student') {
        if (actor.studentDbId !== resource.studentDbId) return false;
        return resource.category !== 'support-endorsement';
    }

    return actor.role === 'Care Staff'
        && resource.category === 'support-endorsement'
        && isPositiveInteger(resource.requestId)
        && resource.supportStatus === 'Submitted';
};

export const canViewR2Resource = (actor: R2Actor, resource: R2Resource) => {
    if (actor.kind === 'student') {
        if (actor.studentDbId !== resource.studentDbId) return false;
        return resource.category !== 'support-endorsement';
    }

    if (actor.role === 'Admin' || actor.role === 'Care Staff') return true;
    if (actor.role === 'Registrar') return isProfileResource(resource.category);
    if (actor.role !== 'Department Head' || !isSameDepartment(actor, resource)) return false;

    if (isProfileResource(resource.category) || resource.category === 'attendance-proof') return true;
    return Boolean(resource.forwardedToDepartment);
};
