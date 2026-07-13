import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResolvedDocumentUrl } from '../hooks/useResolvedDocumentUrl';
import { openStoredAsset } from '../utils/storageAssets';
import { ResolvedProfileImage } from './ResolvedProfileImage';

vi.mock('../hooks/useResolvedDocumentUrl', () => ({ useResolvedDocumentUrl: vi.fn() }));
vi.mock('../utils/storageAssets', () => ({ openStoredAsset: vi.fn() }));

describe('ResolvedProfileImage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useResolvedDocumentUrl).mockReturnValue({
            url: 'https://r2.example/profile.jpg',
            isLoading: false,
            error: null
        });
        vi.mocked(openStoredAsset).mockResolvedValue('https://r2.example/profile.jpg');
    });

    it('opens the authorized profile-photo preview by click and keyboard', () => {
        render(<ResolvedProfileImage storedValue="r2:students/1/profile/photo/profile.jpg" studentId="430130903" alt="Student profile" />);
        const image = screen.getByRole('button', { name: 'Student profile' });

        fireEvent.click(image);
        fireEvent.keyDown(image, { key: 'Enter' });

        expect(openStoredAsset).toHaveBeenCalledTimes(2);
        expect(openStoredAsset).toHaveBeenCalledWith(
            'profile-pictures',
            'r2:students/1/profile/photo/profile.jpg',
            300,
            { category: 'profile-photo', studentId: '430130903' }
        );
    });

    it('shows a loading state until the private image finishes rendering', () => {
        vi.mocked(useResolvedDocumentUrl).mockReturnValueOnce({
            url: null,
            isLoading: true,
            error: null
        });
        const { rerender } = render(
            <ResolvedProfileImage
                storedValue="r2:students/1/profile/photo/profile.jpg"
                studentId="430130903"
                alt="Student profile"
                className="h-12 w-12 rounded-lg object-cover"
            />
        );

        expect(screen.getByRole('status', { name: 'Loading Student profile' })).toBeInTheDocument();

        vi.mocked(useResolvedDocumentUrl).mockReturnValue({
            url: 'https://r2.example/profile.jpg',
            isLoading: false,
            error: null
        });
        rerender(
            <ResolvedProfileImage
                storedValue="r2:students/1/profile/photo/profile.jpg"
                studentId="430130903"
                alt="Student profile"
                className="h-12 w-12 rounded-lg object-cover"
            />
        );

        const image = screen.getByRole('button', { name: 'Student profile' });
        expect(screen.getByRole('status', { name: 'Loading Student profile' })).toBeInTheDocument();

        fireEvent.load(image);

        expect(screen.queryByRole('status', { name: 'Loading Student profile' })).not.toBeInTheDocument();
    });

    it('leaves preview handling to an existing profile-photo modal', () => {
        const openExistingModal = vi.fn();
        render(
            <button type="button" onClick={openExistingModal}>
                <ResolvedProfileImage
                    storedValue="r2:students/1/profile/photo/profile.jpg"
                    studentId="430130903"
                    alt="Student profile"
                    previewOnClick={false}
                />
            </button>
        );

        fireEvent.click(screen.getByAltText('Student profile'));

        expect(openExistingModal).toHaveBeenCalledOnce();
        expect(openStoredAsset).not.toHaveBeenCalled();
    });
});
