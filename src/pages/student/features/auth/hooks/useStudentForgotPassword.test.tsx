import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeEdgeFunctionMock } = vi.hoisted(() => ({
    invokeEdgeFunctionMock: vi.fn()
}));

vi.mock('../../../../../lib/invokeEdgeFunction', () => ({
    invokeEdgeFunction: invokeEdgeFunctionMock
}));

import { useStudentForgotPassword } from './useStudentForgotPassword';

const renderForgotPassword = () => {
    const showToast = vi.fn();
    const onPasswordResetConfirmed = vi.fn();
    const rendered = renderHook(() => useStudentForgotPassword({ showToast, onPasswordResetConfirmed }));
    return { ...rendered, showToast, onPasswordResetConfirmed };
};

const sentMode = (callIndex = 0) => invokeEdgeFunctionMock.mock.calls[callIndex]?.[1]?.body?.mode;

const requestResetFor = async (rendered: ReturnType<typeof renderForgotPassword>, identifier: string) => {
    act(() => rendered.result.current.openForgotPasswordModal('studentId', identifier));
    await act(async () => {
        await rendered.result.current.handleRequestForgotPasswordSend();
    });
};

describe('useStudentForgotPassword delivery mode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        invokeEdgeFunctionMock.mockResolvedValue({ success: true, message: 'sent', expiresInMinutes: 60 });
    });

    it('defaults to sending a reset link', async () => {
        const rendered = renderForgotPassword();
        await requestResetFor(rendered, '2024-001');

        expect(rendered.result.current.isForgotPasswordLinkDelivery).toBe(true);
        expect(sentMode()).toBe('request-forgot-password-link');
    });

    it('sends an OTP when the student picks the code option', async () => {
        const rendered = renderForgotPassword();
        act(() => rendered.result.current.openForgotPasswordModal('studentId', '2024-001'));
        act(() => rendered.result.current.selectForgotPasswordDelivery('code'));

        await act(async () => {
            await rendered.result.current.handleRequestForgotPasswordSend();
        });

        expect(sentMode()).toBe('request-forgot-password-otp');
    });

    it('does not hand back a free send when the delivery mode is toggled', async () => {
        const rendered = renderForgotPassword();
        await requestResetFor(rendered, '2024-001');
        expect(invokeEdgeFunctionMock).toHaveBeenCalledTimes(1);

        act(() => rendered.result.current.selectForgotPasswordDelivery('code'));
        expect(rendered.result.current.isForgotPasswordResendCoolingDown).toBe(true);

        await act(async () => {
            await rendered.result.current.handleRequestForgotPasswordSend();
        });
        expect(invokeEdgeFunctionMock).toHaveBeenCalledTimes(1);
    });
});

describe('useStudentForgotPassword resend cooldown', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        invokeEdgeFunctionMock.mockResolvedValue({ success: true, message: 'sent', expiresInMinutes: 60 });
    });

    it('starts a 5 minute cooldown after a reset is sent', async () => {
        const rendered = renderForgotPassword();
        await requestResetFor(rendered, '2024-001');

        expect(rendered.result.current.isForgotPasswordResendCoolingDown).toBe(true);
        expect(rendered.result.current.forgotPasswordResendCountdown).toBe('5:00');
    });

    it('keeps the cooldown after a remount so a refresh cannot buy another send', async () => {
        const first = renderForgotPassword();
        await requestResetFor(first, '2024-001');
        expect(first.result.current.isForgotPasswordResendCoolingDown).toBe(true);
        first.unmount();

        const second = renderForgotPassword();
        act(() => second.result.current.openForgotPasswordModal('studentId', '2024-001'));

        expect(second.result.current.isForgotPasswordResendCoolingDown).toBe(true);

        await act(async () => {
            await second.result.current.handleRequestForgotPasswordSend();
        });
        expect(invokeEdgeFunctionMock).toHaveBeenCalledTimes(1);
    });

    it('scopes the cooldown to one identifier', async () => {
        const rendered = renderForgotPassword();
        await requestResetFor(rendered, '2024-001');

        act(() => rendered.result.current.openForgotPasswordModal('studentId', '2024-002'));
        expect(rendered.result.current.isForgotPasswordResendCoolingDown).toBe(false);
    });

    it('surfaces the rate limit message and holds the button after a 429', async () => {
        const rateLimited = Object.assign(
            new Error('You have requested too many password resets. Please wait 15 minutes before trying again.'),
            { status: 429 }
        );
        invokeEdgeFunctionMock.mockRejectedValue(rateLimited);

        const rendered = renderForgotPassword();
        await requestResetFor(rendered, '2024-001');

        expect(rendered.showToast).toHaveBeenCalledWith(
            'You have requested too many password resets. Please wait 15 minutes before trying again.',
            'error'
        );
        expect(rendered.result.current.isForgotPasswordResendCoolingDown).toBe(true);
        expect(rendered.result.current.isRequestingForgotPasswordOtp).toBe(false);
    });

    it('keeps a generic message for non rate limit failures', async () => {
        invokeEdgeFunctionMock.mockRejectedValue(new Error('boom'));

        const rendered = renderForgotPassword();
        await requestResetFor(rendered, '2024-001');

        expect(rendered.showToast).toHaveBeenCalledWith(
            'We could not send the reset link at this time. Please try again later.',
            'error'
        );
    });
});
