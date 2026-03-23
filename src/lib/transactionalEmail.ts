import { invokeEdgeFunction } from './invokeEdgeFunction';

const normalizeEmail = (value: unknown) => {
    const email = String(value ?? '').trim().toLowerCase();
    return email || null;
};

export type TransactionalEmailPayload = Record<string, unknown> | null | undefined;

export type TransactionalEmailResult = {
    emailSent: boolean;
    emailError: string | null;
};

export type TransactionalEmailPreview = {
    type: string;
    email: string;
    name: string;
    subject: string;
    html: string;
};

export const sendTransactionalEmailNotification = async (
    payload: TransactionalEmailPayload,
    fallbackMessage = 'Failed to send email.'
): Promise<TransactionalEmailResult> => {
    const email = normalizeEmail(payload?.email);
    if (!payload || !email) {
        return {
            emailSent: false,
            emailError: 'Email address is missing.'
        };
    }

    try {
        await invokeEdgeFunction('send-email', {
            body: {
                ...payload,
                email
            },
            fallbackMessage
        });

        return {
            emailSent: true,
            emailError: null
        };
    } catch (error: any) {
        return {
            emailSent: false,
            emailError: error?.message || fallbackMessage
        };
    }
};

export const previewTransactionalEmailNotification = async (
    payload: TransactionalEmailPayload,
    fallbackMessage = 'Failed to preview email.'
): Promise<TransactionalEmailPreview> => {
    const email = normalizeEmail(payload?.email);
    if (!payload || !email) {
        throw new Error('Email address is missing.');
    }

    const result = await invokeEdgeFunction<{ preview?: TransactionalEmailPreview }>('send-email', {
        body: {
            ...payload,
            email,
            preview: true
        },
        fallbackMessage
    });

    if (!result?.preview) {
        throw new Error(fallbackMessage);
    }

    return result.preview;
};
