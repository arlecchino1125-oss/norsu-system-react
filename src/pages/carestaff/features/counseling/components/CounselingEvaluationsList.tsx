import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
    ChevronDown,
    ClipboardList,
    Download,
    Eye,
    FileQuestion,
    FileSpreadsheet,
    FileText,
    Link2,
    Loader2,
    RefreshCw,
    Search,
    Settings2,
    Users
} from 'lucide-react';

import { formatDateTime } from '../../../../../utils/formatters';
import { Button } from '../../../../../components/ui/Button';
import CounselingResponseDetailModal from './CounselingResponseDetailModal';
import {
    computeEvaluationDemographics,
    exportCounselingEvaluationsCsv,
    exportCounselingEvaluationsExcel,
    exportCounselingEvaluationsPdf,
    exportSingleCounselingEvaluationPdf
} from '../counselingEvaluationExport';
import type {
    CounselingEvaluationQuestion,
    CounselingEvaluationResponse
} from '../counselingEvaluationService';

interface CounselingEvaluationsListProps {
    evaluations: CounselingEvaluationResponse[];
    questions: CounselingEvaluationQuestion[];
    hasForm: boolean;
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
    onManageForm?: () => void;
    /** When true (dept portal) the "manage form" button is hidden. */
    readOnly?: boolean;
}

const SourceBadge = ({ linked }: { linked: boolean }) =>
    linked ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
            <Link2 size={11} /> Linked to session
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-700">
            <FileQuestion size={11} /> Open evaluation
        </span>
    );

