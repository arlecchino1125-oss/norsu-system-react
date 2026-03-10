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
}

export interface RequestFilters {
    studentId?: string;
    department?: string;
    status?: string | string[];
    search?: string;
}

export interface AdmissionsFilters {
    search?: string;
    status?: string | string[];
    department?: string;
    course?: string;
}

