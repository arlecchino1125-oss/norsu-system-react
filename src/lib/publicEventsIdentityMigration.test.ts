import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The public events portal identifies a student by ID alone. That makes the ID
 * the only credential, so two properties have to hold and keep holding:
 *
 *   1. No public RPC still asks for an email.
 *   2. An ID reveals nothing. public_verify_student returns the student_id and
 *      nothing else -- no name, no department, no course, no year level.
 *
 * Both are asserted against the committed migrations, so a later migration that
 * quietly reintroduces a profile field fails here.
 */

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationsDirectory).filter((file) => file.endsWith('.sql')).sort();

const latestDefinitionOf = (functionName: string) => {
    const pattern = new RegExp(
        `create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${functionName}\\b[\\s\\S]*?\\n\\$\\$;`,
        'gi'
    );
    for (const file of [...migrationFiles].reverse()) {
        const sql = readFileSync(resolve(migrationsDirectory, file), 'utf8');
        const matches = sql.match(pattern);
        if (matches && matches.length > 0) return { file, body: matches[matches.length - 1] };
    }
    return null;
};

const PUBLIC_RPCS = [
    'public_resolve_student',
    'public_verify_student',
    'public_get_student_event_status',
    'public_get_active_events',
    'public_event_time_in',
    'public_event_time_out',
    'public_event_evaluate',
    'public_event_rate'
];

// Fields that must never leave the database for a caller holding only an ID.
const PROFILE_FIELDS = ['first_name', 'last_name', 'middle_name', 'suffix', 'sex', 'department', 'course', 'year_level', 'section', 'email'];

describe('public events portal identifies by student ID alone', () => {
    it.each(PUBLIC_RPCS)('%s no longer takes an email', (name) => {
        const definition = latestDefinitionOf(name);
        expect(definition, `no migration defines ${name}`).not.toBeNull();
        expect(definition!.body).not.toMatch(/p_email/i);
    });

    it('public_verify_student returns the student id and nothing else', () => {
        const definition = latestDefinitionOf('public_verify_student');
        for (const field of PROFILE_FIELDS) {
            expect(definition!.body, `public_verify_student still returns ${field}`)
                .not.toMatch(new RegExp(`'${field}'`, 'i'));
        }
        expect(definition!.body).toMatch(/'student_id',\s*v_student\.student_id/i);
    });

    it('keeps the internal resolver ungranted to anon', () => {
        const sql = migrationFiles
            .map((file) => readFileSync(resolve(migrationsDirectory, file), 'utf8'))
            .join('\n');
        expect(sql).not.toMatch(/grant\s+execute\s+on\s+function\s+public\.public_resolve_student[^;]*to[^;]*anon/i);
    });

    it('regrants every public RPC it drops', () => {
        const sql = readFileSync(resolve(migrationsDirectory, '20260804090000_public_events_id_only.sql'), 'utf8');
        for (const name of PUBLIC_RPCS.filter((n) => n !== 'public_resolve_student')) {
            expect(sql, `${name} was dropped without a grant`)
                .toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${name}\\b[^;]*to\\s+anon,\\s*authenticated`, 'i'));
        }
    });

    it('keeps the throttle budgets untouched', () => {
        const budgets: Array<[string, string, number]> = [
            ['public_verify_student', 'verify', 10],
            ['public_event_time_in', 'time_in', 10],
            ['public_event_time_out', 'time_out', 10],
            ['public_event_evaluate', 'evaluate', 5],
            ['public_event_rate', 'rate', 5]
        ];
        for (const [fn, action, budget] of budgets) {
            expect(latestDefinitionOf(fn)!.body).toMatch(
                new RegExp(`public_throttle_take\\([^)]*'${action}',\\s*${budget},\\s*interval '5 minutes'\\)`, 'i')
            );
        }
    });

    it('keeps public_verify_student volatile so it can record throttle attempts', () => {
        // public_throttle_take DELETEs and INSERTs. A STABLE function cannot
        // write, so marking this stable makes the throttle above fail at
        // runtime -- and nothing else in this suite would notice.
        const definition = latestDefinitionOf('public_verify_student');
        expect(definition!.body).not.toMatch(/^\s*stable\s*$/im);
    });

    it('bounds the submitted id before it reaches a query', () => {
        const definition = latestDefinitionOf('public_verify_student');
        expect(definition!.body).toMatch(/length\(coalesce\(p_student_id, ''\)\)\s*>\s*64/i);
    });

    it('keeps the attendance closing-date guard on every write path', () => {
        for (const name of ['public_event_time_out', 'public_event_evaluate', 'public_event_rate']) {
            expect(latestDefinitionOf(name)!.body, `${name} lost its closing-date guard`)
                .toMatch(/attendance for this event is closed/i);
        }
    });
});