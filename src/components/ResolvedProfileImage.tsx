import type { ImgHTMLAttributes } from 'react';
import { useResolvedDocumentUrl } from '../hooks/useResolvedDocumentUrl';
import { getValidProfileImageUrl } from '../utils/formatters';

type ResolvedProfileImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    storedValue: string;
    studentId: string;
};

export const ResolvedProfileImage = ({ storedValue, studentId, ...imageProps }: ResolvedProfileImageProps) => {
    const { url } = useResolvedDocumentUrl('profile-pictures', storedValue, {
        category: 'profile-photo',
        studentId
    });
    if (!url) return null;
    return <img {...imageProps} src={getValidProfileImageUrl(url)} />;
};
