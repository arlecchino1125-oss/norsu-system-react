import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260714061000_students_directory_view.sql'),
    'utf8'
);
const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const hardeningFile = readdirSync(migrationsDirectory)
    .find((file) => file.endsWith('_harden_students_directory.sql'));
const hardeningMigration = hardeningFile
    ? readFileSync(resolve(migrationsDirectory, hardeningFile), 'utf8')
    : '';

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

    it('replaces the owner-executed directory view with an authenticated, scoped boundary', () => {
        expect(hardeningFile).toBeDefined();
        expect(hardeningMigration).toMatch(/CREATE OR REPLACE FUNCTION public\.get_students_directory_rows\(\)/i);
        expect(hardeningMigration).toMatch(/SECURITY DEFINER[\s\S]+SET search_path TO ''/i);
        expect(hardeningMigration).toMatch(/auth\.uid\(\) IS NULL/i);
        expect(hardeningMigration).toMatch(/v_role NOT IN \('Admin', 'Care Staff', 'Registrar', 'Department Head'\)/i);
        expect(hardeningMigration).toMatch(/v_role = 'Department Head'[\s\S]+v_department IS NULL/i);
        expect(hardeningMigration).toMatch(/v_role = 'Department Head'\s+AND s\.department\s*=\s*v_department/i);
        expect(hardeningMigration).toMatch(/CREATE OR REPLACE VIEW public\.students_directory[\s\S]+security_invoker\s*=\s*true/i);
        expect(hardeningMigration).toMatch(/REVOKE ALL ON FUNCTION public\.get_students_directory_rows\(\)[\s\S]+FROM PUBLIC, anon/i);
        expect(hardeningMigration).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_students_directory_rows\(\)[\s\S]+TO authenticated/i);
    });
});
