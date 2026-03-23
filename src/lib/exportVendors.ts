let jsPdfModulePromise: Promise<typeof import('jspdf')> | null = null;
let jsPdfAutoTablePromise: Promise<typeof import('jspdf-autotable')> | null = null;
let xlsxModulePromise: Promise<typeof import('xlsx')> | null = null;

export const loadJsPdf = async () => {
    const { jsPDF } = await (jsPdfModulePromise ??= import('jspdf'));
    return jsPDF;
};

export const loadJsPdfAutoTable = async () => {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
        jsPdfModulePromise ??= import('jspdf'),
        jsPdfAutoTablePromise ??= import('jspdf-autotable')
    ]);

    const autoTable = (autoTableModule as any).default || (autoTableModule as any).autoTable;
    if (typeof autoTable !== 'function') {
        throw new Error('Failed to load PDF table export support.');
    }

    return { jsPDF, autoTable };
};

export const loadXlsx = async () =>
    xlsxModulePromise ??= import('xlsx');
