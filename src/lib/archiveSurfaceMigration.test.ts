import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationFile = readdirSync(migrationsDirectory)
    .find((file) => file.endsWith('_restrict_archive_surface.sql'));
const migration = migrationFile
    ? readFileSync(resolve(migrationsDirectory, migrationFile), 'utf8')
    : '';

describe('archive surface migration', () => {
    it('drops the unguarded event attendee RPC', () => {
        expect(migrationFile).toBeDefined();
        expect(migration).toMatch(/DROP FUNCTION IF EXISTS public\.increment_event_attendees\(uuid\)/i);
    });

    it('makes archive_student/restore_student service-role only', () => {
        expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.archive_student\(text, text, text, bigint\) FROM authenticated/i);
        expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.restore_student\(text\) FROM authenticated/i);
        expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.archive_student[\s\S]+TO service_role/i);
        expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.restore_student\(text\) TO service_role/i);
    });

    it('removes Department Head archive/restore permissions and stops re-seeding them', () => {
        expect(migration).toMatch(/DELETE FROM public\.role_permissions[\s\S]+'Department Head'[\s\S]+archive_records', 'restore_records/i);
        expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.seed_archive_action_permission_defaults/i);
        const seedBody = migration.slice(migration.indexOf('seed_archive_action_permission_defaults'));
        expect(seedBody).not.toMatch(/\('Department Head'/);
    });
});
