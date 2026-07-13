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
});
