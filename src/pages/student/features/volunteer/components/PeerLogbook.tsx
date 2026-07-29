import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Send } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { Button } from '../../../../../components/ui/Button';
import PeerLogbookMonth from '../../../../../components/peerLogbook/PeerLogbookMonth';
import type { PeerLogEntry, PeerLogEntryDraft } from '../../../../../components/peerLogbook/PeerLogEntryModal';
import { exportLogbookPdf } from '../../../../../utils/peerLogbookPdf';
import {
    LOGBOOK_STATUS_TONE,
    LOG_ENTRY_COLUMNS,
    monthKeyOf,
    monthLabelOf,
    monthStartOf,
    shouldPromptSubmit
} from '../../../../../utils/peerLogbook';

export default function PeerLogbook({
    studentId, peerName, programYearSection, showToast
}: {
    studentId: string;
    peerName: string;
    programYearSection: string;
    showToast?: (message: string, type?: string) => void;
}) {
    const queryClient = useQueryClient();
    const [monthKey, setMonthKey] = useState(() => monthKeyOf(new Date()));

    const bookKey = ['peer-logbook', studentId, monthKey];

    const { data, isLoading } = useQuery({
        queryKey: bookKey,
        queryFn: async () => {
            const { data: logbook, error: bookError } = await supabase
                .from('peer_facilitator_logbooks')
                .select('id, month, status, submitted_at, reviewer_name, reviewed_at')
                .eq('student_id', studentId)
                .eq('month', monthStartOf(monthKey))
                .maybeSingle();
            if (bookError) throw bookError;
            if (!logbook) return { logbook: null, entries: [] as PeerLogEntry[] };

            const { data: entries, error: entryError } = await supabase
                .from('peer_facilitator_log_entries')
                .select(LOG_ENTRY_COLUMNS)
                .eq('logbook_id', logbook.id)
                .order('entry_date', { ascending: false })
                .order('logged_at', { ascending: false });
            if (entryError) throw entryError;
            return { logbook, entries: (entries || []) as unknown as PeerLogEntry[] };
        }
    });

    const { data: archived = [] } = useQuery({
        queryKey: ['peer-logbook-archive', studentId],
        queryFn: async () => {
            const { data: rows, error } = await supabase
                .from('peer_facilitator_logbooks')
                .select('id, month, reviewer_name, reviewed_at')
                .eq('student_id', studentId)
                .eq('status', 'approved')
                .order('month', { ascending: false });
            if (error) throw error;
            return rows || [];
        }
    });

    const logbook = data?.logbook || null;
    const entries = data?.entries || [];
    const status = logbook?.status || 'draft';
    const isLocked = status !== 'draft';

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: bookKey });
        queryClient.invalidateQueries({ queryKey: ['peer-logbook-archive', studentId] });
    };

    const saveEntryMutation = useMutation({
        mutationFn: async ({ draft, entryId }: { draft: PeerLogEntryDraft; entryId: string | null }) => {
            if (entryId) {
                const { error } = await supabase
                    .from('peer_facilitator_log_entries')
                    .update({ ...draft, remarks: draft.remarks || null })
                    .eq('id', entryId);
                if (error) throw error;
                return;
            }

            // ignoreDuplicates keeps this an ON CONFLICT DO NOTHING. A normal upsert
            // would run an UPDATE on an existing month, which the student policy
            // rejects -- it only permits draft -> submitted.
            const month = monthStartOf(monthKey);
            const { error: bookError } = await supabase
                .from('peer_facilitator_logbooks')
                .upsert({ student_id: studentId, month }, { onConflict: 'student_id,month', ignoreDuplicates: true });
            if (bookError) throw bookError;

            const { data: book, error: readError } = await supabase
                .from('peer_facilitator_logbooks')
                .select('id')
                .eq('student_id', studentId)
                .eq('month', month)
                .single();
            if (readError) throw readError;

            const { error } = await supabase
                .from('peer_facilitator_log_entries')
                .insert([{ ...draft, remarks: draft.remarks || null, logbook_id: book.id, logbook_month: month }]);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidate();
            showToast?.('Log entry saved.');
        },
        onError: () => showToast?.('Unable to save the log entry.', 'error')
    });

    const deleteEntryMutation = useMutation({
        mutationFn: async (entryId: string) => {
            const { error } = await supabase.from('peer_facilitator_log_entries').delete().eq('id', entryId);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidate();
            showToast?.('Log entry deleted.');
        },
        onError: () => showToast?.('Unable to delete the log entry.', 'error')
    });

    const submitMutation = useMutation({
        mutationFn: async () => {
            if (!logbook) throw new Error('Nothing to submit.');
            const { error } = await supabase
                .from('peer_facilitator_logbooks')
                .update({ status: 'submitted', submitted_at: new Date().toISOString() })
                .eq('id', logbook.id);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidate();
            showToast?.('Logbook submitted for review.');
        },
        onError: () => showToast?.('Unable to submit the logbook.', 'error')
    });

    const downloadMonth = async (targetMonthKey: string, targetLogbookId: string, reviewerName?: string | null) => {
        const { data: rows, error } = await supabase
            .from('peer_facilitator_log_entries')
            .select(LOG_ENTRY_COLUMNS)
            .eq('logbook_id', targetLogbookId)
            .order('entry_date', { ascending: true });
        if (error) {
            showToast?.('Unable to build the PDF.', 'error');
            return;
        }
        await exportLogbookPdf({
            peerName,
            programYearSection,
            monthKey: targetMonthKey,
            entries: (rows || []) as unknown as PeerLogEntry[],
            reviewerName
        });
    };

    return (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Peer Support</p>
                    <h3 className="mt-1 text-base font-black text-slate-950">The Logbook</h3>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="peer-logbook-month" className="sr-only">Month covered</label>
                    <input
                        id="peer-logbook-month"
                        type="month"
                        value={monthKey}
                        onChange={(e) => setMonthKey(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase ${LOGBOOK_STATUS_TONE[status]}`}>
                        {status}
                    </span>
                </div>
            </div>

            {shouldPromptSubmit(new Date(), status) && monthKey === monthKeyOf(new Date()) && entries.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold leading-5 text-amber-800">
                        {monthLabelOf(monthKey)} is almost over. Submit your logbook so the CARE Office can review it.
                    </p>
                </div>
            )}

            <div className="mt-4 border-t border-slate-100 pt-4">
                <PeerLogbookMonth
                    entries={entries}
                    monthKey={monthKey}
                    readOnly={isLocked}
                    isLoading={isLoading}
                    isSaving={saveEntryMutation.isPending || deleteEntryMutation.isPending}
                    onSaveEntry={(draft, entryId) => saveEntryMutation.mutateAsync({ draft, entryId })}
                    onDeleteEntry={(entryId) => deleteEntryMutation.mutateAsync(entryId)}
                />
            </div>

            {!isLocked && entries.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                    <Button
                        variant="primary"
                        leftIcon={<Send size={16} />}
                        isLoading={submitMutation.isPending}
                        onClick={() => submitMutation.mutate()}
                        className="w-full sm:w-auto"
                    >
                        Submit {monthLabelOf(monthKey)} for review
                    </Button>
                </div>
            )}

            {archived.length > 0 && (
                /* ponytail: native <details>, no disclosure state to manage */
                <details className="mt-4 border-t border-slate-100 pt-4">
                    <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:text-slate-600">
                        Archived logbooks ({archived.length})
                    </summary>
                    <ul className="mt-3 space-y-2">
                        {archived.map((book: any) => (
                            <li key={book.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900">{monthLabelOf(String(book.month).slice(0, 7))}</p>
                                    <p className="text-[10px] font-semibold text-slate-500">
                                        Approved{book.reviewer_name ? ` by ${book.reviewer_name}` : ''}
                                    </p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<Download size={14} />}
                                    onClick={() => downloadMonth(String(book.month).slice(0, 7), book.id, book.reviewer_name)}
                                >
                                    Export
                                </Button>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
}
