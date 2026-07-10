import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { formatDate, formatDateTime, generateExportFilename } from '../../../../../utils/formatters';
import { createDeferredChannelCleanup } from '../../../../../lib/realtime';
import { supabase } from '../../../../../lib/supabase';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';
import { loadJsPdf } from '../../../../../lib/exportVendors';
import CalendarView from '../../../../../components/CalendarView';
import {
    Users, FileText, Clock, CheckCircle, Calendar,
    User, Eye, Send, Download, XCircle, RefreshCw
} from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import type { CareStaffDashboardFunctions } from '../../../types';
import {
    COUNSELING_STATUS,
    getCounselingScheduledDate,
    isCareStaffCounselingSchedulable,
    isCounselingAwaitingDept
} from '../../../../../utils/workflow';
import PaginationControls from '../../../../../components/PaginationControls';
import {
    applyCounselingTabFilter as applyTabFilter,
    fetchCounselingCounts,
    fetchCounselingListPage
} from '../counselingData';

export interface CareStaffCounselingPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToastMessage' | 'handleViewProfile'>;
    refreshSignal?: number;
}

export { COUNSELING_REQUESTS_PAGE_SIZE, COUNSELING_REQUEST_COLUMNS } from '../counselingData';

export function useCareStaffCounseling({ functions, refreshSignal = 0 }: any) {
    const { handleViewProfile, showToastMessage } = functions;
    const lastExternalRefreshSignalRef = useRef(refreshSignal);

    const sortCounselingByCreatedAt = (rows: any[]) =>
        [...rows].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const getCounselingStatusTone = (status: string) => {
        if (isCounselingAwaitingDept(status)) return 'bg-gray-100 text-gray-600';
        if (status === COUNSELING_STATUS.REJECTED) return 'bg-red-100 text-red-700';
        if (status === COUNSELING_STATUS.REFERRED) return 'bg-purple-100 text-purple-700';
        if (status === COUNSELING_STATUS.STAFF_SCHEDULED) return 'bg-indigo-100 text-indigo-700';
        if (status === COUNSELING_STATUS.SCHEDULED) return 'bg-blue-100 text-blue-700';
        if (status === COUNSELING_STATUS.COMPLETED) return 'bg-green-100 text-green-700';
        return 'bg-gray-100 text-gray-600';
    };

    const getCounselingStatusLabel = (status: string) => {
        if (isCounselingAwaitingDept(status)) return 'Pending Review';
        if (status === COUNSELING_STATUS.STAFF_SCHEDULED) return 'With CARE Staff';
        if (status === COUNSELING_STATUS.REFERRED) return 'Forwarded';
        return status;
    };

    // Data State
    const [counselingReqs, setCounselingReqs] = useState<any[]>([]);
    const [counselingTotal, setCounselingTotal] = useState(0);
    const [counselingCounts, setCounselingCounts] = useState<Record<string, number>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshTick, setRefreshTick] = useState(0);
    const [counselingTab, setCounselingTab] = useState<string>(COUNSELING_STATUS.REFERRED);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Modals & form state
    const [viewFormReq, setViewFormReq] = useState<any>(null);
    const [showCounselingFormModal, setShowCounselingFormModal] = useState<boolean>(false);
    const [formModalView, setFormModalView] = useState<string>('referral');

    const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
    const [scheduleData, setScheduleData] = useState<any>({ date: '', time: '', notes: '' });
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [isSchedulingSession, setIsSchedulingSession] = useState(false);

    const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
    const [completionForm, setCompletionForm] = useState<any>({ id: null, student_id: null, publicNotes: '', privateNotes: '' });
    const [isCompletingSession, setIsCompletingSession] = useState(false);

    const invokeManagedCareServicesFunction = async (body: any) => {
        return invokeEdgeFunction('manage-care-services', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your CARE Staff session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to manage CARE services.'
        });
    };

    const queueProcessEmailNotification = (payload: any, context: string) => {
        void sendTransactionalEmailNotification(payload).then((emailResult) => {
            if (emailResult.emailSent === false) {
                showToastMessage(`${context} Email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
            }
        });
    };

    const applyCounselingTabFilter = (query: any, tab = counselingTab) => applyTabFilter(query, tab);

    // List for the selected tab. Tab + page are in the key, so this legitimately
    // refetches on a tab/page change; refreshTick busts it on realtime writes.
    const { data: listData, isFetching: loading, refetch: refetchList } = useQuery({
        queryKey: ['care_staff_counseling_list', counselingTab, currentPage, refreshTick],
        queryFn: () => fetchCounselingListPage(counselingTab, currentPage),
        staleTime: 60000
    });

    // Tab/stat counts — keyed WITHOUT the tab or page, so clicking a tab (or
    // paging) never refetches them. They load once and stay cached until a
    // realtime write bumps refreshTick.
    const { data: countsData, refetch: refetchCounts } = useQuery({
        queryKey: ['care_staff_counseling_counts', refreshTick],
        queryFn: fetchCounselingCounts,
        staleTime: 60000
    });

    // Refreshing the page (manual button, mutations) must hit BOTH queries or the
    // badges go stale while the list updates.
    const refetchCounseling = useCallback(
        () => Promise.all([refetchList(), refetchCounts()]),
        [refetchList, refetchCounts]
    );

    useEffect(() => {
        if (listData) {
            setCounselingReqs(listData.reqs);
            setCounselingTotal(listData.total);
        }
        if (countsData) {
            setCounselingCounts(countsData);
        }
    }, [listData, countsData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [counselingTab]);

    useEffect(() => {
        return createDeferredChannelCleanup(
            () => supabase.channel('care_counseling_isolated')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests' }, () => {
                    setRefreshTick((tick) => tick + 1);
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );
    }, []);

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await refetchCounseling();
            showToastMessage('Counseling data refreshed.', 'success');
        } finally {
            setIsRefreshingData(false);
        }
    };

    useEffect(() => {
        if (refreshSignal === lastExternalRefreshSignalRef.current) return;
        lastExternalRefreshSignalRef.current = refreshSignal;
        void handleRefreshData();
    }, [refreshSignal]);

    // Handlers
    const handleScheduleSubmit = async (e: any) => {
        e.preventDefault();
        if (!selectedApp || isSchedulingSession) return;
        setIsSchedulingSession(true);

        try {
            const result = await invokeManagedCareServicesFunction({
                mode: 'schedule-counseling',
                requestId: selectedApp.id,
                date: scheduleData.date,
                time: scheduleData.time,
                notes: scheduleData.notes
            });

            void refetchCounseling();
            showToastMessage('Session Scheduled Successfully', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Session scheduled successfully.');
            setShowScheduleModal(false);
            setScheduleData({ date: '', time: '', notes: '' });
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSchedulingSession(false);
        }
    };

    const handleCompleteSession = async (e: any) => {
        e.preventDefault();
        if (isCompletingSession) return;
        setIsCompletingSession(true);
        try {
            const result = await invokeManagedCareServicesFunction({
                mode: 'complete-counseling',
                requestId: completionForm.id,
                publicNotes: completionForm.publicNotes,
                privateNotes: completionForm.privateNotes
            });

            void refetchCounseling();
            showToastMessage('Session marked as complete.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Session marked as complete.');
            setShowCompleteModal(false);
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsCompletingSession(false);
        }
    };

    const handleDownloadReferralForm = async (req: any) => {
        const jsPDF = await loadJsPdf();
        const doc = new jsPDF();
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentW = pageW - margin * 2;

        // --- HEADER ---
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text('RA 9299', margin, 14);
        doc.text('Republic of the Philippines', pageW / 2, 10, { align: 'center' });
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('NEGROS ORIENTAL STATE UNIVERSITY', pageW / 2, 16, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('NOPS (1907)    NOTS (1927)    EVSAT (1965)    CVPC (1983)', pageW / 2, 20, { align: 'center' });
        doc.text('Kagawasan Avenue, Dumaguete City, Negros Oriental, Philippines 6200', pageW / 2, 24, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Office of the Director, Counseling, Assessment, Resources, and Enhancement Center', pageW / 2, 32, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('COUNSELING REFERRAL FORM', pageW / 2, 42, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        let y = 54;

        // --- FORM FIELDS ---
        const drawField = (label: any, value: any, x: any, fieldW: any, yPos: any) => {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(label, x, yPos);
            const labelW = doc.getTextWidth(label) + 2;
            doc.setFont('helvetica', 'normal');
            doc.text(value || '', x + labelW, yPos);
            doc.setDrawColor(0, 0, 0);
            doc.line(x + labelW, yPos + 1, x + fieldW, yPos + 1);
        };

        drawField('Name of Student:', req.student_name || '', margin, contentW / 2 - 5, y);
        drawField('Course & Year:', req.course_year || '', pageW / 2 + 5, contentW / 2 - 5, y);
        y += 10;
        drawField('Request Type:', req.request_type || 'Dean Referral', margin, contentW / 2 - 5, y);
        drawField('Schedule of Appointment:', getCounselingScheduledDate(req) ? new Date(getCounselingScheduledDate(req) as string).toLocaleString() : '', pageW / 2 + 5, contentW / 2 - 5, y);
        y += 10;
        drawField('Referred by:', req.referred_by || '', margin, contentW / 2 - 5, y);
        drawField('Referrer Contact Number:', req.referrer_contact_number || '', pageW / 2 + 5, contentW / 2 - 5, y);
        y += 10;
        drawField('Student Contact Number:', req.contact_number || '', margin, contentW / 2 - 5, y);
        drawField('Relationship with Student:', req.relationship_with_student || '', pageW / 2 + 5, contentW / 2 - 5, y);
        y += 14;

        // --- TEXT AREA SECTIONS ---
        const drawTextSection = (title: any, content: any, yStart: any, lineCount: any) => {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin, yStart);
            doc.setFont('helvetica', 'normal');
            yStart += 6;

            doc.setDrawColor(180, 180, 180);
            for (let i = 0; i < lineCount; i++) {
                const lineY = yStart + (i * 8);
                doc.line(margin, lineY, pageW - margin, lineY);
            }

            if (content) {
                doc.setFontSize(10);
                const splitText = doc.splitTextToSize(content, contentW);
                for (let i = 0; i < Math.min(splitText.length, lineCount); i++) {
                    doc.text(splitText[i], margin, yStart + (i * 8) - 1);
                }
            }

            return yStart + (lineCount * 8) + 4;
        };

        y = drawTextSection("Reason's for Referral: Briefly describe the reason/s for referral", req.reason_for_referral || req.description || '', y, 5);
        y = drawTextSection("Action's Made by the Referring Person:", req.actions_made || '', y, 4);
        y = drawTextSection("Date/ Duration of Observations:", req.date_duration_of_observations || '', y, 3);

        // --- SIGNATURE ---
        y += 10;
        if (req.referrer_signature) {
            try {
                doc.addImage(req.referrer_signature, 'PNG', pageW / 2 - 35, y - 5, 70, 30);
                y += 28;
            } catch (e) {
                console.error('Failed to embed signature:', e);
            }
        }
        doc.setDrawColor(0, 0, 0);
        doc.line(pageW / 2 - 45, y, pageW / 2 + 45, y);
        if (req.referred_by) {
            y -= 3;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(req.referred_by, pageW / 2, y, { align: 'center' });
            y += 8;
        } else {
            y += 5;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Name and Signature of the Referring Person', pageW / 2, y, { align: 'center' });

        // --- FOOTER ---
        const footerY = 275;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY, pageW - margin, footerY);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Issue Date: ${formatDate(req.created_at)}`, margin, footerY + 5);
        doc.text(`Issue Status: ${req.status}`, pageW / 2, footerY + 5, { align: 'center' });
        doc.text('Page 1 of 1', pageW - margin, footerY + 5, { align: 'right' });
        doc.setFontSize(6);
        doc.text('Disclaimer: The information transmitted by this document is intended only for the person or entity to which it is addressed.', pageW / 2, footerY + 10, { align: 'center' });

        doc.save(generateExportFilename(`Counseling_Referral_${(req.student_name || 'unknown').replace(/\s+/g, '_')}`, 'pdf'));
        showToastMessage('Referral form downloaded', 'success');
    };

    const totalRequestCount = (counselingCounts.awaitingDept || 0)
        + (counselingCounts[COUNSELING_STATUS.REFERRED] || 0)
        + (counselingCounts[COUNSELING_STATUS.STAFF_SCHEDULED] || 0)
        + (counselingCounts[COUNSELING_STATUS.SCHEDULED] || 0)
        + (counselingCounts[COUNSELING_STATUS.COMPLETED] || 0)
        + (counselingCounts[COUNSELING_STATUS.REJECTED] || 0);

    const visibleCounselingReqs = counselingReqs.filter(r =>
        counselingTab === COUNSELING_STATUS.SUBMITTED ? isCounselingAwaitingDept(r.status)
            : counselingTab === 'Calendar' ? true
                : r.status === counselingTab
    );

    return {
        handleViewProfile,
        showToastMessage,
        lastExternalRefreshSignalRef,
        sortCounselingByCreatedAt,
        getCounselingStatusTone,
        getCounselingStatusLabel,
        counselingReqs,
        setCounselingReqs,
        counselingTotal,
        setCounselingTotal,
        counselingCounts,
        setCounselingCounts,
        currentPage,
        setCurrentPage,
        refreshTick,
        setRefreshTick,
        loading,
        counselingTab,
        setCounselingTab,
        isRefreshingData,
        setIsRefreshingData,
        viewFormReq,
        setViewFormReq,
        showCounselingFormModal,
        setShowCounselingFormModal,
        formModalView,
        setFormModalView,
        showScheduleModal,
        setShowScheduleModal,
        scheduleData,
        setScheduleData,
        selectedApp,
        setSelectedApp,
        isSchedulingSession,
        setIsSchedulingSession,
        showCompleteModal,
        setShowCompleteModal,
        completionForm,
        setCompletionForm,
        isCompletingSession,
        setIsCompletingSession,
        invokeManagedCareServicesFunction,
        queueProcessEmailNotification,
        applyCounselingTabFilter,
        handleRefreshData,
        handleScheduleSubmit,
        handleCompleteSession,
        handleDownloadReferralForm,
        totalRequestCount,
        visibleCounselingReqs
    };
}
