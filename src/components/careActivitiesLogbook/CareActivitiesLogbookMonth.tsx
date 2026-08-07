import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import CareActivitiesLogEntryModal from './CareActivitiesLogEntryModal';
import type { CareActivityLogEntry, CareActivityLogEntryDraft } from '../../utils/careActivitiesLogbook';

const formatEntryDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const formatLoggedTime = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function CareActivitiesLogbookMonth({
    entries, monthKey, readOnly, isSaving, onSaveEntry, onDeleteEntry, isLoading = false
}: {
    entries: CareActivityLogEntry[];
    monthKey: string;
    readOnly: boolean;
    isSaving: boolean;
    onSaveEntry: (draft: CareActivityLogEntryDraft, entryId: string | null) => Promise<void>;
    onDeleteEntry: (entryId: string) => Promise<void>;
    isLoading?: boolean;
}) {
    const [openEntry, setOpenEntry] = useState<CareActivityLogEntry | null>(null);
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
                    No CARE activities logged for this month yet.
                </p>
            ) : (
                <ul className="space-y-2">
                    {entries.map((entry) => (
                        <li key={entry.id}>
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
                                <ChevronRight size={16} className="shrink-0 text-slate-300" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {(openEntry || isCreating) && (
                <CareActivitiesLogEntryModal
                    entry={openEntry}
                    monthKey={monthKey}
                    readOnly={readOnly}
                    isSaving={isSaving}
                    onClose={closeModal}
                    onSave={async (draft) => {
                        try {
                            await onSaveEntry(draft, openEntry?.id ?? null);
                            closeModal();
                        } catch {
                            // stays open with the draft intact
                        }
                    }}
                    onDelete={openEntry && !readOnly ? async () => {
                        try {
                            await onDeleteEntry(openEntry.id);
                            closeModal();
                        } catch {
                            // stays open
                        }
                    } : undefined}
                />
            )}
        </div>
    );
}
