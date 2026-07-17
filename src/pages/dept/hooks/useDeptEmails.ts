import { useState, useCallback } from 'react';
import { previewTransactionalEmailNotification } from '../../../lib/transactionalEmail';

export function useDeptEmails(showToastMessage: (msg: string, type?: string) => void) {
    const [isLoadingEmailPreview, setIsLoadingEmailPreview] = useState(false);
    const [isConfirmingEmailPreview, setIsConfirmingEmailPreview] = useState(false);
    const [emailPreviewState, setEmailPreviewState] = useState<any>(null);

    const closeEmailPreviewModal = useCallback(() => {
        setEmailPreviewState(null);
        setIsLoadingEmailPreview(false);
        setIsConfirmingEmailPreview(false);
    }, []);

    const previewAdmissionsEmails = useCallback(async (payloads: any[]) => {
        return Promise.all((Array.isArray(payloads) ? payloads : []).map(async (payload: any) => {
            const normalizedEmail = String(payload?.email || '').trim().toLowerCase();
            const recipientKey = String(payload?.referenceId || normalizedEmail || crypto.randomUUID());
            if (!normalizedEmail) {
                return {
                    recipientKey,
                    type: String(payload?.type || '').trim(),
                    email: '',
                    name: String(payload?.name || 'Applicant').trim() || 'Applicant',
                    subject: 'Email address missing',
                    html: '<p>No email address is available for this recipient, so no preview could be generated.</p>'
                };
            }

            const preview = await previewTransactionalEmailNotification(payload, 'Failed to preview applicant email.');
            return { ...preview, recipientKey };
        }));
    }, []);

    const openAdmissionsEmailPreview = useCallback(async ({
        title,
        confirmLabel,
        payloads,
        onConfirm
    }: {
        title: string;
        confirmLabel: string;
        payloads: any[];
        onConfirm: () => Promise<void>;
    }) => {
        setIsLoadingEmailPreview(true);
        try {
            const previews = await previewAdmissionsEmails(payloads);
            setEmailPreviewState({
                title,
                confirmLabel,
                previews,
                recipientCount: previews.length,
                onConfirm
            });
        } catch (error: any) {
            showToastMessage('Failed to load email preview.', 'error');
        } finally {
            setIsLoadingEmailPreview(false);
        }
    }, [previewAdmissionsEmails, showToastMessage]);

    const handleConfirmEmailPreview = useCallback(async () => {
        if (!emailPreviewState?.onConfirm || isConfirmingEmailPreview) return;

        setIsConfirmingEmailPreview(true);
        try {
            await emailPreviewState.onConfirm();
            closeEmailPreviewModal();
        } finally {
            setIsConfirmingEmailPreview(false);
        }
    }, [closeEmailPreviewModal, emailPreviewState, isConfirmingEmailPreview]);

    return {
        emailPreviewState,
        isLoadingEmailPreview,
        isConfirmingEmailPreview,
        openAdmissionsEmailPreview,
        handleConfirmEmailPreview,
        closeEmailPreviewModal
    };
}
