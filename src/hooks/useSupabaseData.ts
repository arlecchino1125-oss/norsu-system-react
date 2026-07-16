import { useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TableName } from '../types/tables';

interface SupabaseHookOptions {
    table: TableName;
    select?: string;
    order?: { column: string; ascending?: boolean };
    eq?: { column: string; value: any };
    subscribe?: boolean;
    fetchAll?: boolean;
}

/**
 * A generic hook to fetch and subscribe to data from a Supabase table.
 * Uses React Query for global caching to prevent redundant requests.
 * @param options Configuration for the table, select fields, ordering, etc.
 * @returns An object containing the fetched data, loading state, and error message.
 */
export function useSupabaseData<T = any>({
    table,
    select = '*',
    order,
    eq,
    subscribe = false,
    fetchAll = false
}: SupabaseHookOptions) {
    const queryClient = useQueryClient();
    const queryKey = useMemo(
        () => [table, select, order?.column, order?.ascending, eq?.column, eq?.value, fetchAll],
        [table, select, order?.column, order?.ascending, eq?.column, eq?.value, fetchAll]
    );

    const isSafeRealtimeSelect = !/[():]/.test(select);

    const eqColumn = eq?.column;
    const eqValue = eq?.value;
    const matchesEqFilter = useCallback((row: any) => {
        if (!eqColumn) return true;
        return row?.[eqColumn] === eqValue;
    }, [eqColumn, eqValue]);

    const orderColumn = order?.column;
    const orderAscending = order?.ascending;
    const sortRows = useCallback((rows: T[]) => {
        if (!orderColumn) return rows;

        const direction = orderAscending === false ? -1 : 1;
        return [...rows].sort((left: any, right: any) => {
            const leftValue = left?.[orderColumn];
            const rightValue = right?.[orderColumn];

            if (leftValue === rightValue) return 0;
            if (leftValue == null) return -1 * direction;
            if (rightValue == null) return 1 * direction;
            return leftValue > rightValue ? direction : -1 * direction;
        });
    }, [orderColumn, orderAscending]);

    const { data: qData, isLoading: loading, error: qError, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (fetchAll) {
                let allRows: any[] = [];
                let start = 0;
                const limit = 1000;
                while (true) {
                    // select is a dynamic string, so row types can't be inferred; T is the contract
                    let query: any = supabase.from(table).select(select);
                    if (eq) {
                        query = query.eq(eq.column, eq.value);
                    }
                    if (order) {
                        query = query.order(order.column, { ascending: order.ascending ?? true });
                    }
                    query = query.range(start, start + limit - 1);
                    const { data: result, error: fetchError } = await query;
                    if (fetchError) throw fetchError;
                    if (!result || result.length === 0) break;
                    allRows = allRows.concat(result);
                    if (result.length < limit) break;
                    start += limit;
                }
                return allRows as T[];
            } else {
                let query: any = supabase.from(table).select(select);
                if (eq) {
                    query = query.eq(eq.column, eq.value);
                }
                if (order) {
                    query = query.order(order.column, { ascending: order.ascending ?? true });
                }
                const { data: result, error: fetchError } = await query;
                if (fetchError) throw fetchError;
                return result as T[];
            }
        }
    });

    const data = (qData as T[]) || [];
    const error = qError ? qError.message : null;

    // False positive: cleanup below does call supabase.removeChannel(channel) —
    // the detector doesn't recognize Supabase's client.removeChannel() cleanup
    // convention (it looks for .unsubscribe() on the subscribed object itself).
    // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
    useEffect(() => {
        if (subscribe) {
            const channel = supabase
                .channel(`public:${table}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: table },
                    (payload: any) => {
                        if (!isSafeRealtimeSelect) {
                            refetch();
                            return;
                        }

                        const rowId = payload.new?.id ?? payload.old?.id;
                        if (rowId == null) {
                            refetch();
                            return;
                        }

                        queryClient.setQueryData(queryKey, (prev: T[] | undefined) => {
                            if (!prev) return prev;
                            const filtered = prev.filter((row: any) => row?.id !== rowId);

                            if (payload.eventType === 'DELETE') {
                                return sortRows(filtered);
                            }

                            if (!matchesEqFilter(payload.new)) {
                                return sortRows(filtered);
                            }

                            return sortRows([payload.new as T, ...filtered]);
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [table, queryKey, subscribe, queryClient, refetch, isSafeRealtimeSelect, sortRows, matchesEqFilter]);

    return { data, loading, error, refetch };
}
