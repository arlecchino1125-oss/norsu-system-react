import { loadJsPdfAutoTable, loadXlsx } from '../../../../lib/exportVendors';
import { escapeSpreadsheetRows } from '../../../../utils/inputSecurity';

export interface PeerDemographics {
    sexCounts: { female: number; male: number; other: number };
    genderCounts: { cisgender: number; transgender: number; nonBinary: number; preferNotToSay: number; other: number };
    total: number;
}

export interface PeerProcessedQuestion {
    questionIndex: number;
    questionId: number;
    questionText: string;
    questionType: string;
    counts: [number, number, number, number, number];
    percentages: [number, number, number, number, number];
    total: number;
    weightedMean: number;
    descriptiveEquivalent: string;
    rank: number;
}

export interface PeerEvaluationExportPayload {
    eventTitle: string;
    eventDate?: string | null;
    formTitle: string;
    questions: Array<{
        id: number;
        question_text: string;
        question_type?: string;
        order_index?: number;
        scale_max?: number;
    }>;
    responses: Array<{
        id: number;
        student_id: string;
        student_name?: string | null;
        department?: string | null;
        course?: string | null;
        year_level?: string | null;
        submitted_at: string;
        students?: {
            sex?: string | null;
            gender_identity?: string | null;
            department?: string | null;
            course?: string | null;
            year_level?: string | null;
            first_name?: string | null;
            last_name?: string | null;
        } | null;
    }>;
    answers: Array<{
        response_id: number;
        question_id: number;
        answer_value?: number | null;
        answer_text?: string | null;
    }>;
}

export const computePeerDemographics = (responses: PeerEvaluationExportPayload['responses']): PeerDemographics => {
    let female = 0, male = 0, sexOther = 0;
    let cisgender = 0, transgender = 0, nonBinary = 0, preferNotToSay = 0, genderOther = 0;

    for (const r of responses) {
        const rawSex = String(r.students?.sex || '').trim().toLowerCase();
        if (rawSex === 'female' || rawSex === 'f') female += 1;
        else if (rawSex === 'male' || rawSex === 'm') male += 1;
        else sexOther += 1;

        const rawGender = String(r.students?.gender_identity || '').trim().toLowerCase();
        if (rawGender.includes('cis')) cisgender += 1;
        else if (rawGender.includes('trans')) transgender += 1;
        else if (rawGender.includes('non-binary') || rawGender.includes('nonbinary')) nonBinary += 1;
        else if (rawGender.includes('prefer not')) preferNotToSay += 1;
        else genderOther += 1;
    }

    return {
        sexCounts: { female, male, other: sexOther },
        genderCounts: { cisgender, transgender, nonBinary, preferNotToSay, other: genderOther },
        total: responses.length
    };
};

export const getEvaluationDescriptiveEquivalent = (mean: number): string => {
    if (!mean || mean <= 0) return 'No Data';
    if (mean >= 4.20) return 'Excellent / Outstanding';
    if (mean >= 3.40) return 'Very Satisfactory';
    if (mean >= 2.60) return 'Satisfactory';
    if (mean >= 1.80) return 'Fair / Needs Improvement';
    return 'Poor / Unsatisfactory';
};

export const sanitizeFileName = (name: string): string =>
    name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 60);

