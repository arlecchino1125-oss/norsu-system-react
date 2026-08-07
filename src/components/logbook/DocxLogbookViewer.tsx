import { useMemo, useState } from 'react';
import PaginationControls from '../PaginationControls';
import { LOGBOOK_COLUMNS } from '../../utils/peerLogbookPdf';
import { CARE_LOGBOOK_COLUMNS } from '../../utils/careActivitiesLogbookPdf';
import type { PeerLogEntry } from '../peerLogbook/PeerLogEntryModal';
import type { CareActivityLogEntry } from '../../utils/careActivitiesLogbook';

const PAGE_SIZE = 12;

const formatDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

type LogType = 'peer' | 'care';

/**
 * Read-only DOCX-style table for a single monthly logbook. Shows every column
 * per row (no drill-down), paginated, matching the exported PDF's column set
 * so the on-screen view and the printed sheet stay identical.
 */
export default function DocxLogbookViewer({
    type, entries, isLoading = false
}: {
    type: LogType;
    entries: (PeerLogEntry | CareActivityLogEntry)[];
    isLoading?: boolean;
}) {
    const [page, setPage] = useState(1);

    const columns = type === 'peer' ? LOGBOOK_COLUMNS : CARE_LOGBOOK_COLUMNS;

    const rows = useMemo<string[][]>(() => {
        if (type === 'peer') {
            return (entries as PeerLogEntry[]).map((e) => [
                `${formatDate(e.entry_date)} · ${formatTime(e.logged_at)}`,
                e.activity_type,
                e.assisted_initials?.trim() || '',
                e.concern,
                e.action_taken,
                e.referred ? 'Yes' : 'No',
                e.remarks || '',
                ''
            ]);
        }
        return (entries as CareActivityLogEntry[]).map((e) => [
            `${formatDate(e.entry_date)} · ${formatTime(e.logged_at)}`,
            e.activity_type,
            e.action_taken,
            e.speakers || '',
            e.remarks || '',
            ''
        ]);
    }, [type, entries]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    if (isLoading) {
        return (
            <p className="py-10 text-center text-sm text-slate-400">Loading entries...</p>
        );
    }

    if (rows.length === 0) {
        return (
            <p className="py-10 text-center text-sm text-slate-400">
                {type === 'peer'
                    ? 'No peer support logged for this month yet.'
                    : 'No CARE activities logged for this month yet.'}
            </p>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50">
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    className="border-b border-slate-200 px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((row, ri) => (
                            <tr key={ri} className="odd:bg-white even:bg-slate-50/60">
                                {row.map((cell, ci) => (
                                    <td
                                        key={ci}
                                        className="whitespace-pre-wrap border-b border-slate-100 align-top px-4 py-3 text-[13px] text-slate-700"
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {rows.length > PAGE_SIZE && (
                <PaginationControls
                    page={safePage}
                    pageSize={PAGE_SIZE}
                    total={rows.length}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}
