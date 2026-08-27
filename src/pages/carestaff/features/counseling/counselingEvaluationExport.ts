import { loadJsPdfAutoTable, loadXlsx } from '../../../../lib/exportVendors';
import { buildCsv, escapeSpreadsheetRows } from '../../../../utils/inputSecurity';
import { formatDateTime, toTitleCase } from '../../../../utils/formatters';
import type { CounselingEvaluationQuestion, CounselingEvaluationResponse } from './counselingEvaluationService';

export interface EvaluationDemographics {
    sexCounts: Record<string, number>;
    genderCounts: Record<string, number>;
    uniqueStudents: number;
    totalResponses: number;
}

/**
 * Deduplicates evaluation responses by student_id and computes demographic distributions.
 */
export const computeEvaluationDemographics = (
    evaluations: CounselingEvaluationResponse[]
): EvaluationDemographics => {
    // ponytail: dedupe by student_id for demographics
    const seen = new Map<string, CounselingEvaluationResponse>();
    for (const e of evaluations) {
        const key = String(e.student_id || e.id);
        if (!seen.has(key)) seen.set(key, e);
    }
    const unique = [...seen.values()];
    const sexCounts: Record<string, number> = {};
    const genderCounts: Record<string, number> = {};

    for (const s of unique) {
        const sKey = (s.sex && s.sex.trim()) || 'Unspecified';
        sexCounts[sKey] = (sexCounts[sKey] || 0) + 1;
        const gKey = (s.gender_identity && s.gender_identity.trim()) || 'Unspecified';
        genderCounts[gKey] = (genderCounts[gKey] || 0) + 1;
    }

    return {
        sexCounts,
        genderCounts,
        uniqueStudents: unique.length,
        totalResponses: evaluations.length
    };
};

const getAnswerValue = (
    response: CounselingEvaluationResponse,
    question: CounselingEvaluationQuestion
): string | number => {
    const answer = (response.counseling_evaluation_answers ?? []).find(
        (a) => a.question_id === question.id
    );
    if (!answer) return '—';
    if (typeof answer.answer_value === 'number') return answer.answer_value;
    return answer.answer_text || '—';
};

/**
 * Export counseling evaluation responses to Excel (.xlsx).
 *
 * Sheet 1 — Demographics Summary (sex / gender identity counts & percentages)
 * Sheet 2 — All Responses (one row per evaluation, questions as columns)
 */
