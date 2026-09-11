import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    ArrowUpDown,
    Calendar,
    ChevronDown,
    ClipboardCheck,
    Clock,
    FileSpreadsheet,
    FileText,
    Filter,
    MapPin,
    Search,
    Users
} from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import PaginationControls from '../../../../../components/PaginationControls';
import { formatDate, toTitleCase } from '../../../../../utils/formatters';
import {
    exportPeerEventEvaluationExcel,
    exportPeerEventEvaluationPdf
} from '../peerEventEvaluationExport';
import type { CareStaffDashboardFunctions } from '../../../types';

interface CareStaffPeerEvaluationsTabProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
    refreshSignal?: number;
}

interface PeerEventItem {
    id: number;
    title: string;
    description: string | null;
    event_date: string | null;
    event_time: string | null;
    end_time: string | null;
    location: string | null;
    audience_type: string;
    attendance_count: number;
    evaluation_form: {
        id: number;
        title: string;
        description: string | null;
        is_active: boolean;
        created_at: string;
        response_count: number;
    } | null;
}

const RESPONDENTS_PER_PAGE = 10;
const sortHeaderClass =
    'w-full cursor-pointer px-6 py-3.5 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500 font-bold text-[11px] text-slate-500 uppercase tracking-wider flex items-center justify-between';

