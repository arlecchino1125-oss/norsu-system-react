import { useState, useEffect, useRef, useMemo } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { formatDate, formatDateTime, generateExportFilename } from '../../../../../utils/formatters';
import type { CareStaffDashboardFunctions } from '../../../types';
import PaginationControls from '../../../../../components/PaginationControls';
import { Button } from '../../../../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/Card';
import { useQuery } from '@tanstack/react-query';

export interface CareStaffFeedbackPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

export const FEEDBACK_PAGE_SIZE = 12;
const EVENT_FEEDBACK_COLUMNS = [
    'id',
    'event_id',
    'student_id',
    'student_name',
    'sex',
    'college',
    'date_of_activity',
    'rating',
    'feedback',
    'q1_score',
    'q2_score',
    'q3_score',
    'q4_score',
    'q5_score',
    'q6_score',
    'q7_score',
    'open_best',
    'open_suggestions',
    'open_comments',
    'submitted_at',
    'events(title, event_date, event_time, end_time)'
].join(', ');
const EVENT_FEEDBACK_FILTERED_COLUMNS = EVENT_FEEDBACK_COLUMNS.replace('events(title, event_date, event_time, end_time)', 'events!inner(title, event_date, event_time, end_time)');
// Dummy setter to comply with existing destructuring requirements (shared, since all are no-ops)
const noop = () => { };

const CRITERIA_LABELS = [
    'Relevance of the activity to the needs/problems of the clientele',
    'Quality of the activity',
    'Timeliness',
    'Management of the activity',
    'Overall organization of the activity',
    'Overall assessment of the activity',
    'Skills/competence of the facilitator/s'
];

const CC_QUESTIONS = [
    {
        key: 'cc1',
        question: "CC1. Which of the following best describes your awareness of a CC?",
        options: {
            1: "1. I know what a CC is and I saw this office's CC.",
            2: "2. I know what a CC is but I did NOT see this office's CC.",
            3: "3. I learned of the CC only when I saw this office's CC.",
            4: '4. I do not know what a CC is and I did not see one in this office.',
        } as Record<number, string>
    },
    {
        key: 'cc2',
        question: 'CC2. If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was ...?',
        options: {
            1: '1. Easy to see',
            2: '2. Somewhat easy to see',
            3: '3. Difficult to see',
            4: '4. Not visible at all',
            5: '5. N/A',
        } as Record<number, string>
    },
    {
        key: 'cc3',
        question: 'CC3. If aware of CC (answered 1-3 in CC1), how much did the CC help you in your transaction?',
        options: {
            1: '1. Helped very much',
            2: '2. Somewhat helped',
            3: '3. Did not help',
            4: '4. N/A',
        } as Record<number, string>
    }
];

const getCcAnswerText = (item: any, value: any) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 'No response';
    return item.options[parsed] || String(value);
};

const getEventName = (row: any) => row?.events?.title || 'Event';

const getEventRating = (row: any) => {
    const direct = Number(row?.rating);
    if (Number.isFinite(direct) && direct >= 1 && direct <= 5) return direct;
    const scores = [1, 2, 3, 4, 5, 6, 7]
        .map(i => Number(row?.[`q${i}_score`]))
        .filter(v => Number.isFinite(v) && v >= 1 && v <= 5);
    if (scores.length === 0) return 0;
    return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
};

const computeStats = (list: any[]) => {
    if (!list || list.length === 0) return { avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] };
    const total = list.length;
    const sum = list.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
    const dist = [0, 0, 0, 0, 0];
    list.forEach(r => {
        const rounded = Math.round(Number(r.rating));
        if (rounded >= 1 && rounded <= 5) dist[rounded - 1]++;
    });
    return { avg: Number((sum / total).toFixed(1)), total, distribution: dist };
};

const GENERAL_FEEDBACK_COLUMNS = [
    'id',
    'student_id',
    'student_name',
    'client_type',
    'sex',
    'age',
    'region',
    'service_availed',
    'cc1',
    'cc2',
    'cc3',
    'sqd0',
    'sqd1',
    'sqd2',
    'sqd3',
    'sqd4',
    'sqd5',
    'sqd6',
    'sqd7',
    'sqd8',
    'suggestions',
    'email',
    'created_at'
].join(', ');

