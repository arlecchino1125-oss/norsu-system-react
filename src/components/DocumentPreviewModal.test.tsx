import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { heicTo } from 'heic-to/csp';
import DocumentPreviewModal from './DocumentPreviewModal';
import { DOCUMENT_PREVIEW_EVENT, type DocumentPreviewRequest } from '../utils/storageAssets';

vi.mock('heic-to/csp', () => ({ heicTo: vi.fn() }));

const openPreview = (detail: DocumentPreviewRequest) => {
    act(() => {
        window.dispatchEvent(new CustomEvent<DocumentPreviewRequest>(DOCUMENT_PREVIEW_EVENT, { detail }));
    });
};

describe('DocumentPreviewModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn());
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: vi.fn(() => 'blob:converted-preview')
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            value: vi.fn()
        });
    });

    it('shows an ordinary image in the portal without a download control', () => {
        render(<DocumentPreviewModal />);

        openPreview({
            url: 'https://r2.example/photo.jpg?signature=test',
            storedValue: 'r2:students/1/profile/photo/photo.jpg',
            label: 'photo.jpg'
        });

        expect(screen.getByRole('dialog', { name: 'photo.jpg' })).toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: 'photo.jpg' }).parentElement).toHaveClass('z-[10020]');
        const image = screen.getByRole('img', { name: 'photo.jpg' });
        expect(image).toHaveAttribute('src', 'https://r2.example/photo.jpg?signature=test');
        expect(screen.getByRole('status', { name: 'Loading file preview' })).toBeInTheDocument();

        fireEvent.load(image);

        expect(screen.queryByRole('status', { name: 'Loading file preview' })).not.toBeInTheDocument();
        expect(screen.queryByText(/download/i)).not.toBeInTheDocument();
    });

    it('converts HEIC to an object URL and revokes it when closed', async () => {
        const original = new Blob(['original'], { type: 'image/heic' });
        const converted = new Blob(['preview'], { type: 'image/jpeg' });
        vi.mocked(fetch).mockResolvedValue(new Response(original));
        vi.mocked(heicTo).mockResolvedValue(converted);
        render(<DocumentPreviewModal />);

        openPreview({
            url: 'https://r2.example/document.heic?signature=test',
            storedValue: 'r2:students/769/profile/claims/pwd/drive-document.heic',
            label: 'drive-document.heic'
        });

        expect(await screen.findByRole('img', { name: 'drive-document.heic' })).toHaveAttribute('src', 'blob:converted-preview');
        expect(heicTo).toHaveBeenCalledWith({ blob: original, type: 'image/jpeg', quality: 0.9 });

        fireEvent.click(screen.getByRole('button'));
        await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:converted-preview'));
    });

    it('shows PDFs in an iframe inside the modal', () => {
        render(<DocumentPreviewModal />);

        openPreview({
            url: 'https://r2.example/document.pdf?signature=test',
            storedValue: 'r2:students/1/profile/claims/pwd/document.pdf',
            label: 'document.pdf'
        });

        const frame = screen.getByTitle('document.pdf');
        expect(frame).toHaveAttribute('src', 'https://r2.example/document.pdf?signature=test');
        expect(screen.getByRole('status', { name: 'Loading file preview' })).toBeInTheDocument();

        fireEvent.load(frame);

        expect(screen.queryByRole('status', { name: 'Loading file preview' })).not.toBeInTheDocument();
        expect(screen.queryByText(/download/i)).not.toBeInTheDocument();
    });

    it('shows a useful error when HEIC conversion fails', async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(new Blob(['original'], { type: 'image/heic' })));
        vi.mocked(heicTo).mockRejectedValue(new Error('decoder failed'));
        render(<DocumentPreviewModal />);

        openPreview({
            url: 'https://r2.example/document.heic?signature=test',
            storedValue: 'r2:students/769/profile/claims/pwd/drive-document.heic',
            label: 'drive-document.heic'
        });

        expect(await screen.findByText('This image could not be prepared for preview.')).toBeInTheDocument();
    });
});
