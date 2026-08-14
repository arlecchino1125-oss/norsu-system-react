export interface PageParams {
    page?: number;
    pageSize?: number;
}

export interface SortParams {
    column: string;
    ascending?: boolean;
}

export interface StudentFilters {
    search?: string;
    status?: string;
    department?: string;
    course?: string;
    yearLevel?: string;
    section?: string;
    annotationStudentIds?: Array<string | number>;
    /** Boolean flag columns on `students` to match (OR semantics when multiple). */
    backgroundFlags?: string[];
}

export interface RequestFilters {
    studentId?: string;
    department?: string;
    status?: string | string[];
    search?: string;
    /** YYYY-MM-DD — matches rows whose scheduled_date falls on this day */
    scheduledOn?: string;
}

export interface AdmissionsFilters {
    search?: string;
    status?: string | string[];
    department?: string;
    course?: string;
}
