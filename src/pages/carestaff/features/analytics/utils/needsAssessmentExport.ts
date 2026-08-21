import { loadJsPdfAutoTable, loadXlsx } from '../../../../../lib/exportVendors';
import { escapeSpreadsheetRows } from '../../../../../utils/inputSecurity';

export interface QuestionStatItem {
    question: {
        id: number;
        question_text: string;
        question_type?: string;
        order_index?: number;
    };
    counts: number[];
    total: number;
    average: number;
    priorAverage?: number;
    delta?: number;
}

export interface ProcessedItemAnalysis {
    questionIndex: number;
    questionId: number;
    questionText: string;
    counts: [number, number, number, number, number];
    percentages: [number, number, number, number, number];
    total: number;
    weightedMean: number;
    descriptiveEquivalent: string;
    rank: number;
    fivePercentage: number;
}

export interface NeedsAssessmentExportPayload {
    formTitle: string;
    filterLabel?: string;
    totalRespondents: number;
    stats: QuestionStatItem[];
    compareTitle?: string;
}

export const LIKERT_SCALE_LEGEND = [
    { range: '4.20 – 5.00', level: '5', label: 'Very High Need', priority: 'Critical Priority / Immediate Intervention' },
    { range: '3.40 – 4.19', level: '4', label: 'High Need', priority: 'High Priority / Targeted Counseling' },
    { range: '2.60 – 3.39', level: '3', label: 'Moderate Need', priority: 'Moderate Priority / General Guidance' },
    { range: '1.80 – 2.59', level: '2', label: 'Low Need', priority: 'Low Priority / Routine Monitoring' },
    { range: '1.00 – 1.79', level: '1', label: 'Very Low Need', priority: 'Minimal Concern / No Action Required' }
];

export const getDescriptiveEquivalent = (mean: number): string => {
    if (!mean || mean <= 0) return 'No Data';
    if (mean >= 4.20) return 'Very High Need';
    if (mean >= 3.40) return 'High Need';
    if (mean >= 2.60) return 'Moderate Need';
    if (mean >= 1.80) return 'Low Need';
    return 'Very Low Need';
};

export const sanitizeFileName = (name: string): string =>
    name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 60);

/**
 * Calculates percentage distributions, weighted means, rankings,
 * and extracts top highest/lowest need statements.
 */
export const processQuestionStatsForExport = (stats: QuestionStatItem[]) => {
    const items: ProcessedItemAnalysis[] = stats.map((stat, idx) => {
        const counts: [number, number, number, number, number] = [
            Number(stat.counts?.[0]) || 0,
            Number(stat.counts?.[1]) || 0,
            Number(stat.counts?.[2]) || 0,
            Number(stat.counts?.[3]) || 0,
            Number(stat.counts?.[4]) || 0
        ];
        const total = counts.reduce((sum, n) => sum + n, 0);
        const weightedSum = counts.reduce((sum, n, i) => sum + n * (i + 1), 0);
        const weightedMean = total > 0 ? Number((weightedSum / total).toFixed(2)) : 0;
        const percentages: [number, number, number, number, number] = counts.map(c =>
            total > 0 ? Number(((c / total) * 100).toFixed(1)) : 0
        ) as [number, number, number, number, number];
        const fivePercentage = percentages[4];

        return {
            questionIndex: idx + 1,
            questionId: stat.question.id,
            questionText: stat.question.question_text,
            counts,
            percentages,
            total,
            weightedMean,
            descriptiveEquivalent: getDescriptiveEquivalent(weightedMean),
            rank: 0,
            fivePercentage
        };
    });

    // Rank statements by Weighted Mean descending
    const answeredItems = items.filter(item => item.total > 0);
    const sortedByMean = [...answeredItems].sort((a, b) => b.weightedMean - a.weightedMean);

    let currentRank = 1;
    for (let i = 0; i < sortedByMean.length; i += 1) {
        if (i > 0 && sortedByMean[i].weightedMean < sortedByMean[i - 1].weightedMean) {
            currentRank = i + 1;
        }
        sortedByMean[i].rank = currentRank;
    }

    // Set rank back on items
    const rankMap = new Map<number, number>(sortedByMean.map(item => [item.questionId, item.rank]));
    items.forEach(item => {
        item.rank = rankMap.get(item.questionId) ?? 0;
    });

    // Grand Mean across all answered items
    const grandMean = answeredItems.length > 0
        ? Number((answeredItems.reduce((acc, curr) => acc + curr.weightedMean, 0) / answeredItems.length).toFixed(2))
        : 0;

    // Top 5 Highest Need Statements (Highest Weighted Mean / Highest Level 5s)
    const topHighestNeeds = [...answeredItems]
        .sort((a, b) => b.weightedMean - a.weightedMean || b.fivePercentage - a.fivePercentage)
        .slice(0, 5);

    // Top 5 Lowest Need Statements (Lowest Weighted Mean)
    const topLowestNeeds = [...answeredItems]
        .sort((a, b) => a.weightedMean - b.weightedMean || a.fivePercentage - b.fivePercentage)
        .slice(0, 5);

    return {
        items,
        grandMean,
        grandMeanEquivalent: getDescriptiveEquivalent(grandMean),
        topHighestNeeds,
        topLowestNeeds
    };
};

