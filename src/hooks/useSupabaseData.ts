import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SupabaseHookOptions {
    table: string;
    select?: string;
    order?: { column: string; ascending?: boolean };
    eq?: { column: string; value: any };
    subscribe?: boolean;
}

/**
 * A generic hook to fetch and subscribe to data from a Supabase table.
 * @param options Configuration for the table, select fields, ordering, etc.
 * @returns An object containing the fetched data, loading state, and error message.
 */
export function useSupabaseData<T = any>({
    table,
    select = '*',
    order,
    eq,
    subscribe = false
}: SupabaseHookOptions) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const isSafeRealtimeSelect = !/[():]/.test(select);

    const matchesEqFilter = (row: any) => {
        if (!eq) return true;
        return row?.[eq.column] === eq.value;
    };

    const sortRows = (rows: T[]) => {
        if (!order?.column) return rows;

        const direction = order.ascending === false ? -1 : 1;
        return [...rows].sort((left: any, right: any) => {
            const leftValue = left?.[order.column];
            const rightValue = right?.[order.column];

            if (leftValue === rightValue) return 0;
            if (leftValue == null) return -1 * direction;
            if (rightValue == null) return 1 * direction;
            return leftValue > rightValue ? direction : -1 * direction;
        });
    };

    const fetchData = async () => {
        setLoading(true);
        let query = supabase.from(table).select(select);

        if (eq) {
            query = query.eq(eq.column, eq.value);
        }

        if (order) {
            query = query.order(order.column, { ascending: order.ascending ?? true });
        }

        const { data: result, error: fetchError } = await query;

        if (fetchError) {
            setError(fetchError.message);
        } else if (result) {
            setData(result as T[]);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        if (subscribe) {
            const channel = supabase
                .channel(`public:${table}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: table },
                    (payload: any) => {
                        if (!isSafeRealtimeSelect) {
                            fetchData();
                            return;
                        }

                        const rowId = payload.new?.id ?? payload.old?.id;
                        if (rowId == null) {
                            fetchData();
                            return;
                        }

                        setData((prev) => {
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
    }, [table, select, order?.column, order?.ascending, eq?.column, eq?.value, subscribe]);

    return { data, loading, error, refetch: fetchData };
}
