import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, NotebookPen, NotebookText, Undo2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { Button } from '../../../../../components/ui/Button';
import Modal from '../../../../../components/ui/Modal';
import DocxLogbookViewer from '../../../../../components/logbook/DocxLogbookViewer';
import type { PeerLogEntry } from '../../../../../components/peerLogbook/PeerLogEntryModal';
import type { CareActivityLogEntry } from '../../../../../utils/careActivitiesLogbook';
import { CARE_LOG_ENTRY_COLUMNS } from '../../../../../utils/careActivitiesLogbook';
import { exportLogbookPdf } from '../../../../../utils/peerLogbookPdf';
import { exportCareActivitiesLogbookPdf } from '../../../../../utils/careActivitiesLogbookPdf';
import {
    LOGBOOK_STATUS_TONE,
    LOG_ENTRY_COLUMNS,
    facilitatorName,
    monthLabelOf
} from '../../../../../utils/peerLogbook';

type Tab = 'peer' | 'care';

export default function CareStaffPeerSupportModal({
    facilitator, onClose, showToast
}: {
    facilitator: any;
    onClose: () => void;
    showToast: (message: string, type?: string) => void;
}) {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<Tab>('peer');
    const [openPeerBookId, setOpenPeerBookId] = useState<string | null>(null);
    const [openCareBookId, setOpenCareBookId] = useState<string | null>(null);
    const studentId = facilitator.student_id;

    // ── Peer Support ──────────────────────────────────────────────────────────
    const peerBooksKey = ['care-staff-peer-logbooks', studentId];

    const { data: peerBooks = [], isLoading: peerBooksLoading } = useQuery({
        queryKey: peerBooksKey,
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

    const effectivePeerBookId = openPeerBookId ?? (peerBooks[0] as any)?.id ?? null;
    const openPeerBook = peerBooks.find((b: any) => b.id === effectivePeerBookId) || null;

    const { data: peerEntries = [], isLoading: peerEntriesLoading } = useQuery({
        queryKey: ['care-staff-peer-log-entries', effectivePeerBookId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_log_entries')
                .select(LOG_ENTRY_COLUMNS)
                .eq('logbook_id', effectivePeerBookId as string)
                .order('entry_date', { ascending: false })
                .order('logged_at', { ascending: false });
            if (error) throw error;
            return (data || []) as unknown as PeerLogEntry[];
        },
        enabled: !!effectivePeerBookId
    });

    const reopenPeerMutation = useMutation({
        mutationFn: async (bookId: string) => {
            const { error } = await supabase
                .from('peer_facilitator_logbooks')
                .update({ status: 'draft', submitted_at: null })
                .eq('id', bookId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: peerBooksKey });
            queryClient.invalidateQueries({ queryKey: ['care-staff-submitted-logbooks'] });
            showToast('Logbook reopened for the peer.', 'success');
        },
        onError: () => showToast('Failed to reopen the logbook.', 'error')
    });

    const exportPeerBook = async () => {
        if (!openPeerBook) return;
        await exportLogbookPdf({
            peerName: facilitatorName(facilitator.students),
            programYearSection: [facilitator.students?.course, facilitator.students?.year_level].filter(Boolean).join(' / '),
            monthKey: String(openPeerBook.month).slice(0, 7),
            entries: peerEntries
        });
    };

    // ── CARE Activities ───────────────────────────────────────────────────────
    const careBooksKey = ['care-staff-care-logbooks', studentId];

    const { data: careBooks = [], isLoading: careBooksLoading } = useQuery({
        queryKey: careBooksKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('care_activities_logbooks')
                .select('id, month, status, submitted_at')
                .eq('student_id', studentId)
                .order('month', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const effectiveCareBookId = openCareBookId ?? (careBooks[0] as any)?.id ?? null;
    const openCareBook = careBooks.find((b: any) => b.id === effectiveCareBookId) || null;

    const { data: careEntries = [], isLoading: careEntriesLoading } = useQuery({
        queryKey: ['care-staff-care-log-entries', effectiveCareBookId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('care_activities_log_entries')
                .select(CARE_LOG_ENTRY_COLUMNS)
                .eq('logbook_id', effectiveCareBookId as string)
                .order('entry_date', { ascending: false })
                .order('logged_at', { ascending: false });
            if (error) throw error;
            return (data || []) as unknown as CareActivityLogEntry[];
        },
        enabled: !!effectiveCareBookId
    });

    const reopenCareMutation = useMutation({
        mutationFn: async (bookId: string) => {
            const { error } = await supabase
                .from('care_activities_logbooks')
                .update({ status: 'draft', submitted_at: null })
                .eq('id', bookId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: careBooksKey });
            showToast('Logbook reopened for the peer.', 'success');
        },
        onError: () => showToast('Failed to reopen the logbook.', 'error')
    });

    const exportCareBook = async () => {
        if (!openCareBook) return;
        await exportCareActivitiesLogbookPdf({
            peerName: facilitatorName(facilitator.students),
            programYearSection: [facilitator.students?.course, facilitator.students?.year_level].filter(Boolean).join(' / '),
            monthKey: String(openCareBook.month).slice(0, 7),
            entries: careEntries
        });
    };

    // ── Active open book (whichever tab is active) ────────────────────────────
    const openBook = tab === 'peer' ? openPeerBook : openCareBook;
    const handleExport = tab === 'peer' ? exportPeerBook : exportCareBook;
    const handleReopen = tab === 'peer'
        ? openPeerBook ? () => reopenPeerMutation.mutate(openPeerBook.id) : undefined
        : openCareBook ? () => reopenCareMutation.mutate(openCareBook.id) : undefined;
    const reopenPending = tab === 'peer' ? reopenPeerMutation.isPending : reopenCareMutation.isPending;

    const subtitle = openBook
        ? `${tab === 'peer' ? 'Peer Support' : 'CARE Activities'} · ${monthLabelOf(String(openBook.month).slice(0, 7))}`
        : tab === 'peer' ? 'Peer Support' : 'CARE Activities';

    return (
        <Modal
            open
            anchorId="staff-content-region"
            title={facilitatorName(facilitator.students)}
            subtitle={subtitle}
            onClose={onClose}
            footer={openBook ? (
                <>
                    <Button variant="secondary" leftIcon={<Download size={14} />} onClick={handleExport}>Export PDF</Button>
                    {openBook.status === 'submitted' && (
                        <Button
                            variant="secondary"
                            leftIcon={<Undo2 size={14} />}
                            isLoading={reopenPending}
                            onClick={handleReopen}
                        >
                            Reopen for peer
                        </Button>
                    )}
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </>
            ) : (
                <Button variant="secondary" onClick={onClose}>Close</Button>
            )}
        >
            <div className="mx-auto w-full max-w-6xl">
                <div role="tablist" aria-label="Facilitator sections" className="mb-4 flex gap-1 border-b border-gray-200">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'peer'}
                        onClick={() => { setTab('peer'); setOpenPeerBookId(null); }}
                        className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-bold transition ${tab === 'peer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><NotebookPen size={16} /> Peer Support</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'care'}
                        onClick={() => { setTab('care'); setOpenCareBookId(null); }}
                        className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-bold transition ${tab === 'care' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><NotebookText size={16} /> CARE Activities</span>
                    </button>
                </div>

                {tab === 'peer' ? (
                    peerBooksLoading ? (
                        <p className="py-8 text-center text-sm text-slate-400">Loading logbooks...</p>
                    ) : peerBooks.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">This facilitator has no peer support logbooks yet.</p>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                    Month
                                    <select
                                        value={effectivePeerBookId ?? ''}
                                        onChange={(e) => setOpenPeerBookId(e.target.value)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    >
                                        {peerBooks.map((book: any) => (
                                            <option key={book.id} value={book.id}>
                                                {monthLabelOf(String(book.month).slice(0, 7))}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {openPeerBook && (
                                    <>
                                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${LOGBOOK_STATUS_TONE[openPeerBook.status]}`}>
                                            {openPeerBook.status}
                                        </span>
                                        {openPeerBook.submitted_at && (
                                            <span className="text-[11px] font-semibold text-slate-500">
                                                Submitted {new Date(openPeerBook.submitted_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            {openPeerBook && (
                                <DocxLogbookViewer
                                    key={openPeerBook.id}
                                    type="peer"
                                    entries={peerEntries}
                                    isLoading={peerEntriesLoading}
                                />
                            )}
                        </>
                    )
                ) : (
                    careBooksLoading ? (
                        <p className="py-8 text-center text-sm text-slate-400">Loading logbooks...</p>
                    ) : careBooks.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">This facilitator has no CARE activities logbooks yet.</p>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                    Month
                                    <select
                                        value={effectiveCareBookId ?? ''}
                                        onChange={(e) => setOpenCareBookId(e.target.value)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                                    >
                                        {careBooks.map((book: any) => (
                                            <option key={book.id} value={book.id}>
                                                {monthLabelOf(String(book.month).slice(0, 7))}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {openCareBook && (
                                    <>
                                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${LOGBOOK_STATUS_TONE[openCareBook.status]}`}>
                                            {openCareBook.status}
                                        </span>
                                        {openCareBook.submitted_at && (
                                            <span className="text-[11px] font-semibold text-slate-500">
                                                Submitted {new Date(openCareBook.submitted_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            {openCareBook && (
                                <DocxLogbookViewer
                                    key={openCareBook.id}
                                    type="care"
                                    entries={careEntries}
                                    isLoading={careEntriesLoading}
                                />
                            )}
                        </>
                    )
                )}
            </div>
        </Modal>
    );
}
