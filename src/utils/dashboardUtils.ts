import { loadJsPdfAutoTable, loadXlsx } from '../lib/exportVendors';
import { buildCsv, escapeSpreadsheetRows } from './inputSecurity';

export const savePdf = (doc: any, fileName: string) => {
    doc.save(fileName);
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
    savePdf(doc, `${studentName}_History.pdf`);
};

export const exportToExcel = async (headers: string[], rows: any[][], fileName: string) => {
    const XLSX = await loadXlsx();
    const worksheet = XLSX.utils.aoa_to_sheet(escapeSpreadsheetRows([headers, ...rows]));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToCsv = async (headers: string[], rows: any[][], fileName: string) => {
    const csv = buildCsv([headers, ...rows]);

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
    savePdf(doc, fileName);
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
