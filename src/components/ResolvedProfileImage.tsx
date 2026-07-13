import { useState, type ImgHTMLAttributes } from 'react';
import { useResolvedDocumentUrl } from '../hooks/useResolvedDocumentUrl';
import { getValidProfileImageUrl } from '../utils/formatters';
import { openStoredAsset } from '../utils/storageAssets';

type ResolvedProfileImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    storedValue: string;
    studentId: string;
    previewOnClick?: boolean;
};

export const ResolvedProfileImage = ({ storedValue, studentId, previewOnClick = true, className = '', onClick, onKeyDown, onLoad, onError, ...imageProps }: ResolvedProfileImageProps) => {
    const { url, isLoading, error } = useResolvedDocumentUrl('profile-pictures', storedValue, {
        category: 'profile-photo',
        studentId
    });
    const [loadedUrl, setLoadedUrl] = useState('');
    if (error || (!isLoading && !url)) return null;

    const isImageLoading = isLoading || !url || loadedUrl !== url;
    const loadingLabel = `Loading ${imageProps.alt || 'profile photo'}`;

    const openPreview = () => {
        void openStoredAsset('profile-pictures', storedValue, 300, {
            category: 'profile-photo',
            studentId
        }).catch(() => undefined);
    };

    return (
        <span className={`relative inline-flex overflow-hidden bg-slate-100 ${className}`}>
            {isImageLoading && (
                <span role="status" aria-label={loadingLabel} className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90">
                    <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                </span>
            )}
            {url && (
                <img
                    {...imageProps}
                    src={getValidProfileImageUrl(url)}
                    role={previewOnClick ? 'button' : imageProps.role}
                    tabIndex={previewOnClick ? (imageProps.tabIndex ?? 0) : imageProps.tabIndex}
                    className={`h-full w-full object-cover${previewOnClick ? ' cursor-zoom-in' : ''}`}
                    onLoad={(event) => {
                        setLoadedUrl(url);
                        onLoad?.(event);
                    }}
                    onError={(event) => {
                        setLoadedUrl(url);
                        onError?.(event);
                    }}
                    onClick={(event) => {
                        onClick?.(event);
                        if (previewOnClick && !event.defaultPrevented) openPreview();
                    }}
                    onKeyDown={(event) => {
                        onKeyDown?.(event);
                        if (previewOnClick && !event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            openPreview();
                        }
                    }}
                />
            )}
        </span>
    );
};