/**
 * Export results to Microsoft Excel (.xlsx) with Executive Summary and Itemized Sheets
 */
export const exportNeedsAssessmentExcel = async ({
    formTitle,
    filterLabel = 'All Colleges',
    totalRespondents,
    stats
}: NeedsAssessmentExportPayload): Promise<void> => {
    const XLSX = await loadXlsx();
    const { items, grandMean, grandMeanEquivalent, topHighestNeeds, topLowestNeeds } = processQuestionStatsForExport(stats);

    const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Sheet 1: Executive Summary & Priority Analysis
    const summaryRows: any[][] = [
        ['NEGROS ORIENTAL STATE UNIVERSITY - GUIHULNGAN CAMPUS'],
        ['CARE CENTER - STUDENT NEEDS ASSESSMENT PRIORITY REPORT'],
        [],
        ['Assessment Form:', formTitle],
        ['Filter / Scope:', filterLabel],
        ['Total Respondents (N):', totalRespondents],
        ['Assessment Grand Mean:', grandMean > 0 ? grandMean.toFixed(2) : 'N/A'],
        ['Overall Descriptive Interpretation:', grandMeanEquivalent],
        ['Report Generated Date:', generatedDate],
        [],
        ['========================================================================================'],
        ['TOP 5 HIGHEST NEED STATEMENTS (PRIORITY AREAS FOR COUNSELING & INTERVENTION)'],
        ['========================================================================================'],
        ['Rank', 'Item #', 'Statement', 'Weighted Mean', 'Interpretation', 'Score 5 (Critical) %', 'Score 5 Count', 'Total (N)'],
        ...topHighestNeeds.map(item => [
            item.rank,
            item.questionIndex,
            item.questionText,
            item.weightedMean.toFixed(2),
            item.descriptiveEquivalent,
            `${item.percentages[4]}%`,
            item.counts[4],
            item.total
        ]),
        [],
        ['========================================================================================'],
        ['TOP 5 LOWEST NEED STATEMENTS (AREAS OF LEAST CONCERN)'],
        ['========================================================================================'],
        ['Rank', 'Item #', 'Statement', 'Weighted Mean', 'Interpretation', 'Score 1 Count', 'Total (N)'],
        ...topLowestNeeds.map(item => [
            item.rank,
            item.questionIndex,
            item.questionText,
            item.weightedMean.toFixed(2),
            item.descriptiveEquivalent,
            item.counts[0],
            item.total
        ]),
        [],
        ['========================================================================================'],
        ['5-POINT LIKERT SCALE INTERPRETATION GUIDE'],
        ['========================================================================================'],
        ['Scale Range', 'Scale Rating', 'Verbal Interpretation', 'Action Implication'],
        ...LIKERT_SCALE_LEGEND.map(legend => [
            legend.range,
            legend.level,
            legend.label,
            legend.priority
        ])
    ];

    // Sheet 2: Comprehensive Statements Analysis
    const detailHeaders = [
        'Item #',
        'Statement / Indicator',
        'Scale 1 Count',
        'Scale 1 %',
        'Scale 2 Count',
        'Scale 2 %',
        'Scale 3 Count',
        'Scale 3 %',
        'Scale 4 Count',
        'Scale 4 %',
        'Scale 5 Count',
        'Scale 5 %',
        'Total (N)',
        'Weighted Mean',
        'Descriptive Interpretation',
        'Overall Rank'
    ];

    const detailRows = items.map(item => [
        item.questionIndex,
        item.questionText,
        item.counts[0],
        `${item.percentages[0]}%`,
        item.counts[1],
        `${item.percentages[1]}%`,
        item.counts[2],
        `${item.percentages[2]}%`,
        item.counts[3],
        `${item.percentages[3]}%`,
        item.counts[4],
        `${item.percentages[4]}%`,
        item.total,
        item.weightedMean > 0 ? item.weightedMean.toFixed(2) : '—',
        item.descriptiveEquivalent,
        item.rank > 0 ? item.rank : '—'
    ]);

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet(escapeSpreadsheetRows(summaryRows));
    summarySheet['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 55 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

    const detailSheet = XLSX.utils.aoa_to_sheet(escapeSpreadsheetRows([detailHeaders, ...detailRows]));
    detailSheet['!cols'] = [
        { wch: 8 },
        { wch: 55 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 24 },
        { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Statement Analysis');

    const fileName = `${sanitizeFileName(formTitle)}_Results_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};

/**
 * Export results to a formatted, institutional PDF Report
 */
export const exportNeedsAssessmentPdf = async ({
    formTitle,
    filterLabel = 'All Colleges',
    totalRespondents,
    stats
}: NeedsAssessmentExportPayload): Promise<void> => {
    const { jsPDF, autoTable } = await loadJsPdfAutoTable();
    const { items, grandMean, grandMeanEquivalent, topHighestNeeds, topLowestNeeds } = processQuestionStatsForExport(stats);

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // ── PAGE 1: HEADER & EXECUTIVE SUMMARY ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('NEGROS ORIENTAL STATE UNIVERSITY', 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('GUIHULNGAN CAMPUS • OFFICE OF THE CAMPUS CARE CENTER DIRECTOR', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('STUDENT NEEDS ASSESSMENT RESULTS & PRIORITY REPORT', 14, 26);

    // Meta Block
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Assessment Form: ${formTitle}`, 14, 33);
    doc.text(`Scope / Filter: ${filterLabel}`, 14, 38);
    doc.text(`Total Respondents (N): ${totalRespondents}`, 140, 33);
    doc.text(`Date Generated: ${generatedDate}`, 140, 38);

    // Grand Mean Badge
    doc.setFillColor(245, 243, 255);
    doc.setDrawColor(221, 214, 254);
    doc.roundedRect(215, 23, 68, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(109, 40, 217);
    doc.text('OVERALL GRAND MEAN', 218, 29);
    doc.setFontSize(13);
    doc.text(`${grandMean > 0 ? grandMean.toFixed(2) : '—'}`, 218, 37);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`(${grandMeanEquivalent})`, 236, 37);

    // Top 5 Highest Need Statements Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text('TOP HIGHEST NEED STATEMENTS (AREAS OF GREATEST STUDENT CONCERN)', 14, 48);

    autoTable(doc, {
        head: [['Rank', '#', 'Statement / Need Indicator', 'Scale 5 (f / %)', 'Weighted Mean', 'Descriptive Interpretation']],
        body: topHighestNeeds.map(item => [
            `Rank ${item.rank}`,
            `Item ${item.questionIndex}`,
            item.questionText,
            `${item.counts[4]} (${item.percentages[4]}%)`,
            item.weightedMean.toFixed(2),
            item.descriptiveEquivalent
        ]),
        startY: 51,
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 18, fontStyle: 'bold' },
            1: { cellWidth: 14 },
            2: { cellWidth: 140 },
            3: { cellWidth: 28, halign: 'center' },
            4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
            5: { cellWidth: 42 }
        }
    });

    const lowestStartY = ((doc as any).lastAutoTable?.finalY ?? 51) + 7;

    // Top 5 Lowest Need Statements Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('TOP LOWEST NEED STATEMENTS (AREAS OF LEAST CONCERN)', 14, lowestStartY);

    autoTable(doc, {
        head: [['Rank', '#', 'Statement / Need Indicator', 'Scale 1 (f / %)', 'Weighted Mean', 'Descriptive Interpretation']],
        body: topLowestNeeds.map(item => [
            `Rank ${item.rank}`,
            `Item ${item.questionIndex}`,
            item.questionText,
            `${item.counts[0]} (${item.percentages[0]}%)`,
            item.weightedMean.toFixed(2),
            item.descriptiveEquivalent
        ]),
        startY: lowestStartY + 3,
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 18, fontStyle: 'bold' },
            1: { cellWidth: 14 },
            2: { cellWidth: 140 },
            3: { cellWidth: 28, halign: 'center' },
            4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
            5: { cellWidth: 42 }
        }
    });

    // ── PAGE 2: COMPREHENSIVE STATEMENTS TABLE ──
    doc.addPage('a4', 'landscape');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('COMPREHENSIVE ITEM-BY-ITEM STATISTICAL ANALYSIS', 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Distribution across 1 to 5 scale, weighted means, interpretations, and overall ranks.', 14, 18);

    autoTable(doc, {
        head: [
            ['#', 'Statement / Need Indicator', '1 (f / %)', '2 (f / %)', '3 (f / %)', '4 (f / %)', '5 (f / %)', 'Total N', 'WM', 'Interpretation', 'Rank']
        ],
        body: items.map(item => [
            item.questionIndex,
            item.questionText,
            `${item.counts[0]}\n(${item.percentages[0]}%)`,
            `${item.counts[1]}\n(${item.percentages[1]}%)`,
            `${item.counts[2]}\n(${item.percentages[2]}%)`,
            `${item.counts[3]}\n(${item.percentages[3]}%)`,
            `${item.counts[4]}\n(${item.percentages[4]}%)`,
            item.total,
            item.weightedMean > 0 ? item.weightedMean.toFixed(2) : '—',
            item.descriptiveEquivalent,
            item.rank > 0 ? item.rank : '—'
        ]),
        startY: 22,
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 100 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 18, halign: 'center' },
            6: { cellWidth: 18, halign: 'center' },
            7: { cellWidth: 14, halign: 'center' },
            8: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
            9: { cellWidth: 30, halign: 'left' },
            10: { cellWidth: 12, halign: 'center', fontStyle: 'bold' }
        }
    });

    // ── PAGE FOOTER / SIGN-OFF BLOCK ──
    const finalTableY = (doc as any).lastAutoTable?.finalY ?? 150;
    let signY = finalTableY + 12;

    if (signY > 170) {
        doc.addPage('a4', 'landscape');
        signY = 25;
    }

    // Likert Interpretation Scale Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('SCORING & INTERPRETATION REFERENCE:', 14, signY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
        '4.20 - 5.00: Very High Need (Critical)  |  3.40 - 4.19: High Need  |  2.60 - 3.39: Moderate Need  |  1.80 - 2.59: Low Need  |  1.00 - 1.79: Very Low Need',
        14,
        signY + 4
    );

    // Signatures
    const sigTop = signY + 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text('Prepared by:', 14, sigTop);
    doc.text('____________________________________', 14, sigTop + 10);
    doc.text('CARE Center Guidance Staff / Counselor', 14, sigTop + 14);

    doc.text('Noted by:', 150, sigTop);
    doc.text('____________________________________', 150, sigTop + 10);
    doc.text('Campus CARE Center Director', 150, sigTop + 14);

    const fileName = `${sanitizeFileName(formTitle)}_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
};
