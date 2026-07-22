import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationFile = readdirSync(migrationsDirectory)
    .find((file) => file.endsWith('_harden_student_event_attendance_writes.sql'));
const migration = migrationFile
    ? readFileSync(resolve(migrationsDirectory, migrationFile), 'utf8')
    : '';
const studentEventActions = readFileSync(
    resolve(process.cwd(), 'src/pages/student/features/events/hooks/useStudentEventActions.ts'),
    'utf8'
);
const studentEventsView = readFileSync(
    resolve(process.cwd(), 'src/pages/student/features/events/components/StudentEventsView.tsx'),
    'utf8'
);

describe('student event attendance RLS hardening', () => {
    it('removes direct student writes while keeping the controlled attendance RPC', () => {
        expect(migrationFile).toBeDefined();
        expect(migration).toMatch(/drop policy if exists event_attendance_student_insert_own on public\.event_attendance/i);
        expect(migration).toMatch(/drop policy if exists event_attendance_student_update_own on public\.event_attendance/i);
        expect(migration).toMatch(/drop policy if exists event_registrations_student_insert_own on public\.event_registrations/i);
        expect(migration).toMatch(/drop policy if exists event_registrations_student_update_own on public\.event_registrations/i);
        expect(migration).toMatch(/create or replace function public\.record_student_event_attendance/i);
    });

    it('derives the student from the session and limits RPC access to signed-in users', () => {
        expect(migration).toMatch(/v_student_id := public\.current_student_id\(\)/i);
        expect(migration).not.toMatch(/p_student_id/i);
        expect(migration).toMatch(/revoke execute on function public\.record_student_event_attendance[\s\S]+from public, anon/i);
        expect(migration).toMatch(/grant execute on function public\.record_student_event_attendance[\s\S]+to authenticated/i);
    });

    it('routes browser attendance writes through the RPC', () => {
        expect(studentEventActions).toMatch(/\.rpc\(['"]record_student_event_attendance['"]/i);
        expect(studentEventActions).not.toMatch(/\.from\(['"]event_attendance['"]\)\s*\.insert/i);
        expect(studentEventActions).not.toMatch(/\.from\(['"]event_attendance['"]\)\s*\.update/i);
        expect(studentEventActions).not.toMatch(/\.from\(['"]event_registrations['"]\)\s*\.upsert/i);
    });

    it('closes the browser check-in action when the server check-in window closes', () => {
        expect(studentEventsView).toMatch(/const isCheckInClosed = [^;]*now > \(end as Date\)/i);
        expect(studentEventsView).toMatch(/'Check-in closed'/i);
    });
});
