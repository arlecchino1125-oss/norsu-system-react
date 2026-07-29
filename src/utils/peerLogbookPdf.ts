import { loadJsPdfAutoTable } from '../lib/exportVendors';
import type { PeerLogEntry } from '../components/peerLogbook/PeerLogEntryModal';
import { entryInitials, monthLabelOf } from './peerLogbook';

/** The source form's columns, in its order. The PDF is the only place this layout exists. */
export const LOGBOOK_COLUMNS = [
    'Date',
    'Type of Activity/Interaction',
    'Name of Student Assisted',
    'Concern/Topic Discussed',
    'Action Taken/Assistance Provided',
    'Referred to Guidance (Yes/No)',
    'Remarks/Follow-up Plan',
    'Signature of PEERkada'
];

export const buildLogbookRows = (entries: PeerLogEntry[]): string[][] =>
    entries.map((entry) => [
        new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString(),
        entry.activity_type,
        entryInitials(entry),
        entry.concern,
        entry.action_taken,
        entry.referred ? 'Yes' : 'No',
        entry.remarks || '',
        ''  // signed by hand on the printed sheet
    ]);

export const exportLogbookPdf = async ({
    peerName, programYearSection, monthKey, entries, reviewerName
}: {
    peerName: string;
    programYearSection: string;
    monthKey: string;
    entries: PeerLogEntry[];
    reviewerName?: string | null;
}): Promise<void> => {
    const { jsPDF, autoTable } = await loadJsPdfAutoTable();
    // Landscape: eight columns of prose do not fit portrait at a readable size.
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(10);
    doc.text('OFFICE OF THE CAMPUS CARE CENTER DIRECTOR', 14, 14);
    doc.text('GUIHULNGAN CAMPUS', 14, 19);
    doc.setFontSize(12);
    doc.text('CARE Center-Peer Facilitator Logbook (Peer Support)', 14, 27);
    doc.setFontSize(10);
    doc.text(`Peer Facilitator Name: ${peerName}`, 14, 35);
    doc.text(`Program/Year/Section: ${programYearSection}`, 14, 40);
    doc.text(`Month Covered: ${monthLabelOf(monthKey)}`, 14, 45);

    autoTable(doc, {
        head: [LOGBOOK_COLUMNS],
        body: buildLogbookRows(entries),
        startY: 50,
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
        columnStyles: { 3: { cellWidth: 45 }, 4: { cellWidth: 45 }, 6: { cellWidth: 35 } }
    });

    const endY = (doc as any).lastAutoTable?.finalY ?? 50;
    doc.text('Peer Facilitator Signature: _________________________________', 14, endY + 15);
    doc.text(`Reviewed by (Guidance Center Staff): ${reviewerName || '_______________________'}`, 14, endY + 23);

    doc.save(`peer-support-logbook-${monthKey}.pdf`);
};
