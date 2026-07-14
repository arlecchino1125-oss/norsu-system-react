import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260714061000_students_directory_view.sql'),
    'utf8'
);

describe('student directory migration', () => {
    it('includes every column still used by Department Head screens', () => {
        for (const column of ['address', 'priority_course', 'alt_course_1', 'alt_course_2']) {
            expect(migration).toMatch(new RegExp(`s\\.${column}(?:,|\\s)`));
        }
    });

    it('guards the privileged search RPC and removes direct role policies', () => {
        expect(migration).toMatch(/search_care_students[\s\S]+SECURITY DEFINER/i);
        expect(migration).toMatch(/auth\.uid\(\)\s+is\s+null/i);
        expect(migration).toMatch(/current_staff_role\(\)/i);
        expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.search_care_students[\s\S]+FROM PUBLIC, anon/i);
        expect(migration).toMatch(/DROP POLICY IF EXISTS students_registrar_read ON public\.students/i);
        expect(migration).toMatch(/DROP POLICY IF EXISTS students_department_head_read_department ON public\.students/i);
    });
});
