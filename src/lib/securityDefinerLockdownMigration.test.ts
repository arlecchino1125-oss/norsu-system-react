import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Supabase ships default privileges that grant ALL on every new function in the
 * public schema to anon and authenticated. Two consequences have already bitten
 * this schema:
 *
 *   1. Revoking only FROM PUBLIC leaves anon's direct default grant in place
 *      (department_evaluate_peer_application, the two
 *      student_*_in_current_staff_department helpers).
 *   2. DROP + CREATE reinstates the defaults, which is how the internal resolver
 *      -- a function that returns a whole student row -- became anon-callable
 *      again when 20260804090000 rebuilt it with one argument.
 *
 * These tests assert against the committed migrations that the lockdown
 * migration closes both, keeps authenticated only where RLS policies need it,
 * never touches the documented portal surface, and that no later migration can
 * quietly reintroduce the leak.
 */

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationsDirectory).filter((file) => file.endsWith('.sql')).sort();

const LOCKDOWN_FILE = '20260922100000_lock_down_security_definer_execute.sql';
const lockdownSql = readFileSync(resolve(migrationsDirectory, LOCKDOWN_FILE), 'utf8');

// Functions reachable from PostgREST that no caller needs. keepAuthenticated is
// true only for the RLS helpers, because policies evaluate as the querying role.
const INTERNAL_FUNCTIONS: Array<{ name: string; keepAuthenticated: boolean }> = [
    { name: 'public_resolve_student', keepAuthenticated: false },
    { name: 'auto_timeout_records', keepAuthenticated: false },
    { name: 'lock_counseling_requests_student_update', keepAuthenticated: false },
    { name: 'stamp_event_evaluation_response_identity', keepAuthenticated: false },
    { name: 'department_evaluate_peer_application', keepAuthenticated: true },
    { name: 'student_may_evaluate_form', keepAuthenticated: true },
    { name: 'student_may_evaluate_counseling', keepAuthenticated: true },
    { name: 'student_has_completed_counseling', keepAuthenticated: true },
    { name: 'student_in_current_staff_department', keepAuthenticated: true },
    { name: 'student_text_id_in_current_staff_department', keepAuthenticated: true },
    { name: 'get_event_attendance_counts', keepAuthenticated: true }
];

// The portal RPCs that exist to be callable without a session. Verbatim from
// supabase/SECURITY-ANON-SURFACE.md -- the lockdown migration must leave them alone.
const PORTAL_PREFIXES = [
    'public_get', 'public_submit', 'public_event', 'public_verify', 'public_office_visit',
    'public_peer', 'public_counseling', 'public_save', 'public_delete', 'public_search'
];

const revokeFromAnon = (name: string) =>
    new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${name}\\b[^;]*from[^;]*\\banon\\b`, 'i');

describe('security definer lockdown migration', () => {
    it.each(INTERNAL_FUNCTIONS.map((entry) => entry.name))('%s is revoked from anon', (name) => {
        expect(lockdownSql, `${name} can still be called by anon`).toMatch(revokeFromAnon(name));
    });

    it.each(INTERNAL_FUNCTIONS.filter((entry) => entry.keepAuthenticated).map((entry) => entry.name))(
        '%s keeps EXECUTE for authenticated',
        (name) => {
            expect(lockdownSql).toMatch(
                new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${name}\\b[^;]*to\\s+authenticated`, 'i')
            );
        }
    );

    it.each(INTERNAL_FUNCTIONS.filter((entry) => !entry.keepAuthenticated).map((entry) => entry.name))(
        '%s is revoked from authenticated too',
        (name) => {
            expect(lockdownSql).toMatch(
                new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${name}\\b[^;]*from[^;]*\\bauthenticated\\b`, 'i')
            );
        }
    );

    it('never revokes the documented portal surface', () => {
        const revokeLines = lockdownSql.split('\n').filter((line) => /revoke\s+all\s+on\s+function/i.test(line));
        expect(revokeLines.length).toBeGreaterThan(0);
        for (const line of revokeLines) {
            for (const prefix of PORTAL_PREFIXES) {
                expect(line, `lockdown revokes the portal function ${prefix}_*`).not.toContain(`${prefix}_`);
            }
        }
    });

    it('stops a later migration from recreating an internal function without a revoke', () => {
        // Filenames are timestamp-prefixed, so ordering is chronological.
        for (const file of migrationFiles.filter((name) => name > LOCKDOWN_FILE)) {
            const sql = readFileSync(resolve(migrationsDirectory, file), 'utf8');
            for (const { name } of INTERNAL_FUNCTIONS) {
                const recreated = new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${name}\\b`, 'i').test(sql);
                if (!recreated) continue;
                expect(sql, `${file} recreates ${name} without revoking anon`).toMatch(revokeFromAnon(name));
            }
        }
    });
});