export const processPeerQuestionsForExport = (
    questions: PeerEvaluationExportPayload['questions'],
    answers: PeerEvaluationExportPayload['answers']
) => {
    const sortedQuestions = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const answerMap = new Map<number, Array<number | string>>();
    for (const ans of answers) {
        if (!answerMap.has(ans.question_id)) {
            answerMap.set(ans.question_id, []);
        }
        const val = ans.answer_value ?? ans.answer_text ?? '';
        answerMap.get(ans.question_id)!.push(val);
    }

    const items: PeerProcessedQuestion[] = sortedQuestions.map((q, idx) => {
        const isScale = q.question_type !== 'text' && q.question_type !== 'open_ended';
        const vals = answerMap.get(q.id) ?? [];
        const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];

        if (isScale) {
            for (const v of vals) {
                const num = Number(v);
                if (num >= 1 && num <= 5) {
                    counts[num - 1] += 1;
                }
            }
        }

        const total = isScale ? counts.reduce((sum, n) => sum + n, 0) : vals.length;
        const weightedSum = counts.reduce((sum, n, i) => sum + n * (i + 1), 0);
        const weightedMean = isScale && total > 0 ? Number((weightedSum / total).toFixed(2)) : 0;
        const percentages: [number, number, number, number, number] = counts.map(c =>
            total > 0 ? Number(((c / total) * 100).toFixed(1)) : 0
        ) as [number, number, number, number, number];

        return {
            questionIndex: idx + 1,
            questionId: q.id,
            questionText: q.question_text,
            questionType: q.question_type || 'rating',
            counts,
            percentages,
            total,
            weightedMean,
            descriptiveEquivalent: isScale ? getEvaluationDescriptiveEquivalent(weightedMean) : 'Open-ended Text',
            rank: 0
        };
    });

    const scaleItems = items.filter(item => item.questionType !== 'text' && item.questionType !== 'open_ended' && item.total > 0);
    const sortedByMean = [...scaleItems].sort((a, b) => b.weightedMean - a.weightedMean);
    let currentRank = 1;
    for (let i = 0; i < sortedByMean.length; i += 1) {
        if (i > 0 && sortedByMean[i].weightedMean < sortedByMean[i - 1].weightedMean) {
            currentRank = i + 1;
        }
        sortedByMean[i].rank = currentRank;
    }
    const rankMap = new Map<number, number>(sortedByMean.map(item => [item.questionId, item.rank]));
    items.forEach(item => {
        item.rank = rankMap.get(item.questionId) ?? 0;
    });

    const grandMean = scaleItems.length > 0
        ? Number((scaleItems.reduce((acc, curr) => acc + curr.weightedMean, 0) / scaleItems.length).toFixed(2))
        : 0;

    return {
        items,
        scaleItems,
        grandMean,
        grandMeanEquivalent: getEvaluationDescriptiveEquivalent(grandMean)
    };
};