export function useCareStaffFeedback({ functions }: any) {
    const [currentView, setCurrentView] = useState('General');
    const [eventFilter, setEventFilter] = useState('All Events');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewingEval, setViewingEval] = useState<any>(null);
    const [viewingCSM, setViewingCSM] = useState<any>(null);
    const printRef = useRef(null);

    // ponytail: cache event names for filtering dropdown
    const { data: eventNames = [] } = useQuery({
        queryKey: ['feedback-event-names'],
        queryFn: async () => {
            const { data } = await supabase
                .from('events')
                .select('title')
                .order('title', { ascending: true });
            return [...(new Set((data || []).flatMap((row: any) => row.title ? [row.title] : [])))];
        },
        staleTime: 5 * 60 * 1000
    });

    const isEventsView = currentView === 'Events';
    const from = (currentPage - 1) * FEEDBACK_PAGE_SIZE;
    const to = from + FEEDBACK_PAGE_SIZE - 1;

    // ponytail: cache feedback list by view parameters
    const { data: queryResult, isLoading: loading, refetch: fetchData } = useQuery({
        queryKey: ['care-staff-feedback', currentView, eventFilter, currentPage],
        queryFn: async () => {
            if (isEventsView) {
                let query = supabase
                    .from('event_feedback')
                    .select(eventFilter === 'All Events' ? EVENT_FEEDBACK_COLUMNS : EVENT_FEEDBACK_FILTERED_COLUMNS, { count: 'exact' });
                if (eventFilter !== 'All Events') {
                    query = query.eq('events.title', eventFilter);
                }
                const { data, error, count } = await query
                    .order('submitted_at', { ascending: false })
                    .range(from, to);
                if (error) throw error;
                const eventRows = (data || []) as any[];
                const items = eventRows.map(d => ({
                    id: d.id,
                    student: d.student_name,
                    rating: getEventRating(d),
                    comment: d.open_comments || d.feedback || d.comments || '',
                    date: d.submitted_at,
                    context: getEventName(d),
                    hasEvaluation: !!(d.q1_score || d.q2_score)
                }));
                return { items, count: count || 0, rawEventData: eventRows, rawGeneralData: [] };
            } else {
                const { data, error, count } = await supabase
                    .from('general_feedback')
                    .select(GENERAL_FEEDBACK_COLUMNS, { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range(from, to);
                if (error) throw error;
                const generalRows = (data || []) as any[];
                const items = generalRows.map(d => {
                    const sqdScores = [d.sqd0, d.sqd1, d.sqd2, d.sqd3, d.sqd4, d.sqd5, d.sqd6, d.sqd7, d.sqd8].filter(v => v != null && v > 0);
                    const avg = sqdScores.length > 0 ? Math.round(sqdScores.reduce((a, b) => a + b, 0) / sqdScores.length) : 0;
                    return {
                        id: d.id,
                        student: d.student_name,
                        rating: avg,
                        comment: d.suggestions,
                        date: d.created_at,
                        context: d.service_availed || 'General',
                        hasEvaluation: false
                    };
                });
                return { items, count: count || 0, rawEventData: [], rawGeneralData: generalRows };
            }
        },
        staleTime: 60000
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [currentView, eventFilter]);

    const items = useMemo(() => queryResult?.items || [], [queryResult]);
    const feedbackTotal = queryResult?.count || 0;
    const rawEventData = queryResult?.rawEventData || [];
    const rawGeneralData = queryResult?.rawGeneralData || [];

    const stats = useMemo(() => computeStats(items), [items]);

    const handleViewEvaluation = (itemId: any) => {
        const raw = rawEventData.find(d => d.id === itemId);
        if (raw) setViewingEval(raw);
    };

    const eventOptions = ['All Events', ...eventNames];
    const filteredEventRows = (rawEventData || []).filter(d => eventFilter === 'All Events' || getEventName(d) === eventFilter);

    const eventCriteriaStats = CRITERIA_LABELS.map((label, idx) => {
        const key = `q${idx + 1}_score`;
        const scores = filteredEventRows.flatMap(row => {
            const score = Number(row?.[key]);
            return Number.isFinite(score) && score >= 1 && score <= 5 ? [score] : [];
        });
        const mean = scores.length > 0
            ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
            : null;
        return { label, mean, responses: scores.length };
    });

    const eventOpenText = {
        best: filteredEventRows.filter(r => r.open_best && String(r.open_best).trim()),
        suggestions: filteredEventRows.filter(r => r.open_suggestions && String(r.open_suggestions).trim()),
        comments: filteredEventRows.filter(r => (r.open_comments || r.feedback || r.comments) && String(r.open_comments || r.feedback || r.comments).trim())
    };

    const handlePrintEval = () => {
        if (!printRef.current) return;
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) return;
        const printDocument = printWindow.document;
        const style = printDocument.createElement('style');
        style.textContent = `
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; font-size: 14px; }
            .eval-header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
            .eval-header h1 { font-size: 18px; font-weight: 800; color: #1e40af; margin: 0; }
            .eval-header p { font-size: 11px; color: #6b7280; margin: 4px 0 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .info-item label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; margin-bottom: 2px; }
            .info-item p { font-size: 13px; font-weight: 600; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background: #f9fafb; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #6b7280; }
            .score { text-align: center; font-weight: 700; font-size: 14px; }
            .open-section { margin-bottom: 16px; }
            .open-section label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
            .open-section p { background: #f0f9ff; padding: 8px 12px; border-radius: 6px; font-size: 12px; }
            @media print { body { padding: 20px; } }
        `;
        printDocument.title = "Participant's Evaluation Form";
        printDocument.head.append(style);
        printDocument.body.append(printRef.current.cloneNode(true));
        printDocument.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    };

    return {
        currentView,
        setCurrentView,
        eventFilter,
        setEventFilter,
        currentPage,
        setCurrentPage,
        feedbackTotal,
        setFeedbackTotal: noop,
        items,
        setItems: noop,
        rawEventData,
        setRawEventData: noop,
        eventNames,
        setEventNames: noop,
        loading,
        setLoading: noop,
        stats,
        setStats: noop,
        viewingEval,
        setViewingEval,
        rawGeneralData,
        setRawGeneralData: noop,
        viewingCSM,
        setViewingCSM,
        printRef,
        criteriaLabels: CRITERIA_LABELS,
        ccQuestions: CC_QUESTIONS,
        getCcAnswerText,
        getEventName,
        getEventRating,
        computeStats,
        fetchData,
        handleViewEvaluation,
        eventOptions,
        filteredEventRows,
        eventCriteriaStats,
        eventOpenText,
        handlePrintEval
    };
}
