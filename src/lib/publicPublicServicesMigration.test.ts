import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationsDirectory).filter((file) => file.endsWith('.sql')).sort();

const migrationFile = migrationFiles.find((file) => file.endsWith('_public_needs_assessment_and_feedback.sql'));
const migration = migrationFile ? readFileSync(resolve(migrationsDirectory, migrationFile), 'utf8') : '';

const latestDefinitionOf = (functionName) => {
    const pattern = new RegExp(

        // eslint-disable-next-line no-useless-escape -- string is compiled as a RegExp below, so the backslash is required

        'create\\s+(?:or\\s+replace\\s+)?function\\s+public\\\.' + functionName + '\\b[\\s\\S]*?\\n\\$\\$;',
        'gi'
    );
    for (const file of [...migrationFiles].reverse()) {
        const sql = readFileSync(resolve(migrationsDirectory, file), 'utf8');
        const matches = sql.match(pattern);
        if (matches && matches.length > 0) return { file, body: matches[matches.length - 1] };
    }
    return null;
};

const NEW_RPCS = [
    'public_get_assessment_forms',
    'public_get_assessment_form_questions',
    'public_submit_assessment',
    'public_submit_general_feedback'
];

describe('public needs assessment + general feedback migration', () => {
    it('defines all four new RPCs', () => {
        expect(migrationFile).toBeDefined();
        for (const name of NEW_RPCS) {
            expect(latestDefinitionOf(name), 'no migration defines ' + name).not.toBeNull();
        }
    });

    it('grants every new RPC to anon so the public portal can call it', () => {
        for (const name of NEW_RPCS) {
            expect(migration, name + ' was not granted to anon').toMatch(

                // eslint-disable-next-line no-useless-escape -- string is compiled as a RegExp below, so the backslash is required

                new RegExp('grant\\s+execute\\s+on\\s+function\\s+public\\\.' + name + '\\b[^;]*to\\s+anon,\\s*authenticated', 'i')
            );
        }
    });

    it('never takes an email on any new write RPC', () => {
        for (const name of ['public_submit_assessment', 'public_submit_general_feedback']) {
            const body = latestDefinitionOf(name).body;
            expect(body).not.toMatch(/p_email/i);
        }
    });

    it('never grants the internal resolver to anon', () => {
        const sql = migrationFiles
            .map((file) => readFileSync(resolve(migrationsDirectory, file), 'utf8'))
            .join('\n');
        expect(sql).not.toContain('GRANT EXECUTE ON FUNCTION public.public_resolve_student');
    });

    it('rate-limits both write RPCs', () => {
        expect(latestDefinitionOf('public_submit_assessment').body).toMatch(/public_throttle_take/i);
        expect(latestDefinitionOf('public_submit_assessment').body).toMatch(/'assessment'/i);
        expect(latestDefinitionOf('public_submit_general_feedback').body).toMatch(/public_throttle_take/i);
        expect(latestDefinitionOf('public_submit_general_feedback').body).toMatch(/'feedback'/i);
    });

    it('keeps the public main read RPCs read-only', () => {
        for (const name of ['public_get_assessment_forms', 'public_get_assessment_form_questions']) {
            const body = latestDefinitionOf(name).body;
            expect(body).toMatch(/stable/i);
            expect(body).not.toMatch(/public_throttle_take/i);
        }
    });

    it('allows anonymous general feedback (optional student id)', () => {
        expect(latestDefinitionOf('public_submit_general_feedback').body).toMatch(/p_student_id text DEFAULT NULL/i);
    });
});
        // eslint-disable-next-line no-useless-escape -- string is compiled as a RegExp below, so the backslash is required
        // eslint-disable-next-line no-useless-escape -- string is compiled as a RegExp below, so the backslash is required
