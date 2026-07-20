import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('managed event deletion concurrency', () => {
    it('loads the event and its history counts concurrently before deletion', () => {
        const source = readFileSync(
            resolve(process.cwd(), 'supabase/functions/manage-record-deletions/index.ts'),
            'utf8'
        );
        const deleteEventSource = source.slice(
            source.indexOf('const deleteEvent = async'),
            source.indexOf('const deleteOfficeVisitReason = async')
        );

        expect(deleteEventSource).toMatch(
            /const \[event,\s*attendanceCount,\s*feedbackCount\] = await Promise\.all\(\[/
        );
    });
});
