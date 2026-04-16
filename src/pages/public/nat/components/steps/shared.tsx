import React from 'react';

export type ResolveNatInputClassName = (baseClassName: string, fieldName: string) => string;

export const NAT_BLUE_INPUT_CLASS = 'w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white placeholder:text-gray-400 dark:bg-slate-900/80 dark:border-slate-700/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20';
export const NAT_ORANGE_INPUT_CLASS = 'w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all hover:bg-white placeholder:text-gray-400 dark:bg-slate-900/80 dark:border-slate-700/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:placeholder:text-slate-500 dark:focus:border-amber-400 dark:focus:ring-amber-400/20';
export const NAT_ORANGE_SELECT_CLASS = 'w-full px-4 py-3 bg-orange-50/50 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all hover:bg-white font-medium text-gray-900 dark:bg-slate-900/80 dark:border-amber-500/30 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus:border-amber-400 dark:focus:ring-amber-400/20';
export const NAT_TEAL_INPUT_CLASS = 'w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white placeholder:text-gray-400 dark:bg-slate-900/80 dark:border-slate-700/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/20';

export function FieldErrorText({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold text-red-600 dark:text-rose-300">
      <span className="mt-0.5">!</span>
      <span>{message}</span>
    </p>
  );
}
