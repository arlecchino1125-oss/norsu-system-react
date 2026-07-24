import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260724110000_peer_facilitator_archive.sql'),
    'utf8'
);

describe('peer facilitator archive migration', () => {
    it('adds a nullable archived_at column for soft removal', () => {
        expect(migration).toMatch(/ALTER TABLE public\.peer_facilitators\s+ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone/i);
    });

    it('blocks archived facilitators from clocking in', () => {
        expect(migration).toMatch(/peer_facilitator_attendance_student_insert_own/i);
        expect(migration).toMatch(/FROM public\.peer_facilitators f\s+WHERE f\.student_id = peer_facilitator_attendance\.student_id\s+AND f\.archived_at IS NULL/i);
    });
});
