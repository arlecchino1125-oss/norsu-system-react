import React from 'react';
import { Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export interface DeleteConfirmModalProps {
  open: boolean;
  title?: string;
  itemLabel?: string;
  description?: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
}

export default function DeleteConfirmModal({
  open,
  title = 'Delete item?',
  itemLabel,
  description,
  onClose,
  onConfirm,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isProcessing = false
}: DeleteConfirmModalProps) {
  const fallbackDescription = itemLabel
    ? `Are you sure you want to delete ${itemLabel}? This action cannot be undone.`
    : 'Are you sure you want to continue? This action cannot be undone.';

  return (
    <ConfirmModal
      open={open}
      title={title}
      description={description || fallbackDescription}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tone="danger"
      icon={<Trash2 size={30} />}
      isProcessing={isProcessing}
      maxWidthClassName="max-w-sm"
    />
  );
}
