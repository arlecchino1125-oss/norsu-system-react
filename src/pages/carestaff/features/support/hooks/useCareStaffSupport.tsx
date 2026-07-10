import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { createDeferredChannelCleanup } from '../../../../../lib/realtime';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';
import { loadJsPdf } from '../../../../../lib/exportVendors';
import {
    FileText, CheckCircle, Send, AlertTriangle,
    Filter, ClipboardList, GraduationCap, XCircle, Download, Paperclip, RefreshCw
} from 'lucide-react';
import StatusBadge from '../../../../../components/StatusBadge';
import { formatDate, generateExportFilename } from '../../../../../utils/formatters';
import { buildStudentAddress } from '../../../../../utils/studentFields';
import {
    getStoredAssetEntries,
    openStoredAsset
} from '../../../../../utils/storageAssets';
import type { CareStaffDashboardFunctions } from '../../../types';
import {
    SUPPORT_STATUS,
    isCareStaffSupportDeptUpdate
} from '../../../../../utils/workflow';
import PaginationControls from '../../../../../components/PaginationControls';
import {
    applySupportTabFilter as applyTabFilter,
    applySupportCategoryFilter as applyCategoryFilter,
    fetchSupportCounts,
    fetchSupportListPage
} from '../supportData';
import { Button } from '../../../../../components/ui/Button';

export interface CareStaffSupportPageProps {
    functions?: Pick<CareStaffDashboardFunctions, 'showToast'>;
    refreshSignal?: number;
}

export const MAX_SUPPORT_DOCUMENT_BYTES = 1024 * 1024;
export const SUPPORT_DOCUMENT_ACCEPT = 'image/*,application/pdf';
export { SUPPORT_REQUESTS_PAGE_SIZE, SUPPORT_REQUEST_COLUMNS } from '../supportData';
export const SUPPORT_STUDENT_COLUMNS = [
    'student_id',
    'first_name',
    'last_name',
    'middle_name',
    'suffix',
    'dob',
    'mobile',
    'email',
    'address',
    'street',
    'city',
    'province',
    'zip_code',
    'region',
    'course',
    'year_level',
    'priority_course',
    'alt_course_1',
    'alt_course_2'
].join(', ');

export const isSupportedDocumentFile = (file: File) =>
    file.type.startsWith('image/') || file.type === 'application/pdf';

