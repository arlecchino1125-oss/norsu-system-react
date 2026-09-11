import React from 'react';
import { AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';

interface AudienceConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    targetAudienceLabel: string;
    eventTitle: string;
    isConfirming?: boolean;
}

export default function AudienceConfirmModal({
    open,
    onClose,
    onConfirm,
    targetAudienceLabel,
    eventTitle,
    isConfirming = false
}: AudienceConfirmModalProps) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Confirm Event Attendance"
            size="sm"
            footer={
                <div className="flex w-full items-center justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onClose} disabled={isConfirming}>
                        Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={onConfirm} disabled={isConfirming}>
                        {isConfirming ? 'Processing…' : 'Yes, Time In'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900">
                    <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                    <div className="text-xs leading-relaxed">
                        <p className="font-bold">Target Audience Notice</p>
                        <p className="mt-1 text-amber-800">
                            <strong>{eventTitle}</strong> is primarily designated for{' '}
                            <span className="font-semibold underline">{targetAudienceLabel}</span>.
                        </p>
                        <p className="mt-2 text-amber-900 font-medium">
                            Are you sure you want to attend and record your time-in for this event?
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
