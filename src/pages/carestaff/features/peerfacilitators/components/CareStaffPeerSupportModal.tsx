import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, NotebookPen, Undo2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { Button } from '../../../../../components/ui/Button';
import Modal from '../../../../../components/ui/Modal';
import PeerLogbookMonth from '../../../../../components/peerLogbook/PeerLogbookMonth';
import type { PeerLogEntry } from '../../../../../components/peerLogbook/PeerLogEntryModal';
import { exportLogbookPdf } from '../../../../../utils/peerLogbookPdf';
import {
    LOGBOOK_STATUS_TONE,
    LOG_ENTRY_COLUMNS,
    facilitatorName,
    monthLabelOf
} from '../../../../../utils/peerLogbook';

export default function CareStaffPeerSupportModal({
    facilitator, onClose, showToast
}: {
    facilitator: any;
    onClose: () => void;
    showToast: (message: string, type?: string) => void;
}) {
    const queryClient = useQueryClient();
    const [openBookId, setOpenBookId] = useState<string | null>(null);
    const studentId = facilitator.student_id;

    const booksKey = ['care-staff-peer-logbooks', studentId];

    const { data: books = [], isLoading } = useQuery({
        queryKey: booksKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_logbooks')
                .select('id, month, status, submitted_at')
                .eq('student_id', studentId)
                .order('month', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const openBook = books.find((b: any) => b.id === openBookId) || null;

    const { data: entries = [], isLoading: entriesLoading } = useQuery({
        queryKey: ['care-staff-peer-log-entries', openBookId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_log_entries')
                .select(LOG_ENTRY_COLUMNS)
                .eq('logbook_id', openBookId as string)
                .order('entry_date', { ascending: false })
                .order('logged_at', { ascending: false });
            if (error) throw error;
            return (data || []) as unknown as PeerLogEntry[];
        },
        enabled: !!openBookId
    });

    const reopenMutation = useMutation({
        mutationFn: async (bookId: string) => {
            const { error } = await supabase
                .from('peer_facilitator_logbooks')
                .update({ status: 'draft', submitted_at: null })
                .eq('id', bookId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: booksKey });
            queryClient.invalidateQueries({ queryKey: ['care-staff-submitted-logbooks'] });
            showToast('Logbook reopened for the peer.', 'success');
        },
        onError: () => showToast('Failed to reopen the logbook.', 'error')
    });

    const exportOpenBook = async () => {
        if (!openBook) return;
        await exportLogbookPdf({
            peerName: facilitatorName(facilitator.students),
            programYearSection: [facilitator.students?.course, facilitator.students?.year_level].filter(Boolean).join(' / '),
            monthKey: String(openBook.month).slice(0, 7),
            entries
        });
    };

    return (
        <Modal
            open
            anchorId="staff-content-region"
            title={facilitatorName(facilitator.students)}
            subtitle={openBook ? `Peer Support · ${monthLabelOf(String(openBook.month).slice(0, 7))}` : 'Peer Support'}
            onClose={openBook ? () => setOpenBookId(null) : onClose}
            footer={openBook ? (
                <>
                    <Button variant="secondary" leftIcon={<Download size={14} />} onClick={exportOpenBook}>Export PDF</Button>
                    {/* No approve action. A guidance counsellor signs the printed
                        sheet as a counsellor; the system has no business recording
                        an approval it never witnessed. Reopening stays, because a
                        month marked submitted by mistake needs a way back. */}
                    {openBook.status === 'submitted' && (
                        <Button
                            variant="secondary"
                            leftIcon={<Undo2 size={14} />}
                            isLoading={reopenMutation.isPending}
                            onClick={() => reopenMutation.mutate(openBook.id)}
                        >
                            Reopen for peer
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setOpenBookId(null)}>Back</Button>
                </>
            ) : (
                <Button variant="secondary" onClick={onClose}>Close</Button>
            )}
        >
            <div className="mx-auto w-full max-w-3xl">
                {/* One tab today. It names what staff are looking at, and is where a
                    second facilitator view would go rather than a second modal. */}
                <div role="tablist" aria-label="Facilitator sections" className="mb-4 flex gap-1 border-b border-gray-200">
                    <button
                        type="button"
                        role="tab"
                        aria-selected
                        className="whitespace-nowrap border-b-2 border-blue-600 px-3 py-2.5 text-sm font-bold text-blue-600"
                    >
                        <span className="flex items-center gap-2"><NotebookPen size={16} /> Peer Support</span>
                    </button>
                </div>

                {openBook ? (
                    <>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${LOGBOOK_STATUS_TONE[openBook.status]}`}>
                                {openBook.status}
                            </span>
                            {openBook.submitted_at && (
                                <span className="text-[11px] font-semibold text-slate-500">
                                    Submitted {new Date(openBook.submitted_at).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        <PeerLogbookMonth
                            entries={entries}
                            monthKey={String(openBook.month).slice(0, 7)}
                            readOnly
                            isLoading={entriesLoading}
                            isSaving={false}
                            onSaveEntry={async () => undefined}
                            onDeleteEntry={async () => undefined}
                        />
                    </>
                ) : isLoading ? (
                    <p className="py-8 text-center text-sm text-slate-400">Loading logbooks...</p>
                ) : books.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">This facilitator has no peer support logbooks yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {books.map((book: any) => (
                            <li key={book.id}>
                                <button
                                    type="button"
                                    onClick={() => setOpenBookId(book.id)}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                                >
                                    <span className="text-sm font-bold text-slate-900">
                                        {monthLabelOf(String(book.month).slice(0, 7))}
                                    </span>
                                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${LOGBOOK_STATUS_TONE[book.status]}`}>
                                        {book.status}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
}
