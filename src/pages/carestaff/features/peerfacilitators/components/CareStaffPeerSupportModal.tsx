import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Undo2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { Button } from '../../../../../components/ui/Button';
import Modal from '../../../../../components/ui/Modal';
import PeerLogbookMonth from '../../../../../components/peerLogbook/PeerLogbookMonth';
import type { PeerLogEntry } from '../../../../../components/peerLogbook/PeerLogEntryModal';
import { exportLogbookPdf } from '../../../../../utils/peerLogbookPdf';
import { monthLabelOf } from '../../../../../utils/peerLogbook';

const ENTRY_COLUMNS = `
    id, logbook_id, logbook_month, entry_date, logged_at, activity_type,
    assisted_student_id, assisted_initials, concern, action_taken, remarks, referred,
    students:assisted_student_id ( first_name, last_name )
`;

const STATUS_TONE: Record<string, string> = {
    draft: 'border-slate-200 bg-slate-50 text-slate-600',
    submitted: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700'
};

const fullName = (s: any) =>
    [s?.first_name, s?.middle_name ? `${String(s.middle_name).charAt(0)}.` : '', s?.last_name, s?.suffix]
        .filter(Boolean).join(' ') || '—';

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
                .select('id, month, status, submitted_at, reviewer_name, reviewed_at')
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
                .select(ENTRY_COLUMNS)
                .eq('logbook_id', openBookId as string)
                .order('entry_date', { ascending: false })
                .order('logged_at', { ascending: false });
            if (error) throw error;
            return (data || []) as unknown as PeerLogEntry[];
        },
        enabled: !!openBookId
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ bookId, approve }: { bookId: string; approve: boolean }) => {
            if (!approve) {
                const { error } = await supabase
                    .from('peer_facilitator_logbooks')
                    .update({ status: 'draft', reviewed_by: null, reviewer_name: null, reviewed_at: null })
                    .eq('id', bookId);
                if (error) throw error;
                return;
            }

            const { data: userData } = await supabase.auth.getUser();
            const authUserId = userData.user?.id ?? null;
            const { data: staffAccount } = await supabase
                .from('staff_accounts')
                .select('full_name, username')
                .eq('auth_user_id', authUserId as string)
                .maybeSingle();

            const { error } = await supabase
                .from('peer_facilitator_logbooks')
                .update({
                    status: 'approved',
                    reviewed_by: authUserId,
                    reviewer_name: staffAccount?.full_name || staffAccount?.username || 'CARE Staff',
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', bookId);
            if (error) throw error;
        },
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: booksKey });
            queryClient.invalidateQueries({ queryKey: ['care-staff-submitted-logbooks'] });
            showToast(variables.approve ? 'Logbook approved.' : 'Logbook returned to the peer.', 'success');
        },
        onError: () => showToast('Failed to update the logbook.', 'error')
    });

    const exportOpenBook = async () => {
        if (!openBook) return;
        await exportLogbookPdf({
            peerName: fullName(facilitator.students),
            programYearSection: [facilitator.students?.course, facilitator.students?.year_level].filter(Boolean).join(' / '),
            monthKey: String(openBook.month).slice(0, 7),
            entries,
            reviewerName: openBook.reviewer_name
        });
    };

    return (
        <Modal
            open
            anchorId="staff-content-region"
            title={fullName(facilitator.students)}
            subtitle={openBook ? `Peer Support · ${monthLabelOf(String(openBook.month).slice(0, 7))}` : 'Peer Support'}
            onClose={openBook ? () => setOpenBookId(null) : onClose}
            footer={openBook ? (
                <>
                    <Button variant="secondary" leftIcon={<Download size={14} />} onClick={exportOpenBook}>Export PDF</Button>
                    {openBook.status === 'submitted' && (
                        <Button
                            variant="secondary"
                            leftIcon={<Undo2 size={14} />}
                            isLoading={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ bookId: openBook.id, approve: false })}
                        >
                            Return to peer
                        </Button>
                    )}
                    {openBook.status !== 'approved' && (
                        <Button
                            variant="primary"
                            leftIcon={<CheckCircle2 size={16} />}
                            isLoading={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ bookId: openBook.id, approve: true })}
                        >
                            Approve
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setOpenBookId(null)}>Back</Button>
                </>
            ) : (
                <Button variant="secondary" onClick={onClose}>Close</Button>
            )}
        >
            <div className="mx-auto w-full max-w-3xl">
                {openBook ? (
                    <>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${STATUS_TONE[openBook.status]}`}>
                                {openBook.status}
                            </span>
                            {openBook.reviewer_name && (
                                <span className="text-[11px] font-semibold text-slate-500">
                                    Reviewed by {openBook.reviewer_name}
                                    {openBook.reviewed_at ? ` · ${new Date(openBook.reviewed_at).toLocaleDateString()}` : ''}
                                </span>
                            )}
                        </div>
                        <PeerLogbookMonth
                            entries={entries}
                            monthKey={String(openBook.month).slice(0, 7)}
                            readOnly
                            peerStudentId={studentId}
                            isLoading={entriesLoading}
                            isSaving={false}
                            onSaveEntry={() => undefined}
                            onDeleteEntry={() => undefined}
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
                                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${STATUS_TONE[book.status]}`}>
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
