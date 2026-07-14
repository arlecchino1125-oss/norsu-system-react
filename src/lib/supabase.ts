import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { getSupabaseAuthStorageKey } from './authLogout';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const SUPABASE_AUTH_STORAGE_KEY = getSupabaseAuthStorageKey(supabaseUrl);
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
        storageKey: SUPABASE_AUTH_STORAGE_KEY
    }
});
