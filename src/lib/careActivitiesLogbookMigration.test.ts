import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260805031646_care_activities_logbook.sql'),
    'utf8'
);

describe('care activities logbook migration', () => {
    it('keeps one logbook per facilitator per month', () => {
        expect(migration).toMatch(/CREATE UNIQUE INDEX care_activities_logbooks_student_month\s+ON public\.care_activities_logbooks \(student_id, month\)/i);
    });

    it('pins the month column to the first of the month', () => {
        expect(migration).toMatch(/CHECK \(EXTRACT\(DAY FROM month\) = 1\)/i);
    });

    it('confines an entry date to its logbook month declaratively', () => {
        expect(migration).toMatch(/FOREIGN KEY \(logbook_id, logbook_month\)\s+REFERENCES public\.care_activities_logbooks \(id, month\)/i);
        expect(migration).toMatch(/entry_date >= logbook_month AND entry_date < \(logbook_month \+ INTERVAL '1 month'\)/i);
    });

    it('lets a student move their own draft to submitted and no further', () => {
        expect(migration).toMatch(/care_activities_logbooks_student_submit_own/i);
        expect(migration).toMatch(/USING \(student_id = public\.current_student_id\(\) AND status = 'draft'\)/i);
        expect(migration).toMatch(/WITH CHECK \(\s*student_id = public\.current_student_id\(\)\s+AND status = 'submitted'/i);
    });

    it('gates entry writes on the parent month still being a draft', () => {
        expect(migration).toMatch(/care_activities_log_entries_student_insert_own/i);
        expect(migration).toMatch(/care_activities_log_entries_student_update_own/i);
        expect(migration).toMatch(/care_activities_log_entries_student_delete_own/i);
        expect(migration).toMatch(/b\.status = 'draft'/i);
    });

    it('only lets rostered facilitators start a logbook', () => {
        expect(migration).toMatch(/FROM public\.peer_facilitators f\s+WHERE f\.student_id = care_activities_logbooks\.student_id\s+AND f\.archived_at IS NULL/i);
    });

    it('does not index a table that will hold hundreds of rows', () => {
        expect(migration).not.toMatch(/care_activities_logbooks_status_idx/i);
        expect(migration).not.toMatch(/care_activities_log_entries_assisted_idx/i);
    });
});
