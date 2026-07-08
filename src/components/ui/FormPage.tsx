import React from 'react';

interface FormPageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function FormPage({
  title,
  description,
  children,
  footer,
  className = '',
}: FormPageProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
      </div>

      {/* Footer */}
      {footer && (
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  );
}