export default function CareStaffPeerEvaluationsTab({
    functions,
    refreshSignal = 0
}: CareStaffPeerEvaluationsTabProps) {
    const queryClient = useQueryClient();
    const { showToast } = functions;

    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [viewingStudent, setViewingStudent] = useState<any | null>(null);
    const [search, setSearch] = useState('');
    const [courseFilter, setCourseFilter] = useState('All');
    const [page, setPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'date'; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc'
    });
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const tableRef = useRef<HTMLDivElement>(null);

    // ── 1. Fetch Peer Facilitator Events ──
    const {
        data: peerEvents = [],
        isLoading: isLoadingEvents,
        refetch: refetchPeerEvents
    } = useQuery<PeerEventItem[]>({
        queryKey: ['peer-facilitator-events', refreshSignal],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select(`
                    id,
                    title,
                    description,
                    event_date,
                    event_time,
                    end_time,
                    location,
                    audience_type,
                    event_attendance(count),
                    event_evaluation_forms(
                        id,
                        title,
                        description,
                        is_active,
                        created_at,
                        event_evaluation_responses(count)
                    )
                `)
                .eq('audience_type', 'peer_facilitators')
                .order('event_date', { ascending: false });

            if (error) throw error;

            return (data ?? []).map((row: any) => {
                const forms = row.event_evaluation_forms ?? [];
                const latestForm = forms.length > 0 ? forms[0] : null;
                return {
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    event_date: row.event_date,
                    event_time: row.event_time,
                    end_time: row.end_time,
                    location: row.location,
                    audience_type: row.audience_type,
                    attendance_count: row.event_attendance?.[0]?.count ?? 0,
                    evaluation_form: latestForm
                        ? {
                              id: latestForm.id,
                              title: latestForm.title,
                              description: latestForm.description,
                              is_active: Boolean(latestForm.is_active),
                              created_at: latestForm.created_at,
                              response_count: latestForm.event_evaluation_responses?.[0]?.count ?? 0
                          }
                        : null
                };
            });
        }
    });

    const activeSelectedEvent = useMemo(
        () => peerEvents.find(e => e.id === selectedEventId) || null,
        [peerEvents, selectedEventId]
    );

    // ── 2. Fetch Selected Event's Evaluation Results ──
    const selectedFormId = activeSelectedEvent?.evaluation_form?.id ?? null;

    const {
        data: evaluationDetails,
        isLoading: isLoadingDetails,
        refetch: refetchEvaluationDetails
    } = useQuery({
        queryKey: ['peer-event-evaluation-details', selectedFormId],
        enabled: Boolean(selectedFormId),
        queryFn: async () => {
            if (!selectedFormId) return null;

            const [questionsRes, responsesRes] = await Promise.all([
                supabase
                    .from('event_evaluation_questions')
                    .select('id, form_id, question_text, question_type, scale_max, order_index')
                    .eq('form_id', selectedFormId)
                    .order('order_index'),
                supabase
                    .from('event_evaluation_responses')
                    .select(`
                        id,
                        student_id,
                        student_name,
                        department,
                        course,
                        year_level,
                        submitted_at,
                        students (
                            student_id,
                            first_name,
                            last_name,
                            department,
                            course,
                            year_level,
                            sex,
                            gender_identity
                        ),
                        event_evaluation_answers (
                            response_id,
                            question_id,
                            answer_value,
                            answer_text
                        )
                    `)
                    .eq('form_id', selectedFormId)
                    .order('submitted_at', { ascending: false })
                    .limit(5000)
            ]);

            if (questionsRes.error) throw questionsRes.error;
            if (responsesRes.error) throw responsesRes.error;

            const questions = questionsRes.data ?? [];
            const rawResponses = (responsesRes.data ?? []) as any[];

            const responses = rawResponses.map(r => ({
                id: r.id,
                student_id: r.student_id,
                student_name:
                    r.student_name ||
                    [r.students?.first_name, r.students?.last_name].filter(Boolean).join(' ') ||
                    'Student',
                department: r.department || r.students?.department || null,
                course: r.course || r.students?.course || null,
                year_level: r.year_level || r.students?.year_level || null,
                submitted_at: r.submitted_at,
                students: r.students || null
            }));

            const answers = rawResponses.flatMap(r =>
                ((r.event_evaluation_answers ?? []) as any[]).map((a: any) => ({
                    response_id: r.id,
                    question_id: a.question_id,
                    answer_value: a.answer_value,
                    answer_text: a.answer_text
                }))
            );

            return { questions, responses, answers };
        }
    });

    const questions = evaluationDetails?.questions ?? [];
    const responses = evaluationDetails?.responses ?? [];
    const answers = evaluationDetails?.answers ?? [];

    const answersByResponse = useMemo(() => {
        const map = new Map<number, Map<number, any>>();
        for (const ans of answers) {
            let respMap = map.get(ans.response_id);
            if (!respMap) {
                respMap = new Map();
                map.set(ans.response_id, respMap);
            }
            respMap.set(ans.question_id, ans);
        }
        return map;
    }, [answers]);

    // ── Filter and Sort Respondents ──
    const courseOptions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const r of responses) {
            const course = r.course || 'Unspecified Course';
            counts.set(course, (counts.get(course) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [responses]);

    const filteredRespondents = useMemo(() => {
        const term = search.trim().toLowerCase();
        return responses.filter(r => {
            if (courseFilter !== 'All' && (r.course || 'Unspecified Course') !== courseFilter) {
                return false;
            }
            if (!term) return true;
            return (
                `${r.student_name ?? ''} ${r.student_id ?? ''} ${r.course ?? ''}`
                    .toLowerCase()
                    .includes(term)
            );
        });
    }, [responses, search, courseFilter]);

    const sortedRespondents = useMemo(() => {
        const list = [...filteredRespondents];
        list.sort((a, b) => {
            if (sortConfig.key === 'name') {
                const nameA = a.student_name || '';
                const nameB = b.student_name || '';
                return sortConfig.direction === 'asc'
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            }
            const timeA = new Date(a.submitted_at).getTime();
            const timeB = new Date(b.submitted_at).getTime();
            return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        });
        return list;
    }, [filteredRespondents, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(sortedRespondents.length / RESPONDENTS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * RESPONDENTS_PER_PAGE;
    const visibleRespondents = sortedRespondents.slice(pageStart, pageStart + RESPONDENTS_PER_PAGE);

    const handleSort = (key: 'name' | 'date') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // ── Export Handlers ──
    const handleExportExcel = async () => {
        if (!activeSelectedEvent || !activeSelectedEvent.evaluation_form) return;
        setIsExportingExcel(true);
        try {
            await exportPeerEventEvaluationExcel({
                eventTitle: activeSelectedEvent.title,
                eventDate: activeSelectedEvent.event_date,
                formTitle: activeSelectedEvent.evaluation_form.title,
                questions,
                responses,
                answers
            });
            showToast('Excel report generated successfully.', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to export Excel report.', 'error');
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        if (!activeSelectedEvent || !activeSelectedEvent.evaluation_form) return;
        setIsExportingPdf(true);
        try {
            await exportPeerEventEvaluationPdf({
                eventTitle: activeSelectedEvent.title,
                eventDate: activeSelectedEvent.event_date,
                formTitle: activeSelectedEvent.evaluation_form.title,
                questions,
                responses,
                answers
            });
            showToast('PDF report generated successfully.', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to export PDF report.', 'error');
        } finally {
            setIsExportingPdf(false);
        }
    };

    // ── VIEW 1: SINGLE RESPONDENT DETAIL ──
    if (activeSelectedEvent && viewingStudent) {
        const studentAnswers = answersByResponse.get(viewingStudent.id) || new Map();
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900">
                                {viewingStudent.student_name}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                                Peer Facilitator
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Submitted {new Date(viewingStudent.submitted_at).toLocaleString()}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setViewingStudent(null)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-purple-300 hover:text-purple-700 shadow-2xs transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={13} /> Back to respondents
                    </button>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 px-6 py-3.5 border-b border-slate-100 text-xs shrink-0 bg-white">
                    <div>
                        <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Student ID</dt>
                        <dd className="font-mono font-bold text-slate-900 mt-0.5">{viewingStudent.student_id || '—'}</dd>
                    </div>
                    <div>
                        <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">College</dt>
                        <dd className="font-bold text-slate-900 mt-0.5">{viewingStudent.department || '—'}</dd>
                    </div>
                    <div>
                        <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Course</dt>
                        <dd className="font-bold text-slate-900 mt-0.5 truncate" title={viewingStudent.course}>
                            {viewingStudent.course || '—'}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Year Level</dt>
                        <dd className="font-bold text-purple-700 uppercase mt-0.5">{viewingStudent.year_level || '—'}</dd>
                    </div>
                    <div>
                        <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Sex Assigned</dt>
                        <dd className="font-bold text-slate-900 mt-0.5">{viewingStudent.students?.sex || '—'}</dd>
                    </div>
                    <div>
                        <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Gender Identity</dt>
                        <dd className="font-bold text-purple-700 mt-0.5">{viewingStudent.students?.gender_identity || '—'}</dd>
                    </div>
                </dl>

                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {questions.map((q, idx) => {
                        const answerRecord = studentAnswers.get(q.id);
                        const val = answerRecord?.answer_value ?? answerRecord?.answer_text ?? '';
                        const isScale = q.question_type !== 'text' && q.question_type !== 'open_ended';

                        return (
                            <div key={q.id} className="rounded-xl border border-slate-200/80 p-4 bg-white hover:border-purple-200 transition-colors">
                                <p className="font-bold text-slate-800 text-xs leading-relaxed">
                                    <span className="mr-2 text-slate-400 font-semibold">{idx + 1}.</span>
                                    {q.question_text}
                                </p>
                                {val === '' ? (
                                    <p className="mt-1.5 text-xs italic text-slate-400">Not answered</p>
                                ) : isScale ? (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-xs">
                                            Score: {val} / {q.scale_max ?? 5}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        {val}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── VIEW 2: SELECTED EVENT RESPONDENTS TABLE & EXPORT ──
    if (activeSelectedEvent) {
        const form = activeSelectedEvent.evaluation_form;

        return (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
                {/* Event Header & Controls */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs shrink-0">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedEventId(null);
                                    setViewingStudent(null);
                                    setSearch('');
                                    setCourseFilter('All');
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-1 cursor-pointer"
                            >
                                <ArrowLeft size={13} /> Back to Peer Events
                            </button>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h2 className="text-lg font-black text-slate-900">{activeSelectedEvent.title}</h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    Peer Facilitators Only
                                </span>
                                {form && (
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            form.is_active
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}
                                    >
                                        {form.is_active ? 'Evaluations Active' : 'Evaluations Inactive'}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                                <span className="inline-flex items-center gap-1">
                                    <Calendar size={13} className="text-slate-400" />
                                    {formatDate(activeSelectedEvent.event_date)}
                                </span>
                                {activeSelectedEvent.location && (
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin size={13} className="text-slate-400" />
                                        {activeSelectedEvent.location}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                    <Users size={13} className="text-purple-600" />
                                    <strong>{activeSelectedEvent.attendance_count}</strong> attended
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <ClipboardCheck size={13} className="text-emerald-600" />
                                    <strong>{responses.length}</strong> evaluations submitted
                                </span>
                            </div>
                        </div>

                        {/* Actions: Status Indicator & Export */}
                        <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto">
                            {form && (
                                <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${
                                        form.is_active
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${form.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                    <span>{form.is_active ? 'Evaluations Active' : 'Evaluations Inactive'}</span>
                                </span>
                            )}

                            <button
                                type="button"
                                onClick={handleExportExcel}
                                disabled={isExportingExcel || responses.length === 0}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                                <FileSpreadsheet size={14} className="text-emerald-600" />
                                <span>{isExportingExcel ? 'Exporting...' : 'Export Excel'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleExportPdf}
                                disabled={isExportingPdf || responses.length === 0}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                                <FileText size={14} className="text-purple-600" />
                                <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {!form ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <ClipboardCheck size={36} className="mx-auto text-slate-300 mb-3" />
                        <h3 className="text-sm font-bold text-slate-800">No Evaluation Form Attached</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            This peer event does not have an attached evaluation form yet. You can attach or build an evaluation form in the Events tab.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={search}
                                        onChange={e => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search name or ID"
                                        aria-label="Search peer respondents"
                                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
                                    <Filter size={13} className="text-purple-600 mr-2 shrink-0" />
                                    <select
                                        aria-label="Filter respondents by course"
                                        value={courseFilter}
                                        onChange={e => {
                                            setCourseFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="appearance-none pr-6 text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer max-w-[15rem] truncate"
                                    >
                                        <option value="All">All Courses</option>
                                        {courseOptions.map(([course, count]) => (
                                            <option key={course} value={course}>
                                                {course} ({count})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 shrink-0">
                                <Users size={14} className="text-purple-600" />
                                <span>
                                    {filteredRespondents.length === responses.length
                                        ? `${filteredRespondents.length} students`
                                        : `${filteredRespondents.length} of ${responses.length} students`}
                                </span>
                            </div>
                        </div>

                        {/* Paginated Table matching Analytics Page */}
                        <div
                            ref={tableRef}
                            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0"
                        >
                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                            <th scope="col" className="p-0">
                                                <button
                                                    type="button"
                                                    className={sortHeaderClass}
                                                    onClick={() => handleSort('name')}
                                                >
                                                    <span>Student Name</span>
                                                    <ArrowUpDown
                                                        size={11}
                                                        className={`ml-1 ${sortConfig.key === 'name' ? 'text-purple-600 font-bold' : 'text-slate-400'}`}
                                                    />
                                                </button>
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                                Course &amp; Year
                                            </th>
                                            <th scope="col" className="p-0">
                                                <button
                                                    type="button"
                                                    className={sortHeaderClass}
                                                    onClick={() => handleSort('date')}
                                                >
                                                    <span>Date Submitted</span>
                                                    <ArrowUpDown
                                                        size={11}
                                                        className={`ml-1 ${sortConfig.key === 'date' ? 'text-purple-600 font-bold' : 'text-slate-400'}`}
                                                    />
                                                </button>
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoadingDetails ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-16 text-center text-slate-400 font-medium">
                                                    Loading evaluation responses...
                                                </td>
                                            </tr>
                                        ) : visibleRespondents.map(sub => (
                                            <tr
                                                key={sub.id}
                                                onClick={() => setViewingStudent(sub)}
                                                className="cursor-pointer group transition-colors hover:bg-purple-50/40"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                                        {sub.student_name}
                                                    </div>
                                                    <div className="font-mono text-[11px] text-slate-400 mt-0.5 font-medium">
                                                        {sub.student_id || 'ID Unknown'}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                                                            {sub.students?.sex || 'Sex —'}
                                                        </span>
                                                        {sub.students?.gender_identity && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-semibold text-purple-700 border border-purple-100/60">
                                                                {sub.students?.gender_identity}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="max-w-[20rem] px-6 py-4">
                                                    <div className="font-medium text-slate-800 truncate" title={sub.course || undefined}>
                                                        {sub.course || 'Unknown Course'}
                                                    </div>
                                                    <div className="text-[10.5px] font-bold text-purple-700 mt-0.5 uppercase tracking-wider">
                                                        {sub.year_level || 'YEAR NOT SET'}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="font-semibold text-slate-800">
                                                        {new Date(sub.submitted_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                                        {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="inline-flex items-center gap-1 text-purple-600 font-bold text-xs group-hover:underline">
                                                        View answers <span aria-hidden="true">&rarr;</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {!isLoadingDetails && filteredRespondents.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-16 text-center text-slate-400 font-medium">
                                                    No peer responses found matching your search or filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {filteredRespondents.length > 0 && (
                                <div className="border-t border-slate-100 p-2 shrink-0 bg-white">
                                    <PaginationControls
                                        page={currentPage}
                                        pageSize={RESPONDENTS_PER_PAGE}
                                        total={filteredRespondents.length}
                                        onPageChange={next => {
                                            setPage(next);
                                            tableRef.current?.scrollIntoView({ block: 'start' });
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ── VIEW 3: PEER EVENTS CARDS LIST ──
    return (
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div>
                    <h2 className="text-base font-bold text-slate-900">Peer Facilitator Event Evaluations</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Select an event card to view attendees, evaluate peer responses, toggle form availability, and export reports.
                    </p>
                </div>
            </div>

            {isLoadingEvents ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400 font-medium">
                    Loading peer facilitator events...
                </div>
            ) : peerEvents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <ClipboardCheck size={38} className="mx-auto text-slate-300 mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">No Peer Events Found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        To create a peer evaluation, go to the <strong>Events</strong> page, create an event, and select <strong>Peer Facilitators</strong> as the audience choice.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {peerEvents.map(event => {
                        const form = event.evaluation_form;
                        return (
                            <div
                                key={event.id}
                                className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            Peer Facilitators Only
                                        </span>
                                        {form && (
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    form.is_active
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}
                                            >
                                                {form.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-2">
                                        {event.title}
                                    </h3>

                                    {event.description && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                            {event.description}
                                        </p>
                                    )}

                                    <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={13} className="text-slate-400" />
                                            <span>{formatDate(event.event_date)}</span>
                                        </div>
                                        {event.location && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={13} className="text-slate-400" />
                                                <span className="truncate">{event.location}</span>
                                            </div>
                                        )}
                                    </div>

                                    {form ? (
                                        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 bg-purple-50/70 border border-purple-100 rounded-lg px-2.5 py-1">
                                            <span className="shrink-0">📝</span>
                                            <span className="truncate">Form: {form.title}</span>
                                        </div>
                                    ) : (
                                        <div className="mt-3 text-[11px] italic text-slate-400">
                                            No evaluation form linked yet
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-slate-600 font-semibold" title="Attendance">
                                            👥 {event.attendance_count}
                                        </span>
                                        <span className="text-emerald-600 font-bold" title="Evaluations Submitted">
                                            📝 {form?.response_count ?? 0}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedEventId(event.id)}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors cursor-pointer"
                                    >
                                        <span>View details</span>
                                        <span aria-hidden="true">&rarr;</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
