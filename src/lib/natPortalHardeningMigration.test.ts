import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260714062703_harden_nat_portal.sql'),
    'utf8'
);

describe('NAT portal hardening migration', () => {
    it('completes NAT activation through one service-role-only transaction', () => {
        expect(migration).toMatch(/create or replace function public\.complete_nat_student_activation/i);
        expect(migration).toMatch(/require_enrollment_key[\s\S]+if v_require_enrollment_key then/i);
        expect(migration).toMatch(/public\.finalize_application\([\s\S]+['"]enrolled['"]/i);
        expect(migration).toMatch(/revoke execute on function public\.complete_nat_student_activation[\s\S]+from public, anon, authenticated/i);
        expect(migration).toMatch(/grant execute on function public\.complete_nat_student_activation[\s\S]+to service_role/i);
    });

    it('requires three distinct course choices at the database boundary', () => {
        expect(migration).toMatch(/second course choice is required/i);
        expect(migration).toMatch(/third course choice is required/i);
        expect(migration).toMatch(/choose three different courses/i);
        expect(migration).toMatch(/selected second course choice is already full/i);
        expect(migration).toMatch(/selected third course choice is already full/i);
    });

    it('enforces attendance before a Pass status at the database boundary', () => {
        expect(migration).toMatch(/create or replace function public\.enforce_nat_pass_attendance/i);
        expect(migration).toMatch(/time in and time out are required before passing/i);
        expect(migration).toMatch(/before insert or update[\s\S]+on public\.applications/i);
    });
});
