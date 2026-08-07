import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { monthStartOf, todayIso } from '../../utils/peerLogbook';
import type { CareActivityLogEntry, CareActivityLogEntryDraft } from '../../utils/careActivitiesLogbook';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
);

export default function CareActivitiesLogEntryModal({
    entry, monthKey, readOnly, isSaving, onClose, onSave, onDelete
}: {
    entry: CareActivityLogEntry | null;
    monthKey: string;
    readOnly: boolean;
    isSaving: boolean;
    onClose: () => void;
    onSave: (draft: CareActivityLogEntryDraft) => void;
    onDelete?: () => void;
}) {
    const monthStart = monthStartOf(monthKey);
    const today = todayIso();
    const defaultDate = today.startsWith(monthKey) ? today : monthStart;

    const [isEditing, setIsEditing] = useState(!entry);
    const [draft, setDraft] = useState<CareActivityLogEntryDraft>({
        entry_date: entry?.entry_date || defaultDate,
        activity_type: entry?.activity_type || '',
        action_taken: entry?.action_taken || '',
        speakers: entry?.speakers || '',
        remarks: entry?.remarks || ''
    });

    const set = <K extends keyof CareActivityLogEntryDraft>(key: K, value: CareActivityLogEntryDraft[K]) =>
        setDraft((current) => ({ ...current, [key]: value }));

    const canSave = Boolean(draft.activity_type.trim() && draft.action_taken.trim());

    const [year, month] = monthKey.split('-').map(Number);
    const maxDate = todayIso(new Date(year, month, 0));

    const readView = entry && (
        <div className="space-y-4">
            <Field label="Date">
                {new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </Field>
            <Field label="Type of activity / interaction">{entry.activity_type}</Field>
            <Field label="Action taken / assistance provided"><span className="whitespace-pre-wrap">{entry.action_taken}</span></Field>
            <Field label="Speaker/s">{entry.speakers || 'Not recorded'}</Field>
            <Field label="Remarks / follow-up plan"><span className="whitespace-pre-wrap">{entry.remarks || 'None'}</span></Field>
        </div>
    );

    const editView = (
        <div className="space-y-4">
            <div>
                <label htmlFor="care-entry-date" className="mb-1 block text-xs font-bold text-gray-700">Date</label>
                <input
                    id="care-entry-date"
                    type="date"
                    value={draft.entry_date}
                    min={monthStart}
                    max={maxDate}
                    onChange={(e) => set('entry_date', e.target.value)}
                    className={inputClass}
                />
            </div>

            <div>
                <label htmlFor="care-entry-activity" className="mb-1 block text-xs font-bold text-gray-700">Type of activity / interaction</label>
                <input
                    id="care-entry-activity"
                    type="text"
                    value={draft.activity_type}
                    onChange={(e) => set('activity_type', e.target.value)}
                    placeholder="e.g. Depression & Suicide Awareness Symposium"
                    className={inputClass}
                />
            </div>

            <div>
                <label htmlFor="care-entry-action" className="mb-1 block text-xs font-bold text-gray-700">Action taken / assistance provided</label>
                <textarea id="care-entry-action" rows={3} value={draft.action_taken} onChange={(e) => set('action_taken', e.target.value)} className={inputClass} />
            </div>

            <div>
                <label htmlFor="care-entry-speakers" className="mb-1 block text-xs font-bold text-gray-700">
                    Speaker/s <span className="font-medium text-slate-400">— optional</span>
                </label>
                <input
                    id="care-entry-speakers"
                    type="text"
                    value={draft.speakers}
                    onChange={(e) => set('speakers', e.target.value)}
                    placeholder="Name(s) of speaker(s)"
                    className={inputClass}
                />
            </div>

            <div>
                <label htmlFor="care-entry-remarks" className="mb-1 block text-xs font-bold text-gray-700">Remarks / follow-up plan</label>
                <textarea id="care-entry-remarks" rows={2} value={draft.remarks} onChange={(e) => set('remarks', e.target.value)} className={inputClass} />
            </div>
        </div>
    );

    return (
        <Modal
            open
            size="lg"
            title={entry ? 'Log Entry' : 'New Log Entry'}
            subtitle={entry && !isEditing ? 'Recorded CARE activity' : 'Record one CARE activity'}
            onClose={onClose}
            footer={isEditing ? (
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button variant="primary" isLoading={isSaving} disabled={!canSave} onClick={() => onSave(draft)}>Save</Button>
                </>
            ) : readOnly ? (
                <Button variant="secondary" onClick={onClose}>Close</Button>
            ) : (
                <>
                    {onDelete && (
                        <Button variant="danger" leftIcon={<Trash2 size={14} />} onClick={onDelete} disabled={isSaving}>Delete</Button>
                    )}
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button variant="primary" onClick={() => setIsEditing(true)}>Edit</Button>
                </>
            )}
        >
            <div className="mx-auto w-full max-w-2xl">
                {isEditing ? editView : readView}
            </div>
        </Modal>
    );
}
