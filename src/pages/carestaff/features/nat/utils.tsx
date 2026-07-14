import {
    APPROVED_STATUS,
    ENROLLED_STATUS,
    FAIL_STATUS,
    INTERVIEW_STATUS,
    NAT_PAGE_SIZE,
    PASS_STATUS,
    UNSUCCESSFUL_STATUS
} from './constants';

export const getTotalPages = (totalItems: number) => Math.max(1, Math.ceil(Math.max(0, totalItems) / NAT_PAGE_SIZE));

export const paginateLocalRows = <T,>(rows: T[], page: number) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safePage = Math.max(1, page);
    const start = (safePage - 1) * NAT_PAGE_SIZE;
    return safeRows.slice(start, start + NAT_PAGE_SIZE);
};

export const buildPaginationItems = (page: number, totalPages: number) => {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: Array<number | string> = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) items.push('left-ellipsis');
    for (let current = start; current <= end; current += 1) {
        items.push(current);
    }
    if (end < totalPages - 1) items.push('right-ellipsis');

    items.push(totalPages);
    return items;
};

export const renderTablePaddingRows = (columnCount: number, visibleRowCount: number) => (
    Array.from({ length: Math.max(0, NAT_PAGE_SIZE - visibleRowCount) }, (_, index) => (
        <tr key={`table-padding-${columnCount}-${index}`} aria-hidden="true">
            <td colSpan={columnCount} className="h-[72px] bg-white">&nbsp;</td>
        </tr>
    ))
);

export const isNatFinalizedStatus = (status: unknown) => {
    const value = String(status || '');
    return value === 'Passed'
        || value === ENROLLED_STATUS
        || value === FAIL_STATUS
        || value === PASS_STATUS
        || value === APPROVED_STATUS
        || value === INTERVIEW_STATUS
        || value.includes('Forwarded to')
        || value.includes(UNSUCCESSFUL_STATUS);
};

export const hasTakenNatStatus = (status: unknown) => {
    const value = String(status || '');
    return value === 'Test Taken' || isNatFinalizedStatus(value);
};

export const canMarkNatPassed = (application: any) =>
    Boolean(application?.time_in) && Boolean(application?.time_out);

export const isNatForwardedStatus = (status: unknown) => String(status || '').includes('Forwarded to');
export const isNatRejectedStatus = (status: unknown) => String(status || '') === FAIL_STATUS || String(status || '').includes(UNSUCCESSFUL_STATUS);
export const isNatEnrolledStatus = (status: unknown) => String(status || '') === ENROLLED_STATUS;

export const normalizeReferenceId = (value: unknown) => String(value || '').trim();

export const normalizeApplicantName = (value: unknown) => String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const buildApplicantName = (app: any) => [
    app?.first_name,
    app?.middle_name,
    app?.last_name,
    app?.suffix
]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');

export const getApplicantRouteLabel = (app: any) => {
    const currentChoice = Number(app?.current_choice || 1);
    if (currentChoice >= 3) {
        return `3rd Choice - ${app?.alt_course_2 || 'Not assigned'}`;
    }
    if (currentChoice === 2) {
        return `2nd Choice - ${app?.alt_course_1 || 'Not assigned'}`;
    }
    return `1st Choice - ${app?.priority_course || 'Not assigned'}`;
};

export const getSheetColumnValue = (row: Record<string, unknown>, aliases: string[]) => {
    const matchKey = Object.keys(row).find((key) => aliases.includes(
        String(key || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_')
    ));
    return matchKey ? row[matchKey] : '';
};

export const createEmptyScheduleForm = () => ({
    date: '',
    venue: '',
    timeSlots: [{ start: '08:00', end: '09:00', slots: '' }]
});
