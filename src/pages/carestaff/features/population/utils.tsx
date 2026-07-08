import { CARE_STUDENT_PAGE_SIZE } from './constants';

export const getCareStudentTotalPages = (totalItems: number) => Math.max(1, Math.ceil(Math.max(0, totalItems) / CARE_STUDENT_PAGE_SIZE));
export const waitForCareStudentRefreshAnimation = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const buildCareStudentPaginationItems = (page: number, totalPages: number) => {
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

export const renderCareStudentPaddingRows = (columnCount: number, visibleRowCount: number) => (
    Array.from({ length: Math.max(0, CARE_STUDENT_PAGE_SIZE - visibleRowCount) }, (_, index) => (
        <tr key={`student-table-padding-${columnCount}-${index}`} aria-hidden="true">
            <td colSpan={columnCount} className="h-[72px] bg-white">&nbsp;</td>
        </tr>
    ))
);

export const toDateTimeLocal = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};

export const formatDateTimeDisplay = (value?: string | null) => {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not recorded';
    return date.toLocaleString();
};

export const parseArchiveEntries = (value: any) => {
    if (!value) return [] as any[];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

export const deriveSchoolYearLabel = (entry: any) => {
    if (entry?.school_year && String(entry.school_year).trim()) {
        const raw = String(entry.school_year).trim();
        return raw.replace(/^AY\b/, 'SY');
    }
    const start = entry?.window_start ? new Date(entry.window_start) : null;
    const end = entry?.window_end ? new Date(entry.window_end) : null;
    if (start && !Number.isNaN(start.getTime()) && end && !Number.isNaN(end.getTime())) {
        return `SY ${Math.min(start.getFullYear(), end.getFullYear())}-${Math.max(start.getFullYear(), end.getFullYear())}`;
    }
    return '';
};

export const getArchivedSnapshotForSchoolYear = (student: any, schoolYear: string) => {
    if (!student || schoolYear === 'All') return null;
    const entries = parseArchiveEntries(student.course_year_archive);
    const matches = entries.filter((entry: any) => deriveSchoolYearLabel(entry) === schoolYear);
    if (matches.length === 0) return null;
    const sorted = [...matches].sort((a: any, b: any) => {
        const aTime = a?.archived_at ? new Date(a.archived_at).getTime() : 0;
        const bTime = b?.archived_at ? new Date(b.archived_at).getTime() : 0;
        return bTime - aTime;
    });
    return sorted[0];
};

export const isProfileIncompleteStep1 = (student: any) => {
    if (!student) return true;
    const requiredFields = [
        student.profile_picture_url,
        student.student_id,
        student.first_name,
        student.last_name,
        student.middle_name,
        student.street,
        student.city,
        student.province,
        student.zip_code,
        student.region,
        student.mobile,
        student.dob,
        student.sex,
        student.gender_identity,
        student.nationality,
        student.facebook_url,
        student.place_of_birth,
        student.religion,
        student.year_level,
        student.department,
        student.course,
        student.civil_status
    ];
    return requiredFields.some(val => !String(val || '').trim());
};
