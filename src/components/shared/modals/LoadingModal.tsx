import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingModalProps {
  open: boolean;
  title?: string;
  description?: string;
}

export default function LoadingModal({
  open,
  title = 'Please wait',
  description = 'We are finishing your request.'
}: LoadingModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Loader2 size={30} className="animate-spin" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  );
}
