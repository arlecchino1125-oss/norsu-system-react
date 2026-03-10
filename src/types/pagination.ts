export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface PageResult<T> {
    rows: T[];
    total: number;
    page: number;
    pageSize: number;
    from: number;
    to: number;
}

export const clampPage = (value?: number) => {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.floor(Number(value)));
};

export const clampPageSize = (value?: number) => {
    if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
    return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(Number(value))));
};

export const toRange = (page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
    const safePage = clampPage(page);
    const safePageSize = clampPageSize(pageSize);
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    return { page: safePage, pageSize: safePageSize, from, to };
};

