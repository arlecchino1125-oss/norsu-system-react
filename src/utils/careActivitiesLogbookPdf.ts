import { loadJsPdfAutoTable } from '../lib/exportVendors';
import type { CareActivityLogEntry } from './careActivitiesLogbook';
import { monthLabelOf } from './peerLogbook';

/** The source form's columns (mirrors peerLogbookPdf). Shared with the on-screen table viewer. */
export const CARE_LOGBOOK_COLUMNS = [
    'Date',
    'Type of Activity/Interaction',
    'Action Taken/Assistance Provided',
    'Speaker/s',
    'Remarks/Follow-up Plan',
    'Signature of PEERkada'
];

const buildRows = (entries: CareActivityLogEntry[]): string[][] =>
    entries.map((entry) => [
        new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString(),
        entry.activity_type,
        entry.action_taken,
        entry.speakers || '',
        entry.remarks || '',
        '' // signed by hand on the printed sheet
    ]);

export const exportCareActivitiesLogbookPdf = async ({
    peerName, programYearSection, monthKey, entries
}: {
    peerName: string;
    programYearSection: string;
    monthKey: string;
    entries: CareActivityLogEntry[];
}): Promise<void> => {
    const { jsPDF, autoTable } = await loadJsPdfAutoTable();
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(10);
    doc.text('OFFICE OF THE CAMPUS CARE CENTER DIRECTOR', 14, 14);
    doc.text('GUIHULNGAN CAMPUS', 14, 19);
    doc.setFontSize(12);
    doc.text('CARE Center-Peer Facilitator Logbook (CARE Activities)', 14, 27);
    doc.setFontSize(10);
    doc.text(`Peer Facilitator Name: ${peerName}`, 14, 35);
    doc.text(`Program/Year/Section: ${programYearSection}`, 14, 40);
    doc.text(`Month Covered: ${monthLabelOf(monthKey)}`, 14, 45);

    autoTable(doc, {
        head: [CARE_LOGBOOK_COLUMNS],
        body: buildRows(entries),
        startY: 50,
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
        columnStyles: { 2: { cellWidth: 55 }, 4: { cellWidth: 40 } }
    });

    const endY = (doc as any).lastAutoTable?.finalY ?? 50;
    doc.text('Peer Facilitator Signature: _________________________________', 14, endY + 15);
    doc.text('Reviewed by (Guidance Center Staff): _______________________', 14, endY + 23);

    doc.save(`care-activities-logbook-${monthKey}.pdf`);
};
