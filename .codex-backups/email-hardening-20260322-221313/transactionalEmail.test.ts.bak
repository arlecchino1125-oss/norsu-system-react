import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeEdgeFunctionMock } = vi.hoisted(() => ({
    invokeEdgeFunctionMock: vi.fn()
}));

vi.mock('./invokeEdgeFunction', () => ({
    invokeEdgeFunction: invokeEdgeFunctionMock
}));

import { sendTransactionalEmailNotification } from './transactionalEmail';

describe('sendTransactionalEmailNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        invokeEdgeFunctionMock.mockResolvedValue({ success: true });
    });

    it('returns a missing-email error without calling the edge function', async () => {
        const result = await sendTransactionalEmailNotification({
            type: 'STAFF_ACCOUNT_CREATED',
            email: ''
        });

        expect(result).toEqual({
            emailSent: false,
            emailError: 'Email address is missing.'
        });
        expect(invokeEdgeFunctionMock).not.toHaveBeenCalled();
    });

    it('normalizes the email and invokes send-email', async () => {
        const result = await sendTransactionalEmailNotification({
            type: 'STAFF_ACCOUNT_CREATED',
            email: ' TEST@Example.com ',
            name: 'Test User'
        }, 'Fallback send failure.');

        expect(invokeEdgeFunctionMock).toHaveBeenCalledWith('send-email', {
            body: {
                type: 'STAFF_ACCOUNT_CREATED',
                email: 'test@example.com',
                name: 'Test User'
            },
            fallbackMessage: 'Fallback send failure.'
        });
        expect(result).toEqual({
            emailSent: true,
            emailError: null
        });
    });

    it('returns the invoke error message when the edge function fails', async () => {
        invokeEdgeFunctionMock.mockRejectedValue(new Error('Send failed.'));

        const result = await sendTransactionalEmailNotification({
            type: 'SUPPORT_STATUS_UPDATE',
            email: 'student@example.com'
        });

        expect(result).toEqual({
            emailSent: false,
            emailError: 'Send failed.'
        });
    });
});
