import { clampPage, clampPageSize, type PageResult, toRange } from '../types/pagination';
import type { PageParams, SortParams } from '../types/query';

export const resolvePageParams = (pageParams?: PageParams) => {
    const page = clampPage(pageParams?.page);
    const pageSize = clampPageSize(pageParams?.pageSize);
    return toRange(page, pageSize);
};

export const applySort = (query: any, sort?: SortParams) => {
    if (!sort?.column) return query;
    return query.order(sort.column, { ascending: sort.ascending ?? true });
};

export const toPageResult = <T>(
    rows: T[] | null | undefined,
    total: number | null,
    pageParams?: PageParams
): PageResult<T> => {
    const { page, pageSize, from, to } = resolvePageParams(pageParams);
    return {
        rows: rows || [],
        total: total || 0,
        page,
        pageSize,
        from,
        to
    };
};

