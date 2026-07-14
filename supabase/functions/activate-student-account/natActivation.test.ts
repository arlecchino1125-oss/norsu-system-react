import { describe, expect, it, vi } from 'vitest';
import {
    classifyNatActivationCompletion,
    requireApprovedNatActivation
} from './natActivation.ts';

describe('NAT student activation authorization', () => {
    it('resolves the application from the NAT session instead of a supplied application ID', async () => {
        const application = {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            status: 'Approved for Enrollment'
        };
        const requireSession = vi.fn().mockResolvedValue({ application });

        const result = await requireApprovedNatActivation({
            token: 'opaque-token',
            browserId: '11111111-1111-4111-8111-111111111111',
            applicationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
        }, requireSession);

        expect(requireSession).toHaveBeenCalledWith({
            token: 'opaque-token',
            browserId: '11111111-1111-4111-8111-111111111111'
        });
        expect(result).toBe(application);
    });

    it('rejects activation until staff approve the application for enrollment', async () => {
        const requireSession = vi.fn().mockResolvedValue({
            application: {
                id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                status: 'Submitted'
            }
        });

        await expect(requireApprovedNatActivation({
            token: 'opaque-token',
            browserId: '11111111-1111-4111-8111-111111111111'
        }, requireSession)).rejects.toMatchObject({
            message: 'Student account activation is not available yet.',
            status: 403
        });
    });
});

describe('NAT activation completion recovery', () => {
    const expected = {
        applicationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        studentId: '202612345',
        authUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    };

    it('recognizes a committed student and archive pair', () => {
        expect(classifyNatActivationCompletion({
            student: {
                student_id: expected.studentId,
                auth_user_id: expected.authUserId
            },
            archive: {
                source_application_id: expected.applicationId,
                activated_student_id: expected.studentId
            }
        }, expected)).toBe('committed');
    });

    it('treats every unconfirmed transport result as ambiguous', () => {
        expect(classifyNatActivationCompletion({
            student: null,
            archive: null
        }, expected)).toBe('unknown');

        expect(classifyNatActivationCompletion({
            student: null,
            archive: null,
            studentError: new Error('network unavailable')
        }, expected)).toBe('unknown');

        expect(classifyNatActivationCompletion({
            student: {
                student_id: expected.studentId,
                auth_user_id: expected.authUserId
            },
            archive: null
        }, expected)).toBe('unknown');
    });
});