/** Collapsible gender demographics counter — deduped by student_id */
const GenderCounterBar = ({ evaluations }: { evaluations: CounselingEvaluationResponse[] }) => {
    const [open, setOpen] = useState(false);

    const counts = useMemo(() => {
        const demo = computeEvaluationDemographics(evaluations);
        return { sex: demo.sexCounts, gender: demo.genderCounts, total: demo.uniqueStudents };
    }, [evaluations]);

    if (counts.total === 0) return null;

    return (
        <div className="border-b border-slate-100">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-slate-50/60 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-100 text-purple-700">
                        <Users size={11} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Gender Demographics
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                        — {counts.total} unique students
                    </span>
                </div>
                <ChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="grid grid-cols-1 gap-3 px-4 pb-3 sm:grid-cols-2">
                    {/* Sex */}
                    <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Sex Assigned at Birth
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(counts.sex)
                                .sort((a, b) => b[1] - a[1])
                                .map(([label, count]) => (
                                    <span
                                        key={label}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                                    >
                                        {label}
                                        <strong className="tabular-nums font-black text-slate-900">{count}</strong>
                                    </span>
                                ))}
                        </div>
                    </div>
                    {/* Gender Identity */}
                    <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Gender Identity
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(counts.gender)
                                .sort((a, b) => b[1] - a[1])
                                .map(([label, count]) => (
                                    <span
                                        key={label}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-100 bg-purple-50/60 px-2.5 py-1 text-[11px] font-semibold text-purple-700"
                                    >
                                        {label}
                                        <strong className="tabular-nums font-black text-purple-900">{count}</strong>
                                    </span>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/** One row per student; expanding shows every evaluation response for that
 *  student (system-session linked AND open), each tagged with its source. */
export default function CounselingEvaluationsList({
    evaluations,
    questions,
    hasForm,
    isLoading,
    isError,
    onRetry,
    onManageForm,
    readOnly = false
}: CounselingEvaluationsListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedResponse, setSelectedResponse] = useState<CounselingEvaluationResponse | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [exportingType, setExportingType] = useState<string | null>(null);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [downloadingSingleId, setDownloadingSingleId] = useState<number | null>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Close export dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setExportMenuOpen(false);
            }
        };
        if (exportMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [exportMenuOpen]);

    const grouped = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        const map = new Map<string, CounselingEvaluationResponse[]>();

        for (const row of evaluations) {
            const matches =
                !query ||
                (row.student_name && row.student_name.toLowerCase().includes(query)) ||
                (row.student_id && row.student_id.toLowerCase().includes(query)) ||
                (row.department && row.department.toLowerCase().includes(query)) ||
                (row.course && row.course.toLowerCase().includes(query));

            if (!matches) continue;

            const key = String(row.student_id || row.id);
            const bucket = map.get(key);
            if (bucket) bucket.push(row);
            else map.set(key, [row]);
        }

        return [...map.entries()].sort((a, b) => {
            const nameA = (a[1][0]?.student_name || '').toLowerCase();
            const nameB = (b[1][0]?.student_name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [evaluations, searchTerm]);

    const filteredEvaluations = useMemo(() => {
        const list: CounselingEvaluationResponse[] = [];
        for (const [, responses] of grouped) {
            list.push(...responses);
        }
        return list;
    }, [grouped]);

    const toggle = (key: string) => setExpandedId((prev) => (prev === key ? null : key));

    const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
        setExportingType(format);
        setExportMenuOpen(false);
        const scopeLabel = searchTerm.trim() ? `Search: "${searchTerm.trim()}"` : undefined;
        const targetList = searchTerm.trim() ? filteredEvaluations : evaluations;

        try {
            if (format === 'excel') {
                await exportCounselingEvaluationsExcel(targetList, questions, scopeLabel);
            } else if (format === 'pdf') {
                await exportCounselingEvaluationsPdf(targetList, questions, scopeLabel);
            } else if (format === 'csv') {
                exportCounselingEvaluationsCsv(targetList, questions);
            }
        } finally {
            setExportingType(null);
        }
    };

    const handleDownloadSinglePdf = async (resp: CounselingEvaluationResponse) => {
        setDownloadingSingleId(resp.id);
        try {
            await exportSingleCounselingEvaluationPdf(resp, questions);
        } finally {
            setDownloadingSingleId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm font-medium text-slate-500">
                Loading evaluations...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
                <p className="text-sm font-bold text-red-600">Could not load evaluations.</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry} leftIcon={<RefreshCw size={14} />}>
                    Try again
                </Button>
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-sm font-black text-slate-900">Evaluation Responses</h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Filter student or ID..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-200"
                        />
                    </div>
                    {!readOnly && onManageForm && (
                        <Button variant="secondary" size="sm" onClick={onManageForm} leftIcon={<Settings2 size={14} />} className="shrink-0">
                            {hasForm ? 'Manage Evaluation Form' : 'Build Evaluation Form'}
                        </Button>
                    )}
                    {evaluations.length > 0 && (
                        <div className="relative shrink-0" ref={exportMenuRef}>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="shrink-0"
                                leftIcon={
                                    exportingType ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )
                                }
                                rightIcon={<ChevronDown size={12} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />}
                                disabled={Boolean(exportingType)}
                                onClick={() => setExportMenuOpen((prev) => !prev)}
                            >
                                {exportingType ? 'Exporting...' : 'Export'}
                            </Button>

                            {exportMenuOpen && (
                                <div className="absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-scale-in">
                                    <div className="px-3 py-1.5 border-b border-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Export Format
                                        </p>
                                        {searchTerm.trim() && (
                                            <p className="text-[10px] text-purple-600 font-semibold truncate">
                                                Filtering {filteredEvaluations.length} items
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleExport('excel')}
                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition"
                                    >
                                        <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                                        <span>Excel Spreadsheet (.xlsx)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExport('pdf')}
                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition"
                                    >
                                        <FileText size={15} className="text-rose-600 shrink-0" />
                                        <span>PDF Summary Report (.pdf)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExport('csv')}
                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition"
                                    >
                                        <Download size={15} className="text-blue-600 shrink-0" />
                                        <span>CSV Data File (.csv)</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {!hasForm && !readOnly && (
                <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
                    <ClipboardList size={16} className="shrink-0 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-800">
                        No active evaluation form yet. Build one and students can evaluate completed sessions (and record open evaluations).
                    </p>
                </div>
            )}

            <GenderCounterBar evaluations={evaluations} />

            <div className="min-h-0 flex-1 overflow-y-auto">
                {grouped.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                        <Users size={32} className="text-slate-300" />
                        <p className="mt-3 text-sm font-bold text-slate-700">
                            {searchTerm ? 'No evaluations matched your search' : 'No evaluations yet'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Responses will appear here as students evaluate their sessions.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {grouped.map(([key, responses]) => {
                            const first = responses[0];
                            const linkedCount = responses.filter((r) => r.counseling_request_id != null).length;
                            const openCount = responses.length - linkedCount;
                            const isExpanded = expandedId === key;
                            return (
                                <div key={key} className="transition-colors hover:bg-slate-50/60">
                                    <button
                                        type="button"
                                        onClick={() => toggle(key)}
                                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-sm font-black text-purple-700">
                                            {String(first?.student_name || 'S').charAt(0).toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-black text-slate-900">
                                                {first?.student_name || 'Student'}
                                            </span>
                                            <span className="block truncate text-xs text-slate-500">
                                                {first?.student_id} · {first?.department || 'Department'} {first?.course ? `· ${first.course}` : ''}
                                            </span>
                                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                    {first?.sex || 'Sex —'}
                                                </span>
                                                {first?.gender_identity && (
                                                    <span className="inline-flex items-center rounded-md border border-purple-100/60 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                                        {first.gender_identity}
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                        <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-bold sm:flex">
                                            {linkedCount > 0 && (
                                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{linkedCount} linked</span>
                                            )}
                                            {openCount > 0 && (
                                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{openCount} open</span>
                                            )}
                                        </span>
                                        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/50 p-3 pl-12 space-y-2">
                                            {responses.map((resp) => {
                                                const isLinked = resp.counseling_request_id != null;
                                                const isDownloadingThis = downloadingSingleId === resp.id;
                                                return (
                                                    <div
                                                        key={resp.id}
                                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:border-purple-200"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <SourceBadge linked={isLinked} />
                                                                <span className="text-xs font-semibold text-slate-500">
                                                                    Submitted {formatDateTime(resp.submitted_at)}
                                                                </span>
                                                            </div>
                                                            {isLinked && resp.counseling_requests?.scheduled_date && (
                                                                <p className="mt-1 text-[11px] font-medium text-slate-400">
                                                                    Session date: {formatDateTime(resp.counseling_requests.scheduled_date)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={isDownloadingThis}
                                                                onClick={() => handleDownloadSinglePdf(resp)}
                                                                leftIcon={
                                                                    isDownloadingThis ? (
                                                                        <Loader2 size={13} className="animate-spin" />
                                                                    ) : (
                                                                        <Download size={13} />
                                                                    )
                                                                }
                                                                className="text-slate-600 hover:text-purple-700 hover:bg-purple-50"
                                                            >
                                                                {isDownloadingThis ? 'PDF...' : 'PDF'}
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => setSelectedResponse(resp)}
                                                                leftIcon={<Eye size={13} />}
                                                                className="shrink-0"
                                                            >
                                                                View Answers
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedResponse && (
                <CounselingResponseDetailModal
                    open={Boolean(selectedResponse)}
                    onClose={() => setSelectedResponse(null)}
                    response={selectedResponse}
                    questions={questions}
                />
            )}
        </div>
    );
}