export const exportCounselingEvaluationsExcel = async (
    evaluations: CounselingEvaluationResponse[],
    questions: CounselingEvaluationQuestion[],
    scopeLabel?: string
): Promise<void> => {
    const XLSX = await loadXlsx();

    const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const orderedQuestions = [...questions].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    const demo = computeEvaluationDemographics(evaluations);

    // --- Sheet 1: Demographics Summary ---
    const summaryRows: (string | number)[][] = [
        ['Counseling Evaluation Export'],
        [`Generated: ${generatedDate}`],
        ...(scopeLabel ? [[`Filter Scope: ${scopeLabel}`]] : []),
        [`Total Responses: ${demo.totalResponses}`, `Unique Students: ${demo.uniqueStudents}`],
        [],
        ['SEX ASSIGNED AT BIRTH'],
        ['Category', 'Count', '% of Students'],
        ...Object.entries(demo.sexCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => [
                label,
                count,
                demo.uniqueStudents > 0
                    ? `${((count / demo.uniqueStudents) * 100).toFixed(1)}%`
                    : '0%'
            ]),
        [],
        ['GENDER IDENTITY'],
        ['Category', 'Count', '% of Students'],
        ...Object.entries(demo.genderCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => [
                label,
                count,
                demo.uniqueStudents > 0
                    ? `${((count / demo.uniqueStudents) * 100).toFixed(1)}%`
                    : '0%'
            ])
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 16 }];

    // --- Sheet 2: All Responses ---
    const header = [
        'Student Name',
        'Student ID',
        'Department',
        'Course',
        'Year Level',
        'Sex',
        'Gender Identity',
        'Source',
        'Submitted At',
        ...orderedQuestions.map((q, i) => `Q${i + 1}: ${q.question_text}`)
    ];

    const dataRows = evaluations.map((resp) => {
        const isLinked = resp.counseling_request_id != null;
        return [
            toTitleCase(resp.student_name),
            resp.student_id,
            resp.department || '',
            resp.course || '',
            resp.year_level || '',
            resp.sex || '',
            resp.gender_identity || '',
            isLinked ? 'Linked to session' : 'Open evaluation',
            resp.submitted_at ? new Date(resp.submitted_at).toLocaleString() : '',
            ...orderedQuestions.map((q) => getAnswerValue(resp, q))
        ];
    });

    const safeRows = escapeSpreadsheetRows(dataRows);
    const ws2 = XLSX.utils.aoa_to_sheet([header, ...safeRows]);
    ws2['!cols'] = [
        { wch: 25 },
        { wch: 14 },
        { wch: 20 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        ...orderedQuestions.map((q) => ({ wch: q.question_type === 'scale' ? 10 : 45 }))
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Demographics');
    XLSX.utils.book_append_sheet(wb, ws2, 'Responses');
    XLSX.writeFile(wb, `Counseling_Evaluations_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Export counseling evaluations to a styled PDF summary & responses report.
 */
export const exportCounselingEvaluationsPdf = async (
    evaluations: CounselingEvaluationResponse[],
    questions: CounselingEvaluationQuestion[],
    scopeLabel?: string
): Promise<void> => {
    const { jsPDF, autoTable } = await loadJsPdfAutoTable();
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

    const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const orderedQuestions = [...questions].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    const demo = computeEvaluationDemographics(evaluations);

    // ── HEADER ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('NEGROS ORIENTAL STATE UNIVERSITY', 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('GUIHULNGAN CAMPUS • OFFICE OF THE CAMPUS CARE CENTER DIRECTOR', 14, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('COUNSELING EVALUATION REPORT & SUMMARY', 14, 24);

    // Meta block
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Scope: ${scopeLabel || 'All Recorded Evaluations'}`, 14, 30);
    doc.text(`Date Generated: ${generatedDate}`, 14, 35);
    doc.text(`Total Responses: ${demo.totalResponses}`, 140, 30);
    doc.text(`Unique Students: ${demo.uniqueStudents}`, 140, 35);

    // Total Count Badge
    doc.setFillColor(245, 243, 255);
    doc.setDrawColor(221, 214, 254);
    doc.roundedRect(220, 16, 62, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(109, 40, 217);
    doc.text('TOTAL EVALUATIONS', 223, 23);
    doc.setFontSize(14);
    doc.text(`${demo.totalResponses}`, 223, 31);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`(${demo.uniqueStudents} unique students)`, 235, 31);

    // ── DEMOGRAPHICS PROFILE TABLE ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('RESPONDENT DEMOGRAPHIC PROFILE', 14, 43);

    const sexEntries = Object.entries(demo.sexCounts).sort((a, b) => b[1] - a[1]);
    const genderEntries = Object.entries(demo.genderCounts).sort((a, b) => b[1] - a[1]);
    const maxRows = Math.max(sexEntries.length, genderEntries.length, 1);

    const demoBody: (string | number)[][] = [];
    for (let i = 0; i < maxRows; i++) {
        const [sLabel, sCount] = sexEntries[i] || ['', ''];
        const [gLabel, gCount] = genderEntries[i] || ['', ''];
        demoBody.push([
            sLabel,
            sCount !== '' ? sCount : '',
            typeof sCount === 'number' && demo.uniqueStudents > 0
                ? `${((sCount / demo.uniqueStudents) * 100).toFixed(1)}%`
                : '',
            gLabel,
            gCount !== '' ? gCount : '',
            typeof gCount === 'number' && demo.uniqueStudents > 0
                ? `${((gCount / demo.uniqueStudents) * 100).toFixed(1)}%`
                : ''
        ]);
    }

    autoTable(doc, {
        head: [['Sex Assigned at Birth', 'Count', '%', 'Gender Identity', 'Count', '%']],
        body: demoBody,
        startY: 46,
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 50, fontStyle: 'bold' },
            4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            5: { cellWidth: 20, halign: 'center' }
        }
    });

    const responsesStartY = ((doc as any).lastAutoTable?.finalY ?? 50) + 7;

    // ── QUESTIONS REFERENCE KEY ──
    const scaleQuestions = orderedQuestions.filter((q) => q.question_type === 'scale');
    const textQuestions = orderedQuestions.filter((q) => q.question_type !== 'scale');
    let tableStartY = responsesStartY;

    if (scaleQuestions.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text('QUESTIONS REFERENCE KEY', 14, responsesStartY);

        const legendRows: string[][] = [];
        for (let i = 0; i < orderedQuestions.length; i += 2) {
            const qA = orderedQuestions[i];
            const qB = orderedQuestions[i + 1];
            const labelA = `Q${i + 1}: ${qA.question_text} ${qA.question_type === 'scale' ? '(Scale 1-5)' : '(Text Response)'}`;
            const labelB = qB
                ? `Q${i + 2}: ${qB.question_text} ${qB.question_type === 'scale' ? '(Scale 1-5)' : '(Text Response)'}`
                : '';
            legendRows.push([labelA, labelB]);
        }

        autoTable(doc, {
            body: legendRows,
            startY: responsesStartY + 2,
            styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
            theme: 'plain',
            columnStyles: {
                0: { cellWidth: 135, fontStyle: 'normal' },
                1: { cellWidth: 135, fontStyle: 'normal' }
            }
        });

        tableStartY = ((doc as any).lastAutoTable?.finalY ?? responsesStartY) + 6;
    }

    // ── EVALUATION RESPONSES TABLE ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('DETAILED EVALUATION RESPONSES', 14, tableStartY);

    const tableHeaders = [
        'Student',
        'ID',
        'Dept / Course',
        'Sex / Gender',
        'Source',
        'Date',
        ...orderedQuestions.map((q, i) =>
            q.question_type === 'scale' ? `Q${i + 1}` : `Q${i + 1}: ${q.question_text}`
        )
    ];

    const tableRows = evaluations.map((resp) => {
        const isLinked = resp.counseling_request_id != null;
        return [
            toTitleCase(resp.student_name || ''),
            resp.student_id || '—',
            `${resp.department || '—'}${resp.course ? ` / ${resp.course}` : ''}`,
            `${resp.sex || '—'} / ${resp.gender_identity || '—'}`,
            isLinked ? 'Linked' : 'Open',
            resp.submitted_at ? new Date(resp.submitted_at).toLocaleDateString() : '—',
            ...orderedQuestions.map((q) => String(getAnswerValue(resp, q)))
        ];
    });

    const fixedColsWidth = 24 + 14 + 22 + 18 + 11 + 13; // = 102mm
    const scaleColWidth = 8.5;
    const totalScaleWidth = scaleQuestions.length * scaleColWidth;
    const remainingForText = Math.max(30, 277 - fixedColsWidth - totalScaleWidth);
    const textColWidth = textQuestions.length > 0 ? remainingForText / textQuestions.length : 30;

    const columnStyles: Record<number, any> = {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 22 },
        3: { cellWidth: 18 },
        4: { cellWidth: 11, halign: 'center' },
        5: { cellWidth: 13, halign: 'center' }
    };

    orderedQuestions.forEach((q, i) => {
        const colIdx = 6 + i;
        if (q.question_type === 'scale') {
            columnStyles[colIdx] = {
                cellWidth: scaleColWidth,
                halign: 'center',
                fontStyle: 'bold'
            };
        } else {
            columnStyles[colIdx] = {
                cellWidth: textColWidth,
                halign: 'left'
            };
        }
    });

    autoTable(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: tableStartY + 3,
        margin: { left: 10, right: 10 },
        styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles
    });

    doc.save(`Counseling_Evaluations_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * Export counseling evaluation responses to CSV.
 */
export const exportCounselingEvaluationsCsv = (
    evaluations: CounselingEvaluationResponse[],
    questions: CounselingEvaluationQuestion[]
): void => {
    const orderedQuestions = [...questions].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    const headers = [
        'Student Name',
        'Student ID',
        'Department',
        'Course',
        'Year Level',
        'Sex',
        'Gender Identity',
        'Source',
        'Submitted At',
        ...orderedQuestions.map((q, i) => `Q${i + 1}: ${q.question_text}`)
    ];

    const dataRows = evaluations.map((resp) => {
        const isLinked = resp.counseling_request_id != null;
        return [
            toTitleCase(resp.student_name || ''),
            resp.student_id || '',
            resp.department || '',
            resp.course || '',
            resp.year_level || '',
            resp.sex || '',
            resp.gender_identity || '',
            isLinked ? 'Linked to session' : 'Open evaluation',
            resp.submitted_at ? new Date(resp.submitted_at).toLocaleString() : '',
            ...orderedQuestions.map((q) => getAnswerValue(resp, q))
        ];
    });

    const csvContent = '\uFEFF' + buildCsv([headers, ...escapeSpreadsheetRows(dataRows)]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Counseling_Evaluations_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

/**
 * Export a single counseling evaluation response to an official single-page/multi-page PDF.
 */
export const exportSingleCounselingEvaluationPdf = async (
    response: CounselingEvaluationResponse,
    questions: CounselingEvaluationQuestion[]
): Promise<void> => {
    const { jsPDF, autoTable } = await loadJsPdfAutoTable();
    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentW = pageW - margin * 2;

    const orderedQuestions = [...questions].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    const isLinked = response.counseling_request_id != null;

    // ── INSTITUTIONAL HEADER ──
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Republic of the Philippines', pageW / 2, 12, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('NEGROS ORIENTAL STATE UNIVERSITY', pageW / 2, 17, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('GUIHULNGAN CAMPUS • CARE CENTER', pageW / 2, 22, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(109, 40, 217);
    doc.text('COUNSELING EVALUATION FORM RECORD', pageW / 2, 30, { align: 'center' });

    // ── STUDENT DETAILS BOX ──
    let y = 36;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentW, 36, 3, 3, 'FD');

    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('STUDENT NAME:', margin + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(toTitleCase(response.student_name || '—'), margin + 34, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('STUDENT ID:', margin + contentW / 2 + 4, y);
    doc.setTextColor(15, 23, 42);
    doc.text(response.student_id || '—', margin + contentW / 2 + 28, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('DEPARTMENT:', margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(response.department || '—', margin + 34, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('COURSE / YR:', margin + contentW / 2 + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${response.course || '—'} ${response.year_level ? `(${response.year_level})` : ''}`, margin + contentW / 2 + 28, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('SEX / GENDER:', margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${response.sex || 'Unspecified'} · ${response.gender_identity || 'Unspecified'}`, margin + 34, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('SOURCE:', margin + contentW / 2 + 4, y);
    doc.setFont('helvetica', 'bold');
    if (isLinked) {
        doc.setTextColor(5, 150, 105);
    } else {
        doc.setTextColor(217, 119, 6);
    }
    doc.text(isLinked ? 'Linked to counseling session' : 'Open in-person evaluation', margin + contentW / 2 + 28, y);

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('SUBMITTED AT:', margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(formatDateTime(response.submitted_at), margin + 34, y);

    if (isLinked && response.counseling_requests?.scheduled_date) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('SESSION DATE:', margin + contentW / 2 + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(formatDateTime(response.counseling_requests.scheduled_date), margin + contentW / 2 + 28, y);
    }

    // ── QUESTIONS & RESPONSES TABLE ──
    const tableStartY = 78;
    const tableData = orderedQuestions.map((q, idx) => [
        String(idx + 1),
        q.question_text,
        String(getAnswerValue(response, q))
    ]);

    autoTable(doc, {
        head: [['#', 'Evaluation Question / Item', 'Response']],
        body: tableData,
        startY: tableStartY,
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 110 },
            2: { cellWidth: 58, fontStyle: 'bold' }
        }
    });

    // ── FOOTER / SIGNATURE SECTION ──
    const finalY = ((doc as any).lastAutoTable?.finalY ?? 150) + 15;
    const remainingSpace = doc.internal.pageSize.getHeight() - finalY;

    let sigY = finalY;
    if (remainingSpace < 35) {
        doc.addPage('a4', 'portrait');
        sigY = 30;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Certified by CARE Center Office:', margin, sigY);

    doc.setDrawColor(203, 213, 225);
    doc.line(margin, sigY + 18, margin + 70, sigY + 18);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('CARE Center Staff / Counselor', margin, sigY + 22);

    const safeName = (response.student_name || response.student_id || 'response').replace(/\s+/g, '_');
    doc.save(`Counseling_Evaluation_${safeName}.pdf`);
};
