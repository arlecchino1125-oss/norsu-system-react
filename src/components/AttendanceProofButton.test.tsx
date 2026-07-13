import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { openStoredAsset } from '../utils/storageAssets';
import { AttendanceProofButton } from './AttendanceProofButton';

vi.mock('../utils/storageAssets', () => ({
    openStoredAsset: vi.fn()
}));

describe('AttendanceProofButton', () => {
    it('opens the stored proof using its attendance row ID', async () => {
        vi.mocked(openStoredAsset).mockResolvedValue('https://signed.example/proof');

        render(<AttendanceProofButton storedReference="r2:students/245/events/52/attendance/file.jpg" attendanceId={701} />);
        fireEvent.click(screen.getByRole('button', { name: 'View proof' }));

        await waitFor(() => expect(openStoredAsset).toHaveBeenCalledWith(
            'attendance_proofs',
            'r2:students/245/events/52/attendance/file.jpg',
            300,
            { category: 'attendance-proof', attendanceId: 701 }
        ));
    });
});
