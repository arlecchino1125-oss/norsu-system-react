import React from 'react';
import { Info } from 'lucide-react';
import Modal from '../../ui/Modal';

export interface InfoModalProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  onClose: () => void;
  actionLabel?: string;
}

export default function InfoModal({
  open,
  title,
  description,
  onClose,
  actionLabel = 'Close'
}: InfoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white transition-colors hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      }
    >
      <div className="flex flex-col items-center text-center -mt-2">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Info size={26} />
        </div>
        <div className="text-sm leading-relaxed text-slate-600">{description}</div>
      </div>
    </Modal>
  );
}
