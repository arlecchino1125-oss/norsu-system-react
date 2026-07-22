import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260722090000_peer_facilitator_attendance.sql'),
    'utf8'
);

describe('peer facilitator attendance migration', () => {
    it('stamps a student\'s clock server-side so hours cannot be inflated', () => {
        expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.stamp_peer_facilitator_attendance_times\(\)/i);
        // Staff and service role keep their values; only students are clamped.
        expect(migration).toMatch(/IF public\.current_student_id\(\) IS NULL THEN\s+RETURN NEW;/i);
        // Insert: real clock, and never a pre-closed row.
        expect(migration).toMatch(/TG_OP = 'INSERT'[\s\S]+NEW\.time_in := now\(\);[\s\S]+NEW\.time_out := NULL;/i);
        // Update: time_in is immutable, time_out is the server's clock.
        expect(migration).toMatch(/NEW\.time_in := OLD\.time_in;[\s\S]+NEW\.time_out := now\(\);/i);
        expect(migration).toMatch(/CREATE TRIGGER peer_facilitator_attendance_stamp_times\s+BEFORE INSERT OR UPDATE/i);
    });

    it('lets only active-year approved facilitators clock in, for themselves', () => {
        expect(migration).toMatch(/FOR INSERT[\s\S]+student_id = public\.current_student_id\(\)/i);
        expect(migration).toMatch(/a\.status = 'approved'[\s\S]+a\.school_year = \(SELECT s\.school_year FROM public\.peer_facilitator_settings s WHERE s\.id = 1\)/i);
    });

    it('makes a closed session immutable to the student', () => {
        expect(migration).toMatch(/FOR UPDATE[\s\S]+USING \(student_id = public\.current_student_id\(\) AND time_out IS NULL\)/i);
    });

    it('blocks a second open session at the database', () => {
        expect(migration).toMatch(/CREATE UNIQUE INDEX peer_facilitator_attendance_one_open_session[\s\S]+WHERE time_out IS NULL/i);
    });
});
