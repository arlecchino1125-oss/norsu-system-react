import { useEffect, useMemo, useState } from 'react';
import Modal from './ui/Modal';
import {
    DOCUMENT_PREVIEW_EVENT,
    type DocumentPreviewRequest
} from '../utils/storageAssets';

const DIRECT_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'ico']);
const CONVERTED_IMAGE_EXTENSIONS = new Set(['heic', 'heif']);

const getExtension = (request: DocumentPreviewRequest) => {
    const candidates = [request.storedValue, request.url];
    for (const candidate of candidates) {
        const withoutQuery = String(candidate || '').split(/[?#]/)[0];
        const match = withoutQuery.match(/\.([a-z0-9]+)$/i);
        if (match) return match[1].toLowerCase();
    }
    return '';
};

export default function DocumentPreviewModal() {
    const [request, setRequest] = useState<DocumentPreviewRequest | null>(null);
    const [convertedUrl, setConvertedUrl] = useState('');
    const [isPreparing, setIsPreparing] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [error, setError] = useState('');
    const extension = useMemo(() => request ? getExtension(request) : '', [request]);

    useEffect(() => {
        const handlePreview = (event: Event) => {
            const detail = (event as CustomEvent<DocumentPreviewRequest>).detail;
            if (!detail?.url) return;
            setRequest(detail);
            setConvertedUrl('');
            setError('');
            const nextExtension = getExtension(detail);
            setIsPreparing(CONVERTED_IMAGE_EXTENSIONS.has(nextExtension));
            setIsContentLoading(
                DIRECT_IMAGE_EXTENSIONS.has(nextExtension)
                || CONVERTED_IMAGE_EXTENSIONS.has(nextExtension)
                || nextExtension === 'pdf'
            );
        };
        window.addEventListener(DOCUMENT_PREVIEW_EVENT, handlePreview);
        return () => window.removeEventListener(DOCUMENT_PREVIEW_EVENT, handlePreview);
    }, []);

    useEffect(() => {
        if (!request || !CONVERTED_IMAGE_EXTENSIONS.has(extension)) return;

        let cancelled = false;
        let objectUrl = '';
        const preparePreview = async () => {
            try {
                const response = await fetch(request.url);
                if (!response.ok) throw new Error('Unable to retrieve the image.');
                const original = await response.blob();
                const { heicTo } = await import('heic-to/csp');
                const converted = await heicTo({ blob: original, type: 'image/jpeg', quality: 0.9 });
                if (!converted) throw new Error('The image contained no previewable frame.');
                objectUrl = URL.createObjectURL(converted);
                if (cancelled) {
                    URL.revokeObjectURL(objectUrl);
                    return;
                }
                setConvertedUrl(objectUrl);
            } catch {
                if (!cancelled) {
                    setError('This image could not be prepared for preview.');
                    setIsContentLoading(false);
                }
            } finally {
                if (!cancelled) setIsPreparing(false);
            }
        };
        void preparePreview();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [extension, request]);

    const close = () => setRequest(null);
    const isDirectImage = DIRECT_IMAGE_EXTENSIONS.has(extension);
    const isConvertedImage = CONVERTED_IMAGE_EXTENSIONS.has(extension);
    const isPdf = extension === 'pdf';
    const finishLoading = () => setIsContentLoading(false);
    const failLoading = () => {
        setIsContentLoading(false);
        setError('This file could not be loaded for preview.');
    };

    return (
        <Modal
            open={Boolean(request)}
            onClose={close}
            title={request?.label || 'File preview'}
            size="full"
            className="max-h-[92vh]"
            zIndex="z-[10020]"
        >
            <div className="relative flex min-h-[45vh] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {(isPreparing || isContentLoading) && (
                    <div role="status" aria-label="Loading file preview" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100/90 px-6 text-center text-sm font-semibold text-slate-600">
                        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                        {isPreparing ? 'Preparing image preview…' : 'Loading file preview…'}
                    </div>
                )}
                {!isPreparing && !isContentLoading && error && (
                    <p role="alert" className="px-6 text-center text-sm font-semibold text-rose-700">{error}</p>
                )}
                {!isPreparing && !error && request && isDirectImage && (
                    <img src={request.url} alt={request.label} onLoad={finishLoading} onError={failLoading} className={`max-h-[60vh] max-w-full object-contain ${isContentLoading ? 'opacity-0' : 'opacity-100'}`} referrerPolicy="no-referrer" />
                )}
                {!isPreparing && !error && request && isConvertedImage && convertedUrl && (
                    <img src={convertedUrl} alt={request.label} onLoad={finishLoading} onError={failLoading} className={`max-h-[60vh] max-w-full object-contain ${isContentLoading ? 'opacity-0' : 'opacity-100'}`} />
                )}
                {!isPreparing && !error && request && isPdf && (
                    <iframe src={request.url} title={request.label} onLoad={finishLoading} onError={failLoading} className={`h-[60vh] w-full border-0 bg-white ${isContentLoading ? 'opacity-0' : 'opacity-100'}`} />
                )}
                {!isPreparing && !error && request && !isDirectImage && !isConvertedImage && !isPdf && (
                    <p role="alert" className="px-6 text-center text-sm font-semibold text-slate-700">This file type cannot be previewed in the portal.</p>
                )}
            </div>
        </Modal>
    );
}
