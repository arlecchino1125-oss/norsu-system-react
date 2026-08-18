import React, { useMemo, useState } from 'react';
import { ChevronDown, ClipboardList, Eye, FileQuestion, Link2, RefreshCw, Search, Settings2, Users } from 'lucide-react';

import { formatDateTime } from '../../../../../utils/formatters';
import { Button } from '../../../../../components/ui/Button';
import CounselingResponseDetailModal from './CounselingResponseDetailModal';
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

    const grouped = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        const map = new Map<string, CounselingEvaluationResponse[]>();
        
        for (const row of evaluations) {
            const matches = !query || 
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

    const toggle = (key: string) => setExpandedId((prev) => (prev === key ? null : key));

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
