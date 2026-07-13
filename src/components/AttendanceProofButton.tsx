import { useState } from 'react';
import { openStoredAsset } from '../utils/storageAssets';

type AttendanceProofButtonProps = {
    storedReference?: string | null;
    attendanceId?: number | null;
    className?: string;
    onError?: (message: string) => void;
};

export const AttendanceProofButton = ({
    storedReference,
    attendanceId,
    className = 'text-blue-600 hover:underline disabled:opacity-50',
    onError
}: AttendanceProofButtonProps) => {
    const [isOpening, setIsOpening] = useState(false);
    if (!storedReference || !attendanceId) return null;

    return (
        <button
            type="button"
            disabled={isOpening}
            className={className}
            onClick={async () => {
                setIsOpening(true);
                try {
                    await openStoredAsset('attendance_proofs', storedReference, 300, {
                        category: 'attendance-proof',
                        attendanceId
                    });
                } catch {
                    onError?.('Unable to open the attendance proof.');
                } finally {
                    setIsOpening(false);
                }
            }}
        >
            {isOpening ? 'Opening…' : 'View proof'}
        </button>
    );
};
