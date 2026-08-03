import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getEventWindows } from '../utils/eventWindows';

/**
 * Stops the committed migrations from drifting away from src/utils/eventWindows.ts.
 *
 * Nothing here is hardcoded. The expected values are DERIVED from
 * getEventWindows(), which is the single source of truth: change that file and
 * these assertions change with it, forcing the migration to be updated too.
 *
 * The 3h check-in cap these tests used to guard is gone. What they guard now is
 * the single closing date: the same fallback span on both sides, no cap
 * sneaking back in, and every student-facing action shutting at that date
 * rather than relying on the card scrolling out of view.
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

// A 4.5h event with no explicit close: the derived number below is the default
// fallback span, in days, that both the browser and the RPCs must agree on.
const longEvent = { type: 'event', event_date: '2026-07-23', event_time: '08:00', end_time: '12:30' };
const { end, closesAt } = getEventWindows(longEvent);
const fallbackDays = (closesAt!.getTime() - end!.getTime()) / (24 * HOUR_MS);

describe('event window lockstep between eventWindows.ts and the migrations', () => {
    it('derives a whole number of fallback days to compare against', () => {
        expect(Number.isInteger(fallbackDays)).toBe(true);
        expect(fallbackDays).toBeGreaterThan(0);
    });

    it('gives the student attendance RPC the same fallback close as the browser', () => {
        const definition = latestDefinitionOf('record_student_event_attendance');
        expect(definition, 'no migration defines record_student_event_attendance').not.toBeNull();
        expect(definition!.body).toMatch(
            new RegExp(`coalesce\\(\\s*v_event\\.attendance_closes_at,\\s*v_event_end_at \\+ interval '${fallbackDays} days'\\s*\\)`, 'i')
        );
    });

    it('gives the public portal window helper the same fallback close', () => {
        const definition = latestDefinitionOf('public_event_window');
        expect(definition, 'no migration defines public_event_window').not.toBeNull();
        expect(definition!.body).toMatch(
            new RegExp(`coalesce\\(\\s*p_event\\.attendance_closes_at,\\s*v_end \\+ interval '${fallbackDays} days'\\s*\\)`, 'i')
        );
    });

    it('leaves no 3h check-in cap behind in either RPC', () => {
        const windows = getEventWindows(longEvent);
        expect(windows).not.toHaveProperty('checkInClose');

        for (const name of ['record_student_event_attendance', 'public_event_window']) {
            const definition = latestDefinitionOf(name);
            expect(definition!.body, `${name} still caps check-in`).not.toMatch(/least\(/i);
            expect(definition!.body, `${name} still uses a 3 hour cap`).not.toMatch(/interval '3 hours'\s*\)/i);
        }
    });

    it('closes time-out and evaluation at the same date, not just on is_archived', () => {
        const studentRpc = latestDefinitionOf('record_student_event_attendance');
        expect(studentRpc!.body).toMatch(/check-out is not open yet/i);
        expect(studentRpc!.body).toMatch(/v_close_at/i);

        for (const name of ['public_event_time_out', 'public_event_evaluate', 'public_event_rate']) {
            const definition = latestDefinitionOf(name);
            expect(definition, `no migration defines ${name}`).not.toBeNull();
            expect(definition!.body, `${name} has no closing date`).toMatch(/attendance for this event is closed/i);
        }
    });

    it('stops enforcing photo and geolocation once the event has ended', () => {
        const studentRpc = latestDefinitionOf('record_student_event_attendance');
        expect(studentRpc!.body).toMatch(/IF now\(\) <= v_event_end_at THEN/i);
    });

    it('keeps evaluation open on event end alone, with no attendance requirement', () => {
        const formGate = latestDefinitionOf('student_may_evaluate_form');
        expect(formGate, 'no migration defines student_may_evaluate_form').not.toBeNull();
        expect(formGate!.body).not.toMatch(/event_attendance/i);

        const publicEvaluate = latestDefinitionOf('public_event_evaluate');
        expect(publicEvaluate!.body).not.toMatch(/event_attendance/i);
    });
});
