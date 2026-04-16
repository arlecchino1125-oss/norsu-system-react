import React from 'react';
import { Info } from 'lucide-react';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Info size={26} />
        </div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
        <div className="mb-6 text-sm leading-relaxed text-slate-600">{description}</div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white transition-colors hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
