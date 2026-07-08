import { XCircle } from 'lucide-react';

export function DeptEmailPreviewModal({
    emailPreviewState,
    isConfirmingEmailPreview,
    closeEmailPreviewModal,
    handleConfirmEmailPreview
}: {
    emailPreviewState: any;
    isConfirmingEmailPreview: boolean;
    closeEmailPreviewModal: () => void;
    handleConfirmEmailPreview: () => Promise<void> | void;
}) {
    if (!emailPreviewState) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-transparent p-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{emailPreviewState.title || 'Email Preview'}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Read-only preview of recipients and email content before sending.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={closeEmailPreviewModal}
                        disabled={isConfirmingEmailPreview}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <XCircle size={22} />
                    </button>
                </div>

                <div className="border-b border-gray-100 px-6 py-3 text-sm text-gray-600">
                    {emailPreviewState.recipientCount || 0} recipient{emailPreviewState.recipientCount === 1 ? '' : 's'}
                </div>

                <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
                    {(emailPreviewState.previews || []).map((preview: any, index: number) => (
                        <div key={`${preview.email || 'missing-email'}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900">{preview.name || 'Applicant'}</p>
                                    <p className="text-xs text-gray-500">{preview.email || 'No email address available'}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${preview.email ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {preview.email ? 'Ready to Send' : 'Missing Email'}
                                </span>
                            </div>

                            <div className="mt-4">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Subject</p>
                                <div className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                    {preview.subject || 'No subject available'}
                                </div>
                            </div>

                            <div className="mt-4">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Email Content</p>
                                <iframe
                                    title={`Email preview ${index + 1}`}
                                    sandbox=""
                                    srcDoc={preview.html || '<p>No preview available.</p>'}
                                    className="mt-1 h-72 w-full rounded-lg border border-gray-200 bg-white"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 md:flex-row md:justify-end">
                    <button
                        type="button"
                        onClick={closeEmailPreviewModal}
                        disabled={isConfirmingEmailPreview}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleConfirmEmailPreview()}
                        disabled={isConfirmingEmailPreview}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {isConfirmingEmailPreview
                            ? 'Sending...'
                            : (emailPreviewState.confirmLabel || 'Confirm and Send')}
                    </button>
                </div>
            </div>
        </div>
    );
}
