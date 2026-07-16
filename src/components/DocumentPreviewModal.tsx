import { useEffect, useMemo, useReducer } from 'react';
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

type PreviewState = {
    request: DocumentPreviewRequest | null;
    convertedUrl: string;
    isPreparing: boolean;
    isContentLoading: boolean;
    error: string;
};

const INITIAL_PREVIEW_STATE: PreviewState = {
    request: null,
    convertedUrl: '',
    isPreparing: false,
    isContentLoading: false,
    error: ''
};

type PreviewAction =
    | { type: 'requested'; request: DocumentPreviewRequest; isPreparing: boolean; isContentLoading: boolean }
    | { type: 'converted'; url: string }
    | { type: 'conversionFailed'; message: string }
    | { type: 'preparingDone' }
    | { type: 'contentLoaded' }
    | { type: 'contentFailed'; message: string }
    | { type: 'closed' };

function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
    switch (action.type) {
        case 'requested':
            return {
                ...INITIAL_PREVIEW_STATE,
                request: action.request,
                isPreparing: action.isPreparing,
                isContentLoading: action.isContentLoading
            };
        case 'converted':
            return { ...state, convertedUrl: action.url };
        case 'conversionFailed':
            return { ...state, error: action.message, isContentLoading: false };
        case 'preparingDone':
            return { ...state, isPreparing: false };
        case 'contentLoaded':
            return { ...state, isContentLoading: false };
        case 'contentFailed':
            return { ...state, isContentLoading: false, error: action.message };
        case 'closed':
            return { ...state, request: null };
        default:
            return state;
    }
}

export default function DocumentPreviewModal() {
    const [{ request, convertedUrl, isPreparing, isContentLoading, error }, dispatch] = useReducer(previewReducer, INITIAL_PREVIEW_STATE);
    const extension = useMemo(() => request ? getExtension(request) : '', [request]);

    useEffect(() => {
        const handlePreview = (event: Event) => {
            const detail = (event as CustomEvent<DocumentPreviewRequest>).detail;
            if (!detail?.url) return;
            const nextExtension = getExtension(detail);
            dispatch({
                type: 'requested',
                request: detail,
                isPreparing: CONVERTED_IMAGE_EXTENSIONS.has(nextExtension),
                isContentLoading: DIRECT_IMAGE_EXTENSIONS.has(nextExtension)
                    || CONVERTED_IMAGE_EXTENSIONS.has(nextExtension)
                    || nextExtension === 'pdf'
            });
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
                dispatch({ type: 'converted', url: objectUrl });
            } catch {
                if (!cancelled) {
                    dispatch({ type: 'conversionFailed', message: 'This image could not be prepared for preview.' });
                }
            } finally {
                if (!cancelled) dispatch({ type: 'preparingDone' });
            }
        };
        void preparePreview();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [extension, request]);

    const close = () => dispatch({ type: 'closed' });
    const isDirectImage = DIRECT_IMAGE_EXTENSIONS.has(extension);
    const isConvertedImage = CONVERTED_IMAGE_EXTENSIONS.has(extension);
    const isPdf = extension === 'pdf';
    const finishLoading = () => dispatch({ type: 'contentLoaded' });
    const failLoading = () => dispatch({ type: 'contentFailed', message: 'This file could not be loaded for preview.' });

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
