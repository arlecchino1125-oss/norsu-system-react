import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { initialsFrom, monthStartOf, todayIso } from '../../utils/peerLogbook';

export interface PeerLogEntry {
    id: string;
    logbook_id: string;
    logbook_month: string;
    entry_date: string;
    logged_at: string;
    activity_type: string;
    assisted_student_id: string | null;
    assisted_initials: string | null;
    concern: string;
    action_taken: string;
    remarks: string | null;
    referred: boolean;
}

export interface PeerLogEntryDraft {
    entry_date: string;
    activity_type: string;
    assisted_student_id: string | null;
    assisted_initials: string | null;
    concern: string;
    action_taken: string;
    remarks: string;
    referred: boolean;
}

/** Suggestions only -- the field accepts anything, so a new activity is typed, not blocked. */
const ACTIVITY_SUGGESTIONS = [
    'One-on-one peer support',
    'Group session',
    'Classroom / orientation',
    'Outreach activity',
    'Follow-up check-in',
    'Office duty'
];

const fullName = (s: any) => [s?.first_name, s?.last_name].filter(Boolean).join(' ') || '—';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
);

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500';

const AssistedStudentPicker = ({
    selectedId, selectedLabel, onPick, onClear, searchFn
}: {
    selectedId: string | null;
    selectedLabel: string;
    onPick: (student: any) => void;
    onClear: () => void;
    searchFn?: (term: string) => Promise<any[]>;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const term = searchTerm.trim();

    // A student may only read their own row, so this cannot query students
    // directly. search_students_for_peer checks the caller is on the active
    // roster and returns at most five, name and id only. Under two characters it
    // returns whoever this peer logged most recently, so a follow-up is one tap.
    const { data: options = [], isFetching } = useQuery({
        queryKey: ['peer-logbook-student-search', term, Boolean(searchFn)],
        queryFn: async () => {
            if (searchFn) return await searchFn(term);
            const { data, error } = await supabase.rpc('search_students_for_peer', { p_term: term });
            if (error) throw error;
            return data || [];
        },
        staleTime: 60000
    });

    if (selectedId) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="truncate text-sm font-bold text-slate-900">{selectedLabel}</p>
                <Button variant="secondary" size="sm" onClick={onClear}>Change</Button>
            </div>
        );
    }

    return (
        <div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or student ID..."
                    aria-label="Search for the student assisted"
                    className={`${inputClass} pl-10`}
                />
            </div>
            <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
                {isFetching ? (
                    <p className="px-3 py-3 text-center text-xs text-slate-400">Searching...</p>
                ) : options.length === 0 ? (
                    <p className="px-3 py-3 text-center text-xs text-slate-400">
                        {term.length >= 2 ? 'No matching students.' : 'Type a name to search.'}
                    </p>
                ) : (
                    /* Name only while choosing -- the student ID is never shown,
                       and only the initials are kept once picked. */
                    options.map((s: any) => (
                        <button
                            type="button"
                            key={s.student_id}
                            onClick={() => onPick(s)}
                            className="w-full px-3 py-2 text-left transition-colors hover:bg-blue-50"
                        >
                            <p className="text-sm font-bold text-slate-900">{fullName(s)}</p>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

export default function PeerLogEntryModal({
    entry, monthKey, readOnly, isSaving, onClose, onSave, onDelete, searchFn
}: {
    entry: PeerLogEntry | null;
    monthKey: string;
    readOnly: boolean;
    isSaving: boolean;
    onClose: () => void;
    onSave: (draft: PeerLogEntryDraft) => void;
    onDelete?: () => void;
    searchFn?: (term: string) => Promise<any[]>;
}) {
    const monthStart = monthStartOf(monthKey);
    const today = todayIso();
    const defaultDate = today.startsWith(monthKey) ? today : monthStart;

    const [isEditing, setIsEditing] = useState(!entry);
    const [draft, setDraft] = useState<PeerLogEntryDraft>({
        entry_date: entry?.entry_date || defaultDate,
        activity_type: entry?.activity_type || '',
        assisted_student_id: entry?.assisted_student_id || null,
        assisted_initials: entry?.assisted_initials || null,
        concern: entry?.concern || '',
        action_taken: entry?.action_taken || '',
        remarks: entry?.remarks || '',
        referred: entry?.referred || false
    });
    const [pickedLabel, setPickedLabel] = useState(entry?.assisted_initials || '');

    const set = <K extends keyof PeerLogEntryDraft>(key: K, value: PeerLogEntryDraft[K]) =>
        setDraft((current) => ({ ...current, [key]: value }));

    const canSave = Boolean(draft.activity_type.trim() && draft.concern.trim() && draft.action_taken.trim());

    // Last day of the month, so the date input cannot leave the logbook's month --
    // the DB check would reject it anyway, this just says so before the round trip.
    const [year, month] = monthKey.split('-').map(Number);
    const maxDate = todayIso(new Date(year, month, 0));

    const readView = entry && (
        <div className="space-y-4">
            <Field label="Date">
                {new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </Field>
            <Field label="Type of activity / interaction">{entry.activity_type}</Field>
            {/* Initials only, on every screen. The record links to a student when
                one was picked, but the form asks for initials and that is all a
                logbook ever displays. */}
            <Field label="Student assisted">{entry.assisted_initials || 'Not recorded'}</Field>
            <Field label="Concern / topic discussed"><span className="whitespace-pre-wrap">{entry.concern}</span></Field>
            <Field label="Action taken / assistance provided"><span className="whitespace-pre-wrap">{entry.action_taken}</span></Field>
            <Field label="Referred to Guidance Center">{entry.referred ? 'Yes' : 'No'}</Field>
            <Field label="Remarks / follow-up plan"><span className="whitespace-pre-wrap">{entry.remarks || 'None'}</span></Field>
        </div>
    );

    const editView = (
        <div className="space-y-4">
            <div>
                <label htmlFor="entry-date" className="mb-1 block text-xs font-bold text-gray-700">Date</label>
                <input
                    id="entry-date"
                    type="date"
                    value={draft.entry_date}
                    min={monthStart}
                    max={maxDate}
                    onChange={(e) => set('entry_date', e.target.value)}
                    className={inputClass}
                />
            </div>

            <div>
                <label htmlFor="entry-activity" className="mb-1 block text-xs font-bold text-gray-700">Type of activity / interaction</label>
                <input
                    id="entry-activity"
                    list="peer-activity-suggestions"
                    value={draft.activity_type}
                    onChange={(e) => set('activity_type', e.target.value)}
                    className={inputClass}
                />
                <datalist id="peer-activity-suggestions">
                    {ACTIVITY_SUGGESTIONS.map((option) => <option key={option} value={option} />)}
                </datalist>
            </div>

            <div>
                <p className="mb-1 text-xs font-bold text-gray-700">
                    Student assisted <span className="font-medium text-slate-400">— optional</span>
                </p>
                <AssistedStudentPicker
                    selectedId={draft.assisted_student_id}
                    selectedLabel={pickedLabel}
                    searchFn={searchFn}
                    // Initials are written now, not derived later: a peer cannot
                    // read another student's record, so nothing can look the name
                    // up again once this modal closes.
                    onPick={(student) => {
                        const initials = initialsFrom(student.first_name, student.last_name);
                        setDraft((current) => ({
                            ...current,
                            assisted_student_id: student.student_id,
                            assisted_initials: initials
                        }));
                        setPickedLabel(initials);
                    }}
                    onClear={() => {
                        setDraft((current) => ({
                            ...current,
                            assisted_student_id: null,
                            assisted_initials: null
                        }));
                        setPickedLabel('');
                    }}
                />
            </div>

            <div>
                <label htmlFor="entry-concern" className="mb-1 block text-xs font-bold text-gray-700">Concern / topic discussed</label>
                <textarea id="entry-concern" rows={3} value={draft.concern} onChange={(e) => set('concern', e.target.value)} className={inputClass} />
            </div>

            <div>
                <label htmlFor="entry-action" className="mb-1 block text-xs font-bold text-gray-700">Action taken / assistance provided</label>
                <textarea id="entry-action" rows={3} value={draft.action_taken} onChange={(e) => set('action_taken', e.target.value)} className={inputClass} />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <input
                    type="checkbox"
                    checked={draft.referred}
                    onChange={(e) => set('referred', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-slate-700">Referred to Guidance Center</span>
            </label>

            <div>
                <label htmlFor="entry-remarks" className="mb-1 block text-xs font-bold text-gray-700">Remarks / follow-up plan</label>
                <textarea id="entry-remarks" rows={2} value={draft.remarks} onChange={(e) => set('remarks', e.target.value)} className={inputClass} />
            </div>
        </div>
    );

    return (
        <Modal
            open
            size="lg"
            title={entry ? 'Log Entry' : 'New Log Entry'}
            subtitle={entry && !isEditing ? 'Recorded peer support session' : 'Record one peer support session'}
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
