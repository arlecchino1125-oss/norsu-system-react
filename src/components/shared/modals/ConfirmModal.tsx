import React from 'react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import Modal from '../../ui/Modal';

type ConfirmModalTone = 'danger' | 'primary' | 'neutral';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmModalTone;
  icon?: React.ReactNode;
  note?: React.ReactNode;
  isProcessing?: boolean;
  confirmDisabled?: boolean;
  maxWidthClassName?: string;
  zIndexClassName?: string;
}

const toneStyles: Record<ConfirmModalTone, {
  iconWrap: string;
  icon: string;
  confirm: string;
}> = {
  danger: {
    iconWrap: 'bg-red-100',
    icon: 'text-red-600',
    confirm: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200'
  },
  primary: {
    iconWrap: 'bg-blue-100',
    icon: 'text-blue-600',
    confirm: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
  },
  neutral: {
    iconWrap: 'bg-slate-100',
    icon: 'text-slate-600',
    confirm: 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
  }
};

const defaultIcons: Record<ConfirmModalTone, React.ReactNode> = {
  danger: <AlertTriangle size={30} />,
  primary: <Info size={30} />,
  neutral: <Info size={30} />
};

export default function ConfirmModal({
  open,
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  icon,
  note,
  isProcessing = false,
  confirmDisabled = false,
  maxWidthClassName = 'max-w-md',
  zIndexClassName = 'z-[100]'
}: ConfirmModalProps) {
  const style = toneStyles[tone];

  const sizeClass = maxWidthClassName.includes('max-w-sm') ? 'sm' as const : 'md' as const;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size={sizeClass}
      showCloseButton={false}
      zIndex={zIndexClassName}
      className="text-center"
      footer={
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-700 transition-colors hover:bg-slate-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || isProcessing}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${style.confirm}`}
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{isProcessing ? 'Please wait...' : confirmLabel}</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center -mt-2">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${style.iconWrap} ${style.icon}`}>
          {icon || defaultIcons[tone]}
        </div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
        <div className="mb-2 text-sm leading-relaxed text-slate-500">{description}</div>
        {note && (
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs leading-relaxed text-slate-600">
            {note}
          </div>
        )}
      </div>
    </Modal>
  );
}
