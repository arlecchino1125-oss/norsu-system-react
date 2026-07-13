import { describe, expect, it, vi } from 'vitest';
import { handleR2DocumentRequest, type R2HandlerDependencies } from './handler';
import type { R2Actor, R2Resource } from '../_shared/r2DocumentPolicy';

const actor: R2Actor = {
    kind: 'student',
    authUserId: 'auth-student',
    studentDbId: 245,
    department: 'CBA'
};

const profileResource: R2Resource = {
    category: 'profile-photo',
    studentDbId: 245,
    department: 'CBA'
};

const request = (body: Record<string, unknown>) => new Request('https://example.test/manage-r2-documents', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

const createDependencies = (overrides: Partial<R2HandlerDependencies> = {}): R2HandlerDependencies => ({
    authenticate: vi.fn().mockResolvedValue(actor),
    resolveUploadResource: vi.fn().mockResolvedValue(profileResource),
    resolveViewResource: vi.fn().mockResolvedValue({
        resource: profileResource,
        storedReference: 'r2:students/245/profile/photo/58f9ec90-fd72-4515-bd7c-95cbb976f434.jpg'
    }),
    signUpload: vi.fn().mockResolvedValue('https://signed.example/upload'),
    signView: vi.fn().mockResolvedValue('https://signed.example/view'),
    signLegacyStorage: vi.fn().mockResolvedValue('https://signed.example/legacy'),
    headObject: vi.fn().mockResolvedValue({ contentType: 'image/jpeg', size: 100 }),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    randomUuid: vi.fn()
        .mockReturnValueOnce('815a364e-8bc0-4aba-8eac-5ef65579e716')
        .mockReturnValue('58f9ec90-fd72-4515-bd7c-95cbb976f434'),
    now: vi.fn().mockReturnValue(new Date('2026-07-13T00:00:00.000Z')),
    ...overrides
});

const readJson = async (response: Response) => ({
    status: response.status,
    body: await response.json()
});

describe('manage-r2-documents handler', () => {
    it('rejects unauthenticated requests', async () => {
        const deps = createDependencies({ authenticate: vi.fn().mockResolvedValue(null) });

        const result = await readJson(await handleR2DocumentRequest(request({ action: 'create-upload' }), deps));

        expect(result).toEqual({
            status: 401,
            body: { success: false, error: 'Authentication required.' }
        });
        expect(deps.signUpload).not.toHaveBeenCalled();
    });

    it('creates a signed upload using only the server-resolved student database ID', async () => {
        const deps = createDependencies();

        const result = await readJson(await handleR2DocumentRequest(request({
            action: 'create-upload',
            category: 'profile-photo',
            contentType: 'image/jpeg',
            size: 100,
            studentDbId: 999999
        }), deps));

        expect(result).toEqual({
            status: 200,
            body: {
                success: true,
                uploadUrl: 'https://signed.example/upload',
                objectKey: 'students/245/profile/photo/815a364e-8bc0-4aba-8eac-5ef65579e716.jpg',
                contentType: 'image/jpeg'
            }
        });
        expect(deps.signUpload).toHaveBeenCalledWith(
            'students/245/profile/photo/815a364e-8bc0-4aba-8eac-5ef65579e716.jpg',
            'image/jpeg',
            600
        );
    });

    it('creates and reuses a server-generated support upload group', async () => {
        const supportResource: R2Resource = {
            category: 'support-student',
            studentDbId: 245,
            department: 'CBA'
        };
        const deps = createDependencies({
            resolveUploadResource: vi.fn().mockResolvedValue(supportResource)
        });

        const result = await readJson(await handleR2DocumentRequest(request({
            action: 'create-upload',
            category: 'support-student',
            contentType: 'application/pdf',
            size: 100
        }), deps));

        expect(result.body.uploadGroupId).toBe('815a364e-8bc0-4aba-8eac-5ef65579e716');
        expect(result.body.objectKey).toBe(
            'students/245/support/815a364e-8bc0-4aba-8eac-5ef65579e716/student-documents/58f9ec90-fd72-4515-bd7c-95cbb976f434.pdf'
        );
    });

    it('rejects cross-student viewing before signing', async () => {
        const deps = createDependencies({
            resolveViewResource: vi.fn().mockResolvedValue({
                resource: { ...profileResource, studentDbId: 246 },
                storedReference: 'r2:students/246/profile/photo/current.jpg'
            })
        });

        const result = await readJson(await handleR2DocumentRequest(request({
            action: 'create-view',
            locator: { category: 'profile-photo', studentId: '2026-0002' }
        }), deps));

        expect(result.status).toBe(403);
        expect(deps.signView).not.toHaveBeenCalled();
    });

    it('rejects unknown and malformed document locators before resolving a file', async () => {
        for (const locator of [
            { category: 'bogus', requestId: 91 },
            { category: 'support-student', requestId: 91, index: -1 },
            { category: 'attendance-proof', attendanceId: 1.5 }
        ]) {
            const deps = createDependencies();

            const result = await readJson(await handleR2DocumentRequest(request({
                action: 'create-view', locator
            }), deps));

            expect(result).toEqual({
                status: 400,
                body: { success: false, error: 'Invalid document locator.' }
            });
            expect(deps.resolveViewResource).not.toHaveBeenCalled();
        }
    });

    it('verifies uploaded object metadata and removes an invalid unreferenced upload', async () => {
        const deps = createDependencies({
            headObject: vi.fn().mockResolvedValue({ contentType: 'image/jpeg', size: 1024 * 1024 + 1 })
        });
        const objectKey = 'students/245/profile/photo/58f9ec90-fd72-4515-bd7c-95cbb976f434.jpg';

        const result = await readJson(await handleR2DocumentRequest(request({
            action: 'complete-upload',
            category: 'profile-photo',
            objectKey
        }), deps));

        expect(result.status).toBe(400);
        expect(deps.deleteObject).toHaveBeenCalledWith(objectKey);
        expect(JSON.stringify(result.body)).not.toContain('secret');
    });

    it('resolves legacy HTTP, legacy Storage, and R2 references after authorization', async () => {
        const httpDeps = createDependencies({
            resolveViewResource: vi.fn().mockResolvedValue({
                resource: profileResource,
                storedReference: 'https://drive.google.com/file/d/abc/view'
            })
        });
        const httpResult = await readJson(await handleR2DocumentRequest(request({
            action: 'create-view', locator: { category: 'profile-photo', studentId: '2026-0001' }
        }), httpDeps));
        expect(httpResult.body.url).toBe('https://drive.google.com/file/d/abc/view');

        const legacyDeps = createDependencies({
            resolveViewResource: vi.fn().mockResolvedValue({
                resource: { ...profileResource, category: 'support-student' },
                storedReference: 'old-support.pdf',
                legacyBucket: 'support_documents'
            })
        });
        const legacyResult = await readJson(await handleR2DocumentRequest(request({
            action: 'create-view', locator: { category: 'support-student', requestId: 91, index: 0 }
        }), legacyDeps));
        expect(legacyResult.body.url).toBe('https://signed.example/legacy');

        const r2Deps = createDependencies();
        const r2Result = await readJson(await handleR2DocumentRequest(request({
            action: 'create-view', locator: { category: 'profile-photo', studentId: '2026-0001' }
        }), r2Deps));
        expect(r2Result.body.url).toBe('https://signed.example/view');
        expect(r2Deps.signView).toHaveBeenCalledWith('students/245/profile/photo/58f9ec90-fd72-4515-bd7c-95cbb976f434.jpg', 300);
    });

    it('views deterministic migrated keys but never accepts them as live upload completions', async () => {
        const migratedProfileKey = 'students/245/profile/photo/drive-1AbC_def-99.jpg';
        const profileDeps = createDependencies({
            resolveViewResource: vi.fn().mockResolvedValue({
                resource: profileResource,
                storedReference: `r2:${migratedProfileKey}`
            })
        });

        const profileView = await readJson(await handleR2DocumentRequest(request({
            action: 'create-view', locator: { category: 'profile-photo', studentId: '2026-0001' }
        }), profileDeps));

        expect(profileView.status).toBe(200);
        expect(profileDeps.signView).toHaveBeenCalledWith(migratedProfileKey, 300);

        const migratedSupportKey = 'students/245/support/91/student-documents/supabase-old-support.pdf';
        const supportDeps = createDependencies({
            resolveViewResource: vi.fn().mockResolvedValue({
                resource: { ...profileResource, category: 'support-student', requestId: 91 },
                storedReference: `r2:${migratedSupportKey}`
            })
        });
        const supportView = await readJson(await handleR2DocumentRequest(request({
            action: 'create-view', locator: { category: 'support-student', requestId: 91, index: 0 }
        }), supportDeps));

        expect(supportView.status).toBe(200);
        expect(supportDeps.signView).toHaveBeenCalledWith(migratedSupportKey, 300);

        const completion = await readJson(await handleR2DocumentRequest(request({
            action: 'complete-upload', category: 'profile-photo', objectKey: migratedProfileKey
        }), createDependencies()));
        expect(completion.status).toBe(403);
    });

    it('omits individually denied batch entries', async () => {
        const deps = createDependencies({
            resolveViewResource: vi.fn()
                .mockResolvedValueOnce({ resource: profileResource, storedReference: 'r2:students/245/profile/photo/58f9ec90-fd72-4515-bd7c-95cbb976f434.jpg' })
                .mockResolvedValueOnce({ resource: { ...profileResource, studentDbId: 246 }, storedReference: 'r2:students/246/profile/photo/815a364e-8bc0-4aba-8eac-5ef65579e716.jpg' })
        });

        const result = await readJson(await handleR2DocumentRequest(request({
            action: 'create-view-batch',
            entries: [
                { key: 'allowed', locator: { category: 'profile-photo', studentId: '2026-0001' } },
                { key: 'denied', locator: { category: 'profile-photo', studentId: '2026-0002' } }
            ]
        }), deps));

        expect(result.status).toBe(200);
        expect(result.body.urls).toEqual({ allowed: 'https://signed.example/view' });
    });
});
