import { loadJsPdf, loadJsPdfAutoTable, loadXlsx } from '../lib/exportVendors';

/**
 * Export a single counseling request as a PDF form.
 */
export const exportRequestPDF = async (record: any) => {
    const jsPDF = await loadJsPdf();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('NEGROS ORIENTAL STATE UNIVERSITY', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Office of the Director, Counseling, Assessment, Resources, and Enhancement Center', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const formTitle = record.request_type === 'Dean Referral'
        ? 'COUNSELING REFERRAL FORM'
        : 'STUDENT SELF-REFERRAL FOR COUNSELING FORM';
    doc.text(formTitle, pageWidth / 2, 30, { align: 'center' });

    let y = 40;
    const leftMargin = 14;
    const labelWidth = 55;

    const addField = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(label + ':', leftMargin, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value || 'N/A', pageWidth - leftMargin - labelWidth - 10);
        doc.text(lines, leftMargin + labelWidth, y);
        y += Math.max(lines.length * 5, 7);
    };

    const addSection = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(label + ':', leftMargin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value || 'N/A', pageWidth - leftMargin * 2);
        doc.text(lines, leftMargin, y);
        y += lines.length * 5 + 4;
    };

    // Student Info
    addField('Name of Student', record.student_name || '');
    addField('Course & Year', record.course_year || '');
    addField('Contact Number', record.contact_number || '');
    addField('Date Submitted', record.created_at ? new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '');
    addField('Request Type', record.request_type || '');
    addField('Status', record.status || '');

    y += 4;

    // Form fields
    addSection('Reason/s for Requesting Counseling', record.reason_for_referral || record.description || '');
    addSection('Personal Actions Taken', record.personal_actions_taken || '');
    addSection('Date / Duration of Concern', record.date_duration_of_concern || '');

    // Referral-specific fields
    if (record.referred_by) {
        y += 2;
        doc.setDrawColor(200);
        doc.line(leftMargin, y, pageWidth - leftMargin, y);
        y += 6;
        addField('Referred by', record.referred_by);
        addField('Referrer Contact', record.referrer_contact_number || '');
        addField('Relationship', record.relationship_with_student || '');
        addSection('Actions Made by Referring Person', record.actions_made || '');
        addSection('Date / Duration of Observations', record.date_duration_of_observations || '');
    }

    // Scheduled date
    if (record.scheduled_date) {
        addField('Scheduled Session', new Date(record.scheduled_date).toLocaleString());
    }

    // Resolution notes
    if (record.resolution_notes) {
        addSection('Resolution Notes', record.resolution_notes);
    }

    doc.save(`${record.student_name || 'Student'}_Counseling_Form.pdf`);
};

/**
 * Legacy: export a simple history table PDF.
 */
export const exportPDF = async (studentName: string, requests: any[]) => {
    const records = requests.filter((r: any) => r.student === studentName || r.student_name === studentName);
    const { jsPDF, autoTable } = await loadJsPdfAutoTable();
    const doc = new jsPDF();
    doc.text(`${studentName}'s History`, 14, 22);
    autoTable(doc, {
        head: [["Date", "Type", "Status", "ID"]],
        body: records.map((r: any) => [
            new Date(r.created_at || r.date).toLocaleDateString(),
            r.request_type || r.type,
            r.status,
            r.id
        ]),
        startY: 30,
    });
    doc.save(`${studentName}_History.pdf`);
};

export const exportToExcel = async (headers: string[], rows: any[][], fileName: string) => {
    const XLSX = await loadXlsx();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToCsv = async (headers: string[], rows: any[][], fileName: string) => {
    const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const exportTablePdf = async (
    title: string,
    headers: string[],
    rows: any[][],
    fileName: string
) => {
    const { jsPDF, autoTable } = await loadJsPdfAutoTable();
    const doc = new jsPDF({
        orientation: headers.length > 6 ? 'landscape' : 'portrait'
    });

    doc.setFontSize(14);
    doc.text(title, 14, 18);
    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 26,
        styles: {
            fontSize: 8,
            cellPadding: 2.5
        },
        headStyles: {
            fillColor: [31, 41, 55]
        }
    });
    doc.save(fileName);
};

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const printTableDocument = (
    title: string,
    headers: string[],
    rows: any[][],
    subtitle?: string
) => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
        throw new Error('Unable to open the print window.');
    }

    const thead = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
    const tbody = rows.map((row) => `
        <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
    `).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>${escapeHtml(title)}</title>
    <style>
        @page { size: landscape; margin: 12mm; }
        body { font-family: Arial, sans-serif; color: #111827; padding: 8px; }
        h1 { font-size: 20px; margin: 0 0 8px; }
        p { font-size: 12px; margin: 0 0 16px; color: #4b5563; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; vertical-align: top; word-break: break-word; }
        th { background: #f3f4f6; text-align: left; }
        tr:nth-child(even) td { background: #fafafa; }
    </style>
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
    <table>
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
    </table>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
};

export const savePdf = (doc: any, fileName: string) => {
    doc.save(fileName);
};
