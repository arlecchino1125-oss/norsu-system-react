import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getEventWindows } from '../utils/eventWindows';

/**
 * Stops the committed migrations from drifting away from src/utils/eventWindows.ts.
 *
 * We already had a guard on these windows and it still let a 2h/3h split through,
 * because it asserted the number literally. When the code moved to 3h the test
 * kept passing against a migration that said 2h, and a `db reset` would have
 * quietly reverted the student portal.
 *
 * So nothing here is hardcoded. The expected values are DERIVED from
 * getEventWindows(), which is the single source of truth: change that file and
 * these assertions change with it, forcing the migration to be updated too.
 */

const HOUR_MS = 60 * 60 * 1000;
const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationsDirectory).filter((file) => file.endsWith('.sql')).sort();

/**
 * The newest definition of a function wins, the same way it does when the
 * migrations are replayed in order.
 */
const latestDefinitionOf = (functionName: string) => {
    const pattern = new RegExp(
        `create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${functionName}\\b[\\s\\S]*?\\n\\$\\$;`,
        'gi'
    );

    for (const file of [...migrationFiles].reverse()) {
        const sql = readFileSync(resolve(migrationsDirectory, file), 'utf8');
        const matches = sql.match(pattern);
        if (matches && matches.length > 0) {
            return { file, body: matches[matches.length - 1] };
        }
    }
    return null;
};

// A 4.5h event: long enough that the 3h cap, not the end time, is what decides
// when check-in closes, so the derived number below is the cap itself.
const longEvent = { type: 'event', event_date: '2026-07-23', event_time: '08:00', end_time: '12:30' };
const { start, checkInClose } = getEventWindows(longEvent);
const checkInGraceHours = (checkInClose!.getTime() - start!.getTime()) / HOUR_MS;

describe('event window lockstep between eventWindows.ts and the migrations', () => {
    it('derives a whole number of cap hours to compare against', () => {
        expect(Number.isInteger(checkInGraceHours)).toBe(true);
        expect(checkInGraceHours).toBeGreaterThan(0);
    });

    it('gives the student attendance RPC the same check-in cap as the browser', () => {
        const definition = latestDefinitionOf('record_student_event_attendance');
        expect(definition, 'no migration defines record_student_event_attendance').not.toBeNull();
        expect(definition!.body).toMatch(
            new RegExp(`least\\(\\s*v_event_end_at,\\s*v_event_start_at \\+ interval '${checkInGraceHours} hours'\\s*\\)`, 'i')
        );
        // The fallback end time for an event with no end_time uses the same span.
        expect(definition!.body).toMatch(
            new RegExp(`v_event_start_at \\+ interval '${checkInGraceHours} hours'`, 'i')
        );
    });

    it('gives the public portal window helper the same check-in cap', () => {
        const definition = latestDefinitionOf('public_event_window');
        expect(definition, 'no migration defines public_event_window').not.toBeNull();
        expect(definition!.body).toMatch(
            new RegExp(`least\\(\\s*v_end,\\s*v_start \\+ interval '${checkInGraceHours} hours'\\s*\\)`, 'i')
        );
    });

    it('leaves time-out with no closing window on either portal', () => {
        // getEventWindows dropped timeoutClose; the RPCs must not reintroduce one.
        expect(getEventWindows(longEvent)).not.toHaveProperty('timeoutClose');

        const studentRpc = latestDefinitionOf('record_student_event_attendance');
        expect(studentRpc!.body).toMatch(/check-out is not open yet/i);
        expect(studentRpc!.body).not.toMatch(/check-?out window has closed/i);

        const publicRpc = latestDefinitionOf('public_event_time_out');
        expect(publicRpc, 'no migration defines public_event_time_out').not.toBeNull();
        expect(publicRpc!.body).not.toMatch(/timeout_close/i);
        expect(publicRpc!.body).not.toMatch(/window has closed/i);
    });

    it('keeps evaluation open on event end alone, with no attendance requirement', () => {
        const formGate = latestDefinitionOf('student_may_evaluate_form');
        expect(formGate, 'no migration defines student_may_evaluate_form').not.toBeNull();
        // Reading event_attendance here is what used to hide the form from
        // students who had not checked in and timed out.
        expect(formGate!.body).not.toMatch(/event_attendance/i);

        const publicEvaluate = latestDefinitionOf('public_event_evaluate');
        expect(publicEvaluate!.body).not.toMatch(/event_attendance/i);
    });
});