export function useCareStaffSupport({ functions, refreshSignal = 0 }: any) {
    const { showToast } = functions || {};
    const lastExternalRefreshSignalRef = useRef(refreshSignal);
    const sortSupportByCreatedAt = (rows: any[]) =>
        [...rows].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    // Data State
    const [supportReqs, setSupportReqs] = useState<any[]>([]);
    const [supportTotal, setSupportTotal] = useState(0);
    const [supportCounts, setSupportCounts] = useState<Record<string, number>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshTick, setRefreshTick] = useState(0);
    const [supportTab, setSupportTab] = useState<string>(SUPPORT_STATUS.SUBMITTED);
    const [supportCategory, setSupportCategory] = useState<string>('All');
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Modal State
    const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
    const [selectedSupportReq, setSelectedSupportReq] = useState<any>(null);
    const [supportForm, setSupportForm] = useState<any>({ care_notes: '', resolution_notes: '' });
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [letterFile, setLetterFile] = useState<File | null>(null);
    const [isForwardingSupport, setIsForwardingSupport] = useState(false);
    const [isFinalizingSupport, setIsFinalizingSupport] = useState(false);

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
                showToast?.(`${context} Email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
            }
        });
    };

    const parseDeptNotes = (value: string | null | undefined) => {
        if (!value) return null;
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    };

    const supportTabs = [
        { id: SUPPORT_STATUS.SUBMITTED, label: 'Submitted', count: supportCounts[SUPPORT_STATUS.SUBMITTED] || 0 },
        { id: SUPPORT_STATUS.FORWARDED_TO_DEPT, label: 'Forwarded to Dept', count: supportCounts[SUPPORT_STATUS.FORWARDED_TO_DEPT] || 0 },
        { id: SUPPORT_STATUS.VISIT_SCHEDULED, label: 'Visit Scheduled', count: supportCounts[SUPPORT_STATUS.VISIT_SCHEDULED] || 0 },
        { id: 'dept_updates', label: 'Dept Updates', count: supportCounts.dept_updates || 0 },
        { id: SUPPORT_STATUS.COMPLETED, label: 'Completed', count: supportCounts[SUPPORT_STATUS.COMPLETED] || 0 }
    ];

    const matchesSupportTab = (req: any) => {
        if (supportTab === 'dept_updates') return isCareStaffSupportDeptUpdate(req.status);
        return req.status === supportTab;
    };

    const visibleSupportReqs = supportReqs
        .filter(matchesSupportTab)
        .filter(req => supportCategory === 'All' || (req.support_type && req.support_type.includes(supportCategory)));

    const applySupportTabFilter = (query: any, tab = supportTab) => applyTabFilter(query, tab);

    const applySupportCategoryFilter = (query: any) => applyCategoryFilter(query, supportCategory);

    // List for the selected tab/category. Tab + category + page are in the key, so
    // this legitimately refetches on those changes; refreshTick busts it on
    // realtime writes.
    const { data: listData, isFetching: supportLoading, refetch: refetchList } = useQuery({
        queryKey: ['care_staff_support_list', supportTab, supportCategory, currentPage, refreshTick],
        queryFn: () => fetchSupportListPage(supportTab, supportCategory, currentPage),
        staleTime: 60000
    });

    // Tab/stat counts — keyed WITHOUT the tab, category, or page, so clicking any
    // of them never refetches these. They load once and stay cached until a
    // realtime write bumps refreshTick.
    const { data: countsData, refetch: refetchCounts } = useQuery({
        queryKey: ['care_staff_support_counts', refreshTick],
        queryFn: fetchSupportCounts,
        staleTime: 60000
    });

    // Refreshing the page (manual button, mutations) must hit BOTH queries or the
    // badges go stale while the list updates.
    const fetchSupport = useCallback(
        () => Promise.all([refetchList(), refetchCounts()]),
        [refetchList, refetchCounts]
    );

    useEffect(() => {
        if (listData) {
            setSupportReqs(listData.reqs);
            setSupportTotal(listData.total);
        }
        if (countsData) {
            setSupportCounts(countsData);
        }
    }, [listData, countsData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [supportTab, supportCategory]);

    useEffect(() => {
        return createDeferredChannelCleanup(
            () => supabase.channel('care_support_isolated')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, (payload: any) => {
                    setRefreshTick((tick) => tick + 1);
                    if (payload.eventType === 'INSERT') {
                        showToast?.(`New Support Request Received`, 'info');
                    } else if (payload.eventType === 'UPDATE') {
                        showToast?.(`Support Request Updated`, 'info');
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );
    }, []);

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await fetchSupport();
            showToast?.('Support requests refreshed.', 'success');
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
    const openSupportModal = async (req: any) => {
        setSelectedSupportReq(req);
        setSupportForm({ care_notes: req.care_notes || '', resolution_notes: req.resolution_notes || '' });
        setSelectedStudent(null);
        if (req.student_id) {
            const { data } = await supabase.from('students').select(SUPPORT_STUDENT_COLUMNS).eq('student_id', req.student_id).maybeSingle();
            setSelectedStudent(data);
        }
        setLetterFile(null);
        setShowSupportModal(true);
    };

    const handleForwardSupport = async () => {
        if (isForwardingSupport) return;
        if (!supportForm.care_notes) { showToast?.("Please add notes for Dept Head.", 'error'); return; }
        setIsForwardingSupport(true);
        try {
            let letterPath = null;
            if (letterFile) {
                if (!isSupportedDocumentFile(letterFile)) {
                    throw new Error('Endorsement letter must be an image or PDF file.');
                }
                if (letterFile.size > MAX_SUPPORT_DOCUMENT_BYTES) {
                    throw new Error('Endorsement letter must be under 1 MB.');
                }
                const fileExt = letterFile.name.split('.').pop();
                const fileName = `endorsement_${selectedSupportReq.student_id}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('support_documents').upload(fileName, letterFile);
                if (uploadError) throw uploadError;
                letterPath = fileName;
            }
            const careNotesValue = letterPath
                ? JSON.stringify({ notes: supportForm.care_notes, letter_path: letterPath })
                : supportForm.care_notes;
            const result = await invokeManagedCareServicesFunction({
                mode: 'forward-support-to-dept',
                requestId: selectedSupportReq.id,
                careNotes: careNotesValue
            });
            void fetchSupport();
            showToast?.("Request forwarded to Dean.", 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request forwarded to Dean.');
            setShowSupportModal(false);
            setLetterFile(null);
        } catch (err: any) {
            showToast?.(err.message, 'error');
        } finally {
            setIsForwardingSupport(false);
        }
    };

    const handleLetterFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        event.target.value = '';
        if (!file) {
            setLetterFile(null);
            return;
        }
        if (!isSupportedDocumentFile(file)) {
            showToast?.('Endorsement letter must be an image or PDF file.', 'error');
            setLetterFile(null);
            return;
        }
        if (file.size > MAX_SUPPORT_DOCUMENT_BYTES) {
            showToast?.('Endorsement letter must be under 1 MB.', 'error');
            setLetterFile(null);
            return;
        }
        setLetterFile(file);
    };

    const handleFinalizeSupport = async () => {
        if (isFinalizingSupport) return;
        if (!supportForm.resolution_notes) { showToast?.("Please add resolution notes.", 'error'); return; }
        setIsFinalizingSupport(true);
        try {
            const result = await invokeManagedCareServicesFunction({
                mode: 'complete-support',
                requestId: selectedSupportReq.id,
                resolutionNotes: supportForm.resolution_notes
            });
            void fetchSupport();
            showToast?.("Request completed and student notified.", 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request completed and student notified.');
            setShowSupportModal(false);
        } catch (err: any) {
            showToast?.(err.message, 'error');
        } finally {
            setIsFinalizingSupport(false);
        }
    };

    const handlePrintSupport = async () => {
        const jsPDF = await loadJsPdf();
        const doc = new jsPDF({ format: 'legal' });
        const req = selectedSupportReq;
        const student = selectedStudent;
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();

        // Margins: Top 1" (25.4mm), Left 1.5" (38.1mm), Bottom 1" (25.4mm), Right 1" (25.4mm)
        const marginTop = 25.4;
        const marginLeft = 38.1;
        const marginBottom = 25.4;
        const marginRight = 25.4;

        const contentW = pageW - marginLeft - marginRight;

        // --- HEADER ---
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('OFFICE OF THE CAMPUS STUDENT AFFAIRS AND SERVICES,', marginLeft + contentW / 2, marginTop + 10, { align: 'center' });
        doc.text('GUIHULNGAN CAMPUS', marginLeft + contentW / 2, marginTop + 15, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('FORM FOR STUDENTS WHO REQUIRE ADDITIONAL SUPPORT', marginLeft + contentW / 2, marginTop + 24, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        let y = marginTop + 32;

        // --- STUDENT INFO TABLE ---
        const drawFieldRow = (label: any, value: any, x: any, fieldW: any, yPos: any) => {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(label, x, yPos);
            const labelW = doc.getTextWidth(label) + 2;
            doc.setFont('helvetica', 'normal');
            doc.text(String(value || ''), x + labelW, yPos);
            doc.setDrawColor(0, 0, 0);
            doc.line(x + labelW, yPos + 1, x + fieldW, yPos + 1);
        };

        const halfW = contentW / 2 - 4;
        const rightX = marginLeft + halfW + 8;

        drawFieldRow('Full Name:', req.student_name || '', marginLeft, halfW, y);
        drawFieldRow('Date Filed:', req.created_at ? new Date(req.created_at).toLocaleDateString() : '', rightX, halfW, y);
        y += 7;
        drawFieldRow('Date of Birth:', student?.dob || '', marginLeft, halfW, y);
        drawFieldRow('Program-Year Level:', req.course_year || `${student?.course || ''} ${student?.year_level ? '- ' + student.year_level : ''}`.trim(), rightX, halfW, y);
        y += 7;
        drawFieldRow('Cell Phone Number:', student?.mobile || '', marginLeft, halfW, y);
        y += 7;
        drawFieldRow('Email Address:', student?.email || '', marginLeft, halfW, y);
        y += 7;
        drawFieldRow('Home Address:', buildStudentAddress(student), marginLeft, contentW, y);
        y += 9;

        // --- CATEGORY SECTION ---
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Category (check all that apply):', marginLeft, y);
        y += 5;

        const allCategories = [
            'Persons with Disabilities (PWDs)',
            'Indigenous Peoples (IPs) & Cultural Communities',
            'Working Students',
            'Economically Challenged Students',
            'Students with Special Learning Needs',
            'Rebel Returnees',
            'Orphans',
            'Senior Citizens',
            'Homeless Students',
            'Solo Parenting',
            'Pregnant Women',
            'Women in Especially Difficult Circumstances',
        ];
        const selectedCats = (req.support_type || '').split(', ').map((c: any) => c.trim());

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const catColW = contentW / 2;
        allCategories.forEach((cat: string, i: number) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cx = marginLeft + col * catColW;
            const cy = y + row * 5;
            const isChecked = selectedCats.some((sc: any) => cat.toLowerCase().includes(sc.toLowerCase()) || sc.toLowerCase().includes(cat.toLowerCase()));

            // Draw checkbox
            doc.setDrawColor(0, 0, 0);
            if (isChecked) {
                doc.setFillColor(0, 0, 0); // Black fill
                doc.rect(cx, cy - 3, 3, 3, 'FD'); // Fill and Draw
                doc.setTextColor(255, 255, 255); // White text
                doc.setFont('helvetica', 'bold');
                doc.text('✓', cx + 0.5, cy - 0.5);
                doc.setTextColor(0, 0, 0); // Reset text color
                doc.setFont('helvetica', 'normal');
            } else {
                doc.setFillColor(255, 255, 255);
                doc.rect(cx, cy - 3, 3, 3, 'FD');
            }
            doc.text(cat, cx + 5, cy);
        });

        // Handle "Other" categories
        const otherCats = selectedCats.filter((sc: any) => sc.startsWith('Other:'));
        const otherRow = Math.ceil(allCategories.length / 2);
        const otherY = y + otherRow * 5;

        doc.setDrawColor(0, 0, 0);
        if (otherCats.length > 0) {
            doc.setFillColor(0, 0, 0);
            doc.rect(marginLeft, otherY - 3, 3, 3, 'FD');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('✓', marginLeft + 0.5, otherY - 0.5);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
        } else {
            doc.setFillColor(255, 255, 255);
            doc.rect(marginLeft, otherY - 3, 3, 3, 'FD');
        }
        doc.text(`Others, specify: ${otherCats.map((o: any) => o.replace('Other: ', '')).join(', ')}`, marginLeft + 5, otherY);

        y = otherY + 8;

        // --- SECTION A: YOUR STUDIES ---
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.line(marginLeft, y, marginLeft + contentW, y);
        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('A. Your studies', marginLeft, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Which program(s) did you apply for?', marginLeft, y);
        y += 6;

        const drawPriorityRow = (label: any, value: any, yPos: any) => {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(label, marginLeft, yPos);
            const labelW = doc.getTextWidth(label) + 2;
            doc.setFont('helvetica', 'normal');
            doc.text(String(value || 'N/A'), marginLeft + labelW, yPos);
            doc.setDrawColor(0, 0, 0);
            doc.line(marginLeft + labelW, yPos + 1, marginLeft + contentW, yPos + 1);
        };

        drawPriorityRow('1st Priority:', student?.priority_course || 'N/A', y);
        y += 6;
        drawPriorityRow('2nd Priority:', student?.alt_course_1 || 'N/A', y);
        y += 6;
        drawPriorityRow('3rd Priority:', student?.alt_course_2 || 'N/A', y);
        y += 8;

        // --- SECTION B: PARTICULARS ---
        doc.setLineWidth(0.4);
        doc.line(marginLeft, y, marginLeft + contentW, y);
        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('B. Particulars of your disability or special learning need', marginLeft, y);
        y += 4;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        const disclaimerText = 'We would like to gain a better understanding of the kind of support that you may need. However, we might not be able to assist in all the ways that you require, but it might help us with our planning in future.';
        const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentW);
        doc.text(splitDisclaimer, marginLeft, y);
        y += splitDisclaimer.length * 3.5 + 3;

        // Parse Q1-Q4 from description
        const desc = req.description || '';
        const getPart = (key: any, nextKey: any) => {
            const start = desc.indexOf(key);
            if (start === -1) return '';
            let end = nextKey ? desc.indexOf(nextKey) : -1;
            if (end === -1) end = desc.length;
            return desc.substring(start + key.length, end).trim();
        };
        const q1 = getPart('[Q1 Description]:', '[Q2 Previous Support]:');
        const q2 = getPart('[Q2 Previous Support]:', '[Q3 Required Support]:');
        const q3 = getPart('[Q3 Required Support]:', '[Q4 Other Needs]:');
        const q4 = getPart('[Q4 Other Needs]:', null);

        const drawQuestion = (num: any, question: any, answer: any) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            const qLines = doc.splitTextToSize(`${num}. ${question}`, contentW);
            doc.text(qLines, marginLeft, y);
            y += qLines.length * 3.5 + 2;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            if (answer) {
                const aLines = doc.splitTextToSize(answer, contentW);
                // Draw lined area for answers
                doc.setDrawColor(180, 180, 180);
                const lineCount = Math.max(aLines.length, 2);
                for (let i = 0; i < lineCount; i++) {
                    doc.line(marginLeft, y + (i * 5.5), marginLeft + contentW, y + (i * 5.5));
                }
                // Write content
                for (let i = 0; i < aLines.length; i++) {
                    doc.text(aLines[i], marginLeft, y + (i * 5.5) - 1);
                }
                y += lineCount * 5.5 + 3;
            } else {
                doc.setDrawColor(180, 180, 180);
                for (let i = 0; i < 2; i++) {
                    doc.line(marginLeft, y + (i * 5.5), marginLeft + contentW, y + (i * 5.5));
                }
                y += 14;
            }
        };

        drawQuestion(1, 'Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.', q1);
        drawQuestion(2, 'What kind of support did you receive at your previous school?', q2);
        drawQuestion(3, 'What support or assistance do you require from NORSU-Guihulngan Campus to enable you to fully participate in campus activities, move safely and independently within the campus, and engage effectively in classroom and other learning environments, including lectures, practical sessions, tests, examinations, and other forms of assessment?', q3);
        drawQuestion(4, 'Indicate and elaborate on any other special needs or assistance that may be required:', q4);

        // --- FOOTER ---
        const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            const footerY = pageH - marginBottom;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            doc.line(marginLeft, footerY, marginLeft + contentW, footerY);
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text(`Date Filed: ${new Date(req.created_at).toLocaleDateString()}`, marginLeft, footerY + 4);
            doc.text(`Status: ${req.status}`, marginLeft + contentW / 2, footerY + 4, { align: 'center' });
            doc.text(`Page ${p} of ${totalPages}`, marginLeft + contentW, footerY + 4, { align: 'right' });
            doc.setFontSize(5);
            doc.text('Disclaimer: The information transmitted by this document is intended only for the person or entity to which it is addressed.', marginLeft + contentW / 2, footerY + 8, { align: 'center' });
        }

        doc.save(generateExportFilename(`Additional_Support_${(req.student_name || 'unknown').replace(/\s+/g, '_')}`, 'pdf'));
        showToast?.('Support form downloaded successfully!', 'success');
    };

    const renderDetailedDescription = (desc: any) => {
        if (!desc) return <p className="text-sm text-gray-500 italic">No description provided.</p>;
        const q1Index = desc.indexOf('[Q1 Description]:');
        if (q1Index === -1) return <p className="text-sm text-gray-800 whitespace-pre-wrap">{desc}</p>;

        const getPart = (key: string, nextKey: string | null) => {
            const start = desc.indexOf(key);
            if (start === -1) return null;
            let end = nextKey ? desc.indexOf(nextKey) : -1;
            if (end === -1) end = desc.length;
            return desc.substring(start + key.length, end).trim();
        };

        const q1 = getPart('[Q1 Description]:', '[Q2 Previous Support]:');
        const q2 = getPart('[Q2 Previous Support]:', '[Q3 Required Support]:');
        const q3 = getPart('[Q3 Required Support]:', '[Q4 Other Needs]:');
        const q4 = getPart('[Q4 Other Needs]:', null);

        return (
            <div className="space-y-4 mt-3">
                {q1 && <div><p className="text-xs font-bold text-gray-600 mb-1">1. Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q1}</p></div>}
                {q2 && <div><p className="text-xs font-bold text-gray-600 mb-1">2. What kind of support did you receive at your previous school?</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q2}</p></div>}
                {q3 && <div><p className="text-xs font-bold text-gray-600 mb-1">3. What support or assistance do you require from NORSU to fully participate in campus activities?</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q3}</p></div>}
                {q4 && <div><label className="block text-xs font-bold text-gray-700 mb-1">4. Indicate and elaborate on any other special needs or assistance that may be required:</label><textarea rows={2} readOnly value={q4 || ''} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700"></textarea></div>}
            </div>
        );
    };

    return {
        showToast,
        lastExternalRefreshSignalRef,
        sortSupportByCreatedAt,
        supportReqs,
        setSupportReqs,
        supportTotal,
        setSupportTotal,
        supportCounts,
        setSupportCounts,
        currentPage,
        setCurrentPage,
        supportLoading,
        refreshTick,
        setRefreshTick,
        supportTab,
        setSupportTab,
        supportCategory,
        setSupportCategory,
        isRefreshingData,
        setIsRefreshingData,
        showSupportModal,
        setShowSupportModal,
        selectedSupportReq,
        setSelectedSupportReq,
        supportForm,
        setSupportForm,
        selectedStudent,
        setSelectedStudent,
        letterFile,
        setLetterFile,
        isForwardingSupport,
        setIsForwardingSupport,
        isFinalizingSupport,
        setIsFinalizingSupport,
        invokeManagedCareServicesFunction,
        queueProcessEmailNotification,
        parseDeptNotes,
        supportTabs,
        matchesSupportTab,
        visibleSupportReqs,
        applySupportTabFilter,
        applySupportCategoryFilter,
        fetchSupport,
        handleRefreshData,
        openSupportModal,
        handleForwardSupport,
        handleLetterFileChange,
        handleFinalizeSupport,
        handlePrintSupport,
        renderDetailedDescription
    };
}
