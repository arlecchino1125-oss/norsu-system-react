import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import PeerLogEntryModal, { type PeerLogEntry, type PeerLogEntryDraft } from './PeerLogEntryModal';

const formatEntryDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const formatLoggedTime = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function PeerLogbookMonth({
    entries, monthKey, readOnly, peerStudentId, isSaving, onSaveEntry, onDeleteEntry, isLoading = false
}: {
    entries: PeerLogEntry[];
    monthKey: string;
    readOnly: boolean;
    peerStudentId: string;
    isSaving: boolean;
    onSaveEntry: (draft: PeerLogEntryDraft, entryId: string | null) => void;
    onDeleteEntry: (entryId: string) => void;
    isLoading?: boolean;
}) {
    const [openEntry, setOpenEntry] = useState<PeerLogEntry | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const closeModal = () => {
        setOpenEntry(null);
        setIsCreating(false);
    };

    return (
        <div className="space-y-3">
            {!readOnly && (
                <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsCreating(true)} className="w-full sm:w-auto">
                    Add Entry
                </Button>
            )}

            {isLoading ? (
                <p className="py-8 text-center text-[11px] font-semibold text-slate-400">Loading entries...</p>
            ) : entries.length === 0 ? (
                <p className="py-8 text-center text-[11px] font-semibold text-slate-400">
                    No peer support logged for this month yet.
                </p>
            ) : (
                <ul className="space-y-2">
                    {entries.map((entry) => (
                        <li key={entry.id}>
                            {/* Two lines only. Nothing identifying reaches this list -- a
                                logbook is read on a phone, often with someone nearby. */}
                            <button
                                type="button"
                                onClick={() => setOpenEntry(entry)}
                                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                        {formatEntryDate(entry.entry_date)} · {formatLoggedTime(entry.logged_at)}
                                    </p>
                                    <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{entry.activity_type}</p>
                                </div>
                                {entry.referred && (
                                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
                                        Referred
                                    </span>
                                )}
                                <ChevronRight size={16} className="shrink-0 text-slate-300" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {(openEntry || isCreating) && (
                <PeerLogEntryModal
                    entry={openEntry}
                    monthKey={monthKey}
                    readOnly={readOnly}
                    peerStudentId={peerStudentId}
                    isSaving={isSaving}
                    onClose={closeModal}
                    onSave={(draft) => {
                        onSaveEntry(draft, openEntry?.id ?? null);
                        closeModal();
                    }}
                    onDelete={openEntry && !readOnly ? () => {
                        onDeleteEntry(openEntry.id);
                        closeModal();
                    } : undefined}
                />
            )}
        </div>
    );
}
