import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationFile = readdirSync(migrationsDirectory)
    .find((file) => file.endsWith('_make_student_notifications_read_only.sql'));
const migration = migrationFile
    ? readFileSync(resolve(migrationsDirectory, migrationFile), 'utf8')
    : '';
const profileForm = readFileSync(
    resolve(process.cwd(), 'src/pages/student/features/profile/hooks/useStudentProfileForm.ts'),
    'utf8'
);
const accountFunction = readFileSync(
    resolve(process.cwd(), 'supabase/functions/manage-student-accounts/index.ts'),
    'utf8'
);

describe('student notification RLS hardening', () => {
    it('keeps student notifications read-only', () => {
        expect(migrationFile).toBeDefined();
        expect(migration).toMatch(/drop policy if exists notifications_student_insert_own on public\.notifications/i);
        expect(migration).toMatch(/drop policy if exists notifications_student_update_own on public\.notifications/i);
    });

    it('removes notification writes from the student browser', () => {
        expect(profileForm).not.toMatch(/\.from\(['"]notifications['"]\)\s*\.insert/i);
    });

    it('creates profile notifications in the authenticated server function', () => {
        expect(accountFunction).toMatch(/createProfileUpdateNotification/i);
        expect(accountFunction).toMatch(/\.from\(['"]notifications['"]\)\s*\.insert/i);
    });
});
