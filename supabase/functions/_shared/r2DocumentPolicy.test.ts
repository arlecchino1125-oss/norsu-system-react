import { describe, expect, it } from 'vitest';
import {
    buildR2ObjectKey,
    canUploadR2Resource,
    canViewR2Resource,
    parseR2Reference,
    validateUploadMetadata,
    type R2Actor,
    type R2Resource
} from './r2DocumentPolicy';

const student: R2Actor = {
    kind: 'student',
    authUserId: 'student-auth',
    studentDbId: 245,
    department: 'CBA'
};

const staff = (role: R2Actor['role'], department: string | null = null): R2Actor => ({
    kind: 'staff',
    authUserId: `${role}-auth`,
    role,
    department
});

const resource = (overrides: Partial<R2Resource> = {}): R2Resource => ({
    category: 'profile-photo',
    studentDbId: 245,
    department: 'CBA',
    ...overrides
});

describe('R2 document metadata policy', () => {
    it('accepts the exact file types allowed by each category', () => {
        expect(validateUploadMetadata('profile-photo', 'image/jpeg', 1)).toEqual({ extension: 'jpg' });
        expect(validateUploadMetadata('attendance-proof', 'image/webp', 1024)).toEqual({ extension: 'webp' });
        expect(validateUploadMetadata('claim-pwd', 'application/pdf', 1024)).toEqual({ extension: 'pdf' });
        expect(validateUploadMetadata('support-student', 'image/png', 1024 * 1024)).toEqual({ extension: 'png' });
    });

    it('rejects empty, oversized, and unsupported files', () => {
        expect(() => validateUploadMetadata('profile-photo', 'application/pdf', 100)).toThrow('Unsupported file type.');
        expect(() => validateUploadMetadata('claim-pwd', 'application/pdf', 0)).toThrow('File is empty.');
        expect(() => validateUploadMetadata('support-student', 'image/png', 1024 * 1024 + 1)).toThrow('File must be under 1 MB.');
        expect(() => validateUploadMetadata('claim-pwd', 'image/gif', 100)).toThrow('Unsupported file type.');
    });
});

describe('R2 object keys', () => {
    it('builds server-owned keys for every storage area', () => {
        expect(buildR2ObjectKey({
            category: 'claim-pwd',
            studentDbId: 245,
            objectId: '58f9ec90-fd72-4515-bd7c-95cbb976f434',
            extension: 'pdf'
        })).toBe('students/245/profile/claims/pwd/58f9ec90-fd72-4515-bd7c-95cbb976f434.pdf');

        expect(buildR2ObjectKey({
            category: 'support-student',
            studentDbId: 245,
            objectId: '58f9ec90-fd72-4515-bd7c-95cbb976f434',
            uploadGroupId: '815a364e-8bc0-4aba-8eac-5ef65579e716',
            extension: 'png'
        })).toBe('students/245/support/815a364e-8bc0-4aba-8eac-5ef65579e716/student-documents/58f9ec90-fd72-4515-bd7c-95cbb976f434.png');

        expect(buildR2ObjectKey({
            category: 'support-endorsement',
            studentDbId: 245,
            objectId: '58f9ec90-fd72-4515-bd7c-95cbb976f434',
            requestId: 91,
            extension: 'pdf'
        })).toBe('students/245/support/91/endorsement/58f9ec90-fd72-4515-bd7c-95cbb976f434.pdf');

        expect(buildR2ObjectKey({
            category: 'attendance-proof',
            studentDbId: 245,
            objectId: '58f9ec90-fd72-4515-bd7c-95cbb976f434',
            eventId: 52,
            extension: 'jpg'
        })).toBe('students/245/events/52/attendance/58f9ec90-fd72-4515-bd7c-95cbb976f434.jpg');
    });

    it('rejects unsafe identifiers and parses only r2 references', () => {
        expect(() => buildR2ObjectKey({
            category: 'profile-photo',
            studentDbId: 0,
            objectId: '../escape',
            extension: 'jpg'
        })).toThrow();
        expect(parseR2Reference('r2:students/245/profile/photo/a.jpg')).toBe('students/245/profile/photo/a.jpg');
        expect(parseR2Reference('r2:/students/245/profile/photo/a.jpg')).toBeNull();
        expect(parseR2Reference('https://drive.google.com/file/d/x/view')).toBeNull();
    });
});

describe('R2 authorization policy', () => {
    it('allows students to upload and view only their own student-owned resources', () => {
        expect(canUploadR2Resource(student, resource())).toBe(true);
        expect(canViewR2Resource(student, resource())).toBe(true);
        expect(canViewR2Resource(student, resource({ studentDbId: 246 }))).toBe(false);
        expect(canUploadR2Resource(student, resource({ category: 'support-endorsement' }))).toBe(false);
    });

    it('applies profile access to authorized staff and department boundaries', () => {
        expect(canViewR2Resource(staff('Admin'), resource())).toBe(true);
        expect(canViewR2Resource(staff('Care Staff'), resource())).toBe(true);
        expect(canViewR2Resource(staff('Registrar'), resource())).toBe(true);
        expect(canViewR2Resource(staff('Department Head', 'CBA'), resource())).toBe(true);
        expect(canViewR2Resource(staff('Department Head', 'CAS'), resource())).toBe(false);
    });

    it('denies Registrar support access and gates Department Heads by workflow and department', () => {
        const support = resource({ category: 'support-student', forwardedToDepartment: true });
        expect(canViewR2Resource(staff('Registrar'), support)).toBe(false);
        expect(canViewR2Resource(staff('Department Head', 'CBA'), support)).toBe(true);
        expect(canViewR2Resource(staff('Department Head', 'CAS'), support)).toBe(false);
        expect(canViewR2Resource(staff('Department Head', 'CBA'), { ...support, forwardedToDepartment: false })).toBe(false);
    });

    it('allows only Care Staff to upload endorsements for a submitted request', () => {
        const endorsement = resource({ category: 'support-endorsement', requestId: 91, supportStatus: 'Submitted' });
        expect(canUploadR2Resource(staff('Care Staff'), endorsement)).toBe(true);
        expect(canUploadR2Resource(staff('Care Staff'), { ...endorsement, supportStatus: 'Completed' })).toBe(false);
        expect(canUploadR2Resource(staff('Admin'), endorsement)).toBe(false);
        expect(canUploadR2Resource(staff('Department Head', 'CBA'), endorsement)).toBe(false);
    });
});
