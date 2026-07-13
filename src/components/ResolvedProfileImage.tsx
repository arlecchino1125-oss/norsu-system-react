import type { ImgHTMLAttributes } from 'react';
import { useResolvedDocumentUrl } from '../hooks/useResolvedDocumentUrl';
import { getValidProfileImageUrl } from '../utils/formatters';
import { openStoredAsset } from '../utils/storageAssets';

type ResolvedProfileImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    storedValue: string;
    studentId: string;
    previewOnClick?: boolean;
};

export const ResolvedProfileImage = ({ storedValue, studentId, previewOnClick = true, className = '', onClick, onKeyDown, ...imageProps }: ResolvedProfileImageProps) => {
    const { url } = useResolvedDocumentUrl('profile-pictures', storedValue, {
        category: 'profile-photo',
        studentId
    });
    if (!url) return null;

    const openPreview = () => {
        void openStoredAsset('profile-pictures', storedValue, 300, {
            category: 'profile-photo',
            studentId
        }).catch(() => undefined);
    };

    return (
        <img
            {...imageProps}
            src={getValidProfileImageUrl(url)}
            role={previewOnClick ? 'button' : imageProps.role}
            tabIndex={previewOnClick ? (imageProps.tabIndex ?? 0) : imageProps.tabIndex}
            className={`${className}${previewOnClick ? ' cursor-zoom-in' : ''}`}
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
    );
};