export const exportPeerEventEvaluationExcel = async ({
    eventTitle,
    eventDate,
    formTitle,
    questions,
    responses,
    answers
}: PeerEvaluationExportPayload): Promise<void> => {
    const XLSX = await loadXlsx();
    const demographics = computePeerDemographics(responses);
    const { items, grandMean, grandMeanEquivalent } = processPeerQuestionsForExport(questions, answers);

    const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const totalDemo = responses.length;

    // Sheet 1: Executive Summary
    const summaryRows: any[][] = [
        ['NEGROS ORIENTAL STATE UNIVERSITY - GUIHULNGAN CAMPUS'],
        ['CARE CENTER - PEER FACILITATOR EVENT EVALUATION REPORT'],
        [],
        ['Event Title:', eventTitle],
        ['Event Date:', eventDate || 'Not specified'],
        ['Evaluation Form:', formTitle],
        ['Total Respondents (N):', totalDemo],
        ['Overall Evaluation Grand Mean:', grandMean > 0 ? grandMean.toFixed(2) : 'N/A'],
        ['Descriptive Rating:', grandMeanEquivalent],
        ['Report Generated Date:', generatedDate],
        [],
        ['========================================================================================'],
        ['RESPONDENT DEMOGRAPHIC PROFILE (GENDER & SEX BREAKDOWN)'],
        ['========================================================================================'],
        ['Demographic Category', 'Identifier / Group', 'Count (f)', 'Percentage (%)'],
        ['Sex Assigned at Birth', 'Female', demographics.sexCounts.female, totalDemo > 0 ? `${((demographics.sexCounts.female / totalDemo) * 100).toFixed(1)}%` : '0%'],
        ['Sex Assigned at Birth', 'Male', demographics.sexCounts.male, totalDemo > 0 ? `${((demographics.sexCounts.male / totalDemo) * 100).toFixed(1)}%` : '0%'],
        ...(demographics.sexCounts.other > 0 ? [['Sex Assigned at Birth', 'Other / Unspecified', demographics.sexCounts.other, totalDemo > 0 ? `${((demographics.sexCounts.other / totalDemo) * 100).toFixed(1)}%` : '0%']] : []),
        ['Gender Identity', 'CIS Gender', demographics.genderCounts.cisgender, totalDemo > 0 ? `${((demographics.genderCounts.cisgender / totalDemo) * 100).toFixed(1)}%` : '0%'],
        ['Gender Identity', 'Transgender', demographics.genderCounts.transgender, totalDemo > 0 ? `${((demographics.genderCounts.transgender / totalDemo) * 100).toFixed(1)}%` : '0%'],
        ['Gender Identity', 'Non-binary gender', demographics.genderCounts.nonBinary, totalDemo > 0 ? `${((demographics.genderCounts.nonBinary / totalDemo) * 100).toFixed(1)}%` : '0%'],
        ...(demographics.genderCounts.preferNotToSay > 0 ? [['Gender Identity', 'Prefer not to say', demographics.genderCounts.preferNotToSay, totalDemo > 0 ? `${((demographics.genderCounts.preferNotToSay / totalDemo) * 100).toFixed(1)}%` : '0%']] : []),
        ...(demographics.genderCounts.other > 0 ? [['Gender Identity', 'Other / Unspecified', demographics.genderCounts.other, totalDemo > 0 ? `${((demographics.genderCounts.other / totalDemo) * 100).toFixed(1)}%` : '0%']] : []),
        []
    ];

    // Sheet 2: Item Analysis
    const detailHeaders = [
        'Item #',
        'Evaluation Question / Criteria',
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
        'Descriptive Rating',
        'Rank'
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

    // Sheet 3: Individual Student Responses
    const sortedQuestions = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const answersByResponse = new Map<number, Map<number, string | number>>();
    for (const ans of answers) {
        let respMap = answersByResponse.get(ans.response_id);
        if (!respMap) {
            respMap = new Map();
            answersByResponse.set(ans.response_id, respMap);
        }
        respMap.set(ans.question_id, ans.answer_value ?? ans.answer_text ?? '—');
    }

    const respHeaders = [
        'Student Name',
        'Student ID',
        'College / Department',
        'Course',
        'Year Level',
        'Sex Assigned at Birth',
        'Gender Identity',
        'Submitted At',
        ...sortedQuestions.map((q, i) => `Q${i + 1}: ${q.question_text}`)
    ];

    const respRows = responses.map(r => {
        const studentMap = answersByResponse.get(r.id);
        const name = r.student_name || [r.students?.first_name, r.students?.last_name].filter(Boolean).join(' ') || '—';
        return [
            name,
            r.student_id || '—',
            r.department || r.students?.department || '—',
            r.course || r.students?.course || '—',
            r.year_level || r.students?.year_level || '—',
            r.students?.sex || '—',
            r.students?.gender_identity || '—',
            r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—',
            ...sortedQuestions.map(q => studentMap?.get(q.id) ?? '—')
        ];
    });

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet(escapeSpreadsheetRows(summaryRows));
    summarySheet['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 55 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

    const detailSheet = XLSX.utils.aoa_to_sheet(escapeSpreadsheetRows([detailHeaders, ...detailRows]));
    detailSheet['!cols'] = [
        { wch: 8 }, { wch: 50 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
        { wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Item Analysis');

    const responsesSheet = XLSX.utils.aoa_to_sheet(escapeSpreadsheetRows([respHeaders, ...respRows]));
    responsesSheet['!cols'] = [
        { wch: 25 }, { wch: 15 }, { wch: 22 }, { wch: 22 }, { wch: 12 },
        { wch: 14 }, { wch: 18 }, { wch: 22 },
        ...sortedQuestions.map(q => ({ wch: (q.question_type === 'text' || q.question_type === 'open_ended') ? 45 : 12 }))
    ];
    XLSX.utils.book_append_sheet(workbook, responsesSheet, 'Student Responses');

    const fileName = `${sanitizeFileName(eventTitle)}_Peer_Evaluation_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};

export const exportPeerEventEvaluationPdf = async ({
    eventTitle,
    eventDate,
    formTitle,
    questions,
    responses,
    answers
}: PeerEvaluationExportPayload): Promise<void> => {
    const { jsPDF, autoTable } = await loadJsPdfAutoTable();
    const demographics = computePeerDemographics(responses);
    const { items, grandMean, grandMeanEquivalent } = processPeerQuestionsForExport(questions, answers);

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // ── PAGE 1: HEADER & EXECUTIVE SUMMARY ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('NEGROS ORIENTAL STATE UNIVERSITY - GUIHULNGAN CAMPUS', 14, 13);

    doc.setFontSize(10.5);
    doc.setTextColor(5, 150, 105);
    doc.text('CARE CENTER - PEER FACILITATOR EVENT EVALUATION REPORT', 14, 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${generatedDate}  |  Event: ${eventTitle} (${eventDate || 'N/A'})`, 14, 24);

    // Metadata grid
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 27, 269, 14, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Total Respondents:', 18, 33);
    doc.text('Evaluation Grand Mean:', 90, 33);
    doc.text('Overall Descriptive Rating:', 180, 33);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(responses.length.toLocaleString(), 48, 33);
    doc.text(grandMean > 0 ? grandMean.toFixed(2) : 'N/A', 130, 33);
    doc.text(grandMeanEquivalent, 222, 33);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Form: ${formTitle}`, 18, 38);

    // Demographic Table
    const totalDemo = responses.length;
    const demoBody: any[][] = [
        [
            'Female',
            demographics.sexCounts.female.toLocaleString(),
            `${totalDemo > 0 ? ((demographics.sexCounts.female / totalDemo) * 100).toFixed(1) : 0}%`,
            'CIS Gender',
            demographics.genderCounts.cisgender.toLocaleString(),
            `${totalDemo > 0 ? ((demographics.genderCounts.cisgender / totalDemo) * 100).toFixed(1) : 0}%`
        ],
        [
            'Male',
            demographics.sexCounts.male.toLocaleString(),
            `${totalDemo > 0 ? ((demographics.sexCounts.male / totalDemo) * 100).toFixed(1) : 0}%`,
            'Transgender',
            demographics.genderCounts.transgender.toLocaleString(),
            `${totalDemo > 0 ? ((demographics.genderCounts.transgender / totalDemo) * 100).toFixed(1) : 0}%`
        ],
        [
            demographics.sexCounts.other > 0 ? 'Other / Unspecified' : '',
            demographics.sexCounts.other > 0 ? demographics.sexCounts.other.toLocaleString() : '',
            demographics.sexCounts.other > 0 ? `${((demographics.sexCounts.other / totalDemo) * 100).toFixed(1)}%` : '',
            'Non-binary gender',
            demographics.genderCounts.nonBinary.toLocaleString(),
            `${totalDemo > 0 ? ((demographics.genderCounts.nonBinary / totalDemo) * 100).toFixed(1) : 0}%`
        ]
    ];

    autoTable(doc, {
        head: [['Sex Assigned at Birth', 'Count', '%', 'Gender Identity', 'Count', '%']],
        body: demoBody,
        startY: 45,
        styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak' },
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 48, fontStyle: 'bold' },
            1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 48, fontStyle: 'bold' },
            4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            5: { cellWidth: 20, halign: 'center' }
        }
    });

    // ── PAGE 2: COMPREHENSIVE ITEM-BY-ITEM STATISTICAL ANALYSIS ──
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
            ['#', 'Evaluation Question / Criteria', '1 (f / %)', '2 (f / %)', '3 (f / %)', '4 (f / %)', '5 (f / %)', 'Total N', 'WM', 'Interpretation', 'Rank']
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
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', halign: 'center' },
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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('SCORING & INTERPRETATION REFERENCE:', 14, signY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
        '4.20 - 5.00: Excellent / Outstanding  |  3.40 - 4.19: Very Satisfactory  |  2.60 - 3.39: Satisfactory  |  1.80 - 2.59: Fair / Needs Improvement  |  1.00 - 1.79: Poor / Unsatisfactory',
        14,
        signY + 4
    );

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

    const fileName = `${sanitizeFileName(eventTitle)}_Peer_Evaluation_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
};
