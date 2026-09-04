import React from 'react';
import { CheckCircle2, FileArchive, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

export interface ExportProgressState {
    isExporting: boolean;
    stage: 'idle' | 'fetching' | 'building' | 'done';
    progressPct: number;
    loadedCount?: number;
    totalCount?: number;
    unitLabel?: string;
    statusText: string;
}

export const INITIAL_EXPORT_PROGRESS_STATE: ExportProgressState = {
    isExporting: false,
    stage: 'idle',
    progressPct: 0,
    loadedCount: 0,
    totalCount: 0,
    unitLabel: 'records retrieved',
    statusText: ''
};

export interface ExportBadgeDetail {
    label: string;
    tone?: 'slate' | 'emerald' | 'purple' | 'amber' | 'sky';
}

export interface ExportProgressModalProps {
    isOpen: boolean;
    format: 'pdf' | 'excel' | 'zip';
    exportProgress: ExportProgressState;
    title?: string;
    subtitle?: string;
    badgeDetails?: ExportBadgeDetail[];
    helperNote?: string;
}

const TONE_CLASSES: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/60',
    sky: 'bg-sky-50 text-sky-700 border-sky-200/60'
};

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
    isOpen,
    format,
    exportProgress,
    title,
    subtitle,
    badgeDetails,
    helperNote = 'Please wait while we prepare and assemble your download.'
}) => {
    if (!isOpen) return null;

    const formatUpper = format.toUpperCase();
    const isDone = exportProgress.stage === 'done';
    const isBuilding = exportProgress.stage === 'building';

    const getFormatBadge = () => {
        if (isDone) {
            return (
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-emerald-500/10">
                    <CheckCircle2 size={38} className="text-emerald-600" />
                </div>
            );
        }

        switch (format) {
            case 'excel':
                return (
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-emerald-500/10">
                        <FileSpreadsheet size={36} className="text-emerald-600 animate-pulse" />
                    </div>
                );
            case 'zip':
                return (
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg bg-amber-50 text-amber-600 border border-amber-200/80 shadow-amber-500/10">
                        <FileArchive size={36} className="text-amber-600 animate-pulse" />
                    </div>
                );
            case 'pdf':
            default:
                return (
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg bg-rose-50 text-rose-600 border border-rose-200/80 shadow-rose-500/10">
                        <FileText size={36} className="text-rose-500 animate-pulse" />
                    </div>
                );
        }
    };

    const counterText = exportProgress.totalCount && exportProgress.totalCount > 0
        ? `${(exportProgress.loadedCount ?? 0).toLocaleString()} of ${exportProgress.totalCount.toLocaleString()} ${exportProgress.unitLabel || 'items'}`
        : exportProgress.statusText || 'Processing records…';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-progress-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 id="export-progress-title" className="font-extrabold text-base text-slate-900">
                            {title || (isDone ? `${formatUpper} Export Complete` : `Exporting ${formatUpper} Package`)}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {subtitle || 'Generating file download and compiling records'}
                        </p>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                    {/* Animated Badge with ambient glow */}
                    <div className="relative">
                        {getFormatBadge()}
                        <div className="absolute -inset-1.5 rounded-3xl bg-purple-500/15 blur-sm -z-10 animate-pulse" />
                    </div>

                    {/* Headline and Dynamic Status */}
                    <div className="space-y-1.5 max-w-sm">
                        <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                            {isDone
                                ? `${formatUpper} Download Ready!`
                                : isBuilding
                                ? `Assembling ${formatUpper} Package…`
                                : `Generating ${formatUpper} Export…`}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            {exportProgress.statusText || 'Please wait while we process your request.'}
                        </p>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div className="w-full max-w-sm space-y-2">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                            <span className="flex items-center gap-1.5">
                                {!isDone && (
                                    <Loader2 size={12} className="animate-spin text-purple-600 shrink-0" />
                                )}
                                <span>{counterText}</span>
                            </span>
                            <span className="text-purple-700 font-black tabular-nums">{exportProgress.progressPct}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/70 shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-300 shadow-xs"
                                style={{ width: `${Math.max(5, Math.min(100, exportProgress.progressPct))}%` }}
                            />
                        </div>
                    </div>

                    {/* Optional Context Badges */}
                    {badgeDetails && badgeDetails.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-semibold">
                            {badgeDetails.map((b, i) => (
                                <span
                                    key={i}
                                    className={`px-3 py-1 rounded-xl font-bold border ${TONE_CLASSES[b.tone || 'slate']}`}
                                >
                                    {b.label}
                                </span>
                            ))}
                        </div>
                    )}

                    <p className="text-[11px] text-slate-400 font-medium">
                        {helperNote}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExportProgressModal;
