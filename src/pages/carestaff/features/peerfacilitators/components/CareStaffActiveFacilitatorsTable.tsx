import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, Archive, XCircle, Users } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { Button } from '../../../../../components/ui/Button';
import { Card } from '../../../../../components/ui/Card';
import PaginationControls from '../../../../../components/PaginationControls';

interface CareStaffActiveFacilitatorsTableProps {
    functions: { showToast: (msg: string, type?: any) => void };
    refreshSignal?: number;
}

const SETTINGS_KEY = 'peer-facilitator-settings';
const ROSTER_KEY = 'care-staff-active-facilitators';
const ACTIVE_PAGE_SIZE = 10;

const fullName = (s: any) =>
    [s?.first_name, s?.middle_name ? `${String(s.middle_name).charAt(0)}.` : '', s?.last_name, s?.suffix]
        .filter(Boolean).join(' ') || '—';

const courseYear = (s: any) =>
    [s?.course, s?.year_level].filter(Boolean).join(' - ') || s?.department || 'N/A';

// Staff-only lookup, but the term still feeds a PostgREST or() string, so strip
// the characters that would break its comma/paren-delimited grammar.
const sanitizeTerm = (term: string) => term.replace(/[,()*]/g, ' ').trim();

const AddFacilitatorModal = ({
    existingIds, defaultYear, isSaving, onClose, onAdd
}: {
    existingIds: Set<string>;
    defaultYear: string;
    isSaving: boolean;
    onClose: () => void;
    onAdd: (studentId: string, peerYear: string) => void;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState<any>(null);
    const [year, setYear] = useState(defaultYear);

    const term = sanitizeTerm(searchTerm);
    const { data: results = [], isFetching } = useQuery({
        queryKey: ['facilitator-student-search', term],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('student_id, first_name, middle_name, last_name, suffix, course, year_level, department')
                .eq('is_archived', false)
                .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id.ilike.%${term}%`)
                .limit(8);
            if (error) throw error;
            return data || [];
        },
        enabled: term.length >= 2
    });

    const available = results.filter((s: any) => !existingIds.has(s.student_id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent care-modal-overlay">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-600" /> Add Peer Facilitator
                    </h3>
                    <Button variant="ghost" size="sm" onClick={onClose}><XCircle size={20} /></Button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {selected ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">{fullName(selected)}</p>
                                <p className="text-xs text-slate-500">{selected.student_id} · {courseYear(selected)}</p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>Change</Button>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="facilitator-add-search" className="block text-xs font-bold text-gray-700 mb-1">Find student</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="facilitator-add-search"
                                    type="text"
                                    autoFocus
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by name or student ID..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
                                {term.length < 2 ? (
                                    <p className="px-3 py-4 text-center text-xs text-slate-400">Type at least 2 characters to search.</p>
                                ) : isFetching ? (
                                    <p className="px-3 py-4 text-center text-xs text-slate-400">Searching...</p>
                                ) : available.length === 0 ? (
                                    <p className="px-3 py-4 text-center text-xs text-slate-400">No matching students (already-active ones are hidden).</p>
                                ) : (
                                    available.map((s: any) => (
                                        <button
                                            type="button"
                                            key={s.student_id}
                                            onClick={() => setSelected(s)}
                                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors"
                                        >
                                            <p className="text-sm font-bold text-slate-900">{fullName(s)}</p>
                                            <p className="text-xs text-slate-500">{s.student_id} · {courseYear(s)}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="facilitator-add-year" className="block text-xs font-bold text-gray-700 mb-1">Peer year</label>
                        <input
                            id="facilitator-add-year"
                            type="text"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            placeholder="e.g., 2025"
                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">A label for which year they served — it does not limit their access.</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button
                        variant="primary"
                        leftIcon={<UserPlus size={16} />}
                        isLoading={isSaving}
                        disabled={!selected || !year.trim()}
                        onClick={() => selected && year.trim() && onAdd(selected.student_id, year.trim())}
                    >
                        Add to Active
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default function CareStaffActiveFacilitatorsTable({ functions, refreshSignal = 0 }: CareStaffActiveFacilitatorsTableProps) {
    const queryClient = useQueryClient();
    const [sourceFilter, setSourceFilter] = useState<'all' | 'application' | 'manual'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    const { data: settings } = useQuery({
        queryKey: [SETTINGS_KEY, refreshSignal],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_settings')
                .select('*')
                .eq('id', 1)
                .maybeSingle();
            if (error) throw error;
            return data;
        }
    });
    const timeInEnabled = settings?.time_in_enabled ?? true;
    const defaultYear = settings?.school_year || '';

    const { data: facilitators = [], isLoading } = useQuery({
        queryKey: [ROSTER_KEY, refreshSignal],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitators')
                .select(`
                    id, student_id, peer_year, source, created_at,
                    students:student_id ( first_name, middle_name, last_name, suffix, course, year_level, department )
                `)
                .is('archived_at', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const existingIds = new Set(facilitators.map((f: any) => f.student_id));

    const toggleTimeInMutation = useMutation({
        mutationFn: async (next: boolean) => {
            const { error } = await supabase
                .from('peer_facilitator_settings')
                .update({ time_in_enabled: next })
                .eq('id', 1);
            if (error) throw error;
        },
        onSuccess: (_data, next) => {
            queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] });
            functions.showToast(next ? 'Hours logging enabled for facilitators.' : 'Hours logging paused.', 'success');
        },
        onError: () => functions.showToast('Failed to update hours logging.', 'error')
    });

    const addMutation = useMutation({
        mutationFn: async ({ studentId, peerYear }: { studentId: string; peerYear: string }) => {
            const { data: userData } = await supabase.auth.getUser();
            // Upsert (not insert) so re-adding a previously archived student
            // reactivates their existing row instead of hitting the unique index.
            const { error } = await supabase
                .from('peer_facilitators')
                .upsert({ student_id: studentId, peer_year: peerYear, source: 'manual', added_by: userData.user?.id ?? null, archived_at: null }, { onConflict: 'student_id' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ROSTER_KEY] });
            functions.showToast('Added to active facilitators.', 'success');
            setShowAdd(false);
        },
        onError: () => functions.showToast('Failed to add facilitator.', 'error')
    });

    const archiveMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('peer_facilitators')
                .update({ archived_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ROSTER_KEY] });
            functions.showToast('Facilitator archived.', 'success');
            setPendingArchiveId(null);
        },
        onError: () => functions.showToast('Failed to archive facilitator.', 'error')
    });

    const filtered = facilitators.filter((f: any) => {
        const matchesSource = sourceFilter === 'all' || f.source === sourceFilter;
        const name = fullName(f.students).toLowerCase();
        const q = searchQuery.toLowerCase();
        const matchesSearch = name.includes(q) || String(f.student_id).toLowerCase().includes(q);
        return matchesSource && matchesSearch;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / ACTIVE_PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedFacilitators = filtered.slice((safePage - 1) * ACTIVE_PAGE_SIZE, safePage * ACTIVE_PAGE_SIZE);

    const pendingArchive = facilitators.find((f: any) => f.id === pendingArchiveId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Student hours logging</span>
                    <button
                        type="button"
                        onClick={() => toggleTimeInMutation.mutate(!timeInEnabled)}
                        disabled={toggleTimeInMutation.isPending}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${timeInEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span className={`h-2 w-2 rounded-full ${timeInEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {timeInEnabled ? 'Enabled' : 'Paused'}
                    </button>
                </div>
                <Button variant="primary" leftIcon={<UserPlus size={16} />} onClick={() => setShowAdd(true)}>
                    Add Facilitator
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {([['all', 'All'], ['application', 'Applied'], ['manual', 'Added by staff']] as const).map(([value, label]) => (
                        <button
                            type="button"
                            key={value}
                            onClick={() => { setSourceFilter(value); setPage(1); }}
                            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${sourceFilter === value
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
                            <tr>
                                <th className="px-6 py-4 font-bold">Facilitator</th>
                                <th className="px-6 py-4 font-bold">Course &amp; Year</th>
                                <th className="px-6 py-4 font-bold">Peer Year</th>
                                <th className="px-6 py-4 font-bold">Source</th>
                                <th className="px-6 py-4 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading facilitators...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Users className="h-6 w-6 text-slate-300" />
                                        No active facilitators yet.
                                    </div>
                                </td></tr>
                            ) : (
                                pagedFacilitators.map((f: any) => (
                                    <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{fullName(f.students)}</div>
                                            <div className="text-xs text-gray-500">{f.student_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{courseYear(f.students)}</td>
                                        <td className="px-6 py-4 text-gray-600">{f.peer_year || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${f.source === 'manual'
                                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                {f.source === 'manual' ? 'Added by staff' : 'Applied'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setPendingArchiveId(f.id)}
                                                title="Archive facilitator"
                                                aria-label="Archive facilitator"
                                                className="inline-flex items-center justify-center rounded-lg p-2 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
                                            >
                                                <Archive size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <PaginationControls
                        page={safePage}
                        pageSize={ACTIVE_PAGE_SIZE}
                        total={filtered.length}
                        onPageChange={setPage}
                    />
                )}
            </Card>

            {showAdd && createPortal(
                <AddFacilitatorModal
                    existingIds={existingIds}
                    defaultYear={defaultYear}
                    isSaving={addMutation.isPending}
                    onClose={() => setShowAdd(false)}
                    onAdd={(studentId, peerYear) => addMutation.mutate({ studentId, peerYear })}
                />,
                document.body
            )}

            {pendingArchive && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent care-modal-overlay">
                    <Card className="shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center flex-shrink-0"><Archive size={22} /></div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Archive Facilitator</h3>
                                <p className="text-sm text-gray-500">They come off the active roster and hours logging pauses. You can restore them anytime by adding or re-approving them.</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-6">
                            <p className="text-sm font-bold text-slate-800">{fullName((pendingArchive as any).students)}</p>
                            <p className="text-xs text-slate-500 mt-1">Nothing is deleted — the record is kept.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setPendingArchiveId(null)} disabled={archiveMutation.isPending}>Cancel</Button>
                            <Button variant="primary" className="flex-1" leftIcon={<Archive size={14} />} isLoading={archiveMutation.isPending} onClick={() => archiveMutation.mutate((pendingArchive as any).id)}>
                                Archive
                            </Button>
                        </div>
                    </Card>
                </div>,
                document.body
            )}
        </div>
    );
}
