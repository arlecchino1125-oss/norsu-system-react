import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260724100000_peer_facilitators_overhaul.sql'),
    'utf8'
);

describe('peer facilitators overhaul migration', () => {
    it('adds the applications-open and time-in toggles to settings', () => {
        expect(migration).toMatch(/ALTER TABLE public\.peer_facilitator_settings[\s\S]+applications_open boolean NOT NULL DEFAULT true/i);
        expect(migration).toMatch(/time_in_enabled boolean NOT NULL DEFAULT true/i);
    });

    it('creates the roster table with a unique student and a source flag', () => {
        expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.peer_facilitators/i);
        expect(migration).toMatch(/student_id character varying NOT NULL UNIQUE REFERENCES public\.students/i);
        expect(migration).toMatch(/source text NOT NULL DEFAULT 'manual' CHECK \(source IN \('application', 'manual'\)\)/i);
    });

    it('locks the roster down with student-own and staff policies', () => {
        expect(migration).toMatch(/peer_facilitators_student_select_own[\s\S]+student_id = public\.current_student_id\(\)/i);
        expect(migration).toMatch(/peer_facilitators_staff_write[\s\S]+current_staff_role\(\) = 'Care Staff'/i);
    });

    it('backfills the roster from approved applications by status, not year', () => {
        expect(migration).toMatch(/INSERT INTO public\.peer_facilitators[\s\S]+FROM public\.peer_facilitator_applications a[\s\S]+WHERE a\.status = 'approved'[\s\S]+ON CONFLICT \(student_id\) DO NOTHING/i);
    });

    it('gates hours on roster membership plus the global toggle, not the year', () => {
        expect(migration).toMatch(/peer_facilitator_attendance_student_insert_own[\s\S]+EXISTS \(\s*SELECT 1 FROM public\.peer_facilitators f/i);
        expect(migration).toMatch(/time_in_enabled FROM public\.peer_facilitator_settings s WHERE s\.id = 1/i);
        // The year must no longer appear in the hours gate.
        expect(migration).not.toMatch(/attendance[\s\S]+a\.school_year = /i);
    });

    it('makes the applications-open toggle a real DB gate on student inserts', () => {
        expect(migration).toMatch(/Students can insert their own application[\s\S]+applications_open FROM public\.peer_facilitator_settings s WHERE s\.id = 1/i);
    });
});
