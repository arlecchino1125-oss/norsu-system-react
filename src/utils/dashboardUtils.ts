import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportPDF = (studentName: string, requests: any[]) => {
    const records = requests.filter((r: any) => r.student === studentName || r.student_name === studentName);
    const doc = new jsPDF();
    doc.text(`${studentName}'s History`, 14, 22);
    (doc as any).autoTable({
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

export const exportToExcel = (headers: string[], rows: any[][], fileName: string) => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const savePdf = (doc: any, fileName: string) => {
    doc.save(fileName);
};
