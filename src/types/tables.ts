import type { Database } from './database';

/** Name of any table in the public schema, derived from the generated DB types. */
export type TableName = keyof Database['public']['Tables'] & string;
