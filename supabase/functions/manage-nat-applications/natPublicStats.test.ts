import { describe, expect, it } from 'vitest';
import { buildNatPublicStats } from './natPublicStats.ts';

describe('NAT public statistics', () => {
    it('returns counts only under open courses, active dates, and configured time windows', () => {
        const stats = buildNatPublicStats({
            applications: [
                { priority_course: 'Open Course', test_date: '2026-07-14', test_time: '08:00-12:00' },
                { priority_course: 'Closed Course', test_date: '2026-07-14', test_time: '08:00-12:00' },
                { priority_course: 'Open Course', test_date: '2026-07-15', test_time: '13:00-17:00' },
                { priority_course: 'Open Course', test_date: '2026-07-14', test_time: 'hidden-window' }
            ],
            courses: [
                { name: 'Open Course', status: 'Open' },
                { name: 'Closed Course', status: 'Closed' }
            ],
            schedules: [
                {
                    date: '2026-07-14',
                    is_active: true,
                    time_windows: [{ start: '08:00', end: '12:00', slots: 20 }]
                },
                {
                    date: '2026-07-15',
                    is_active: false,
                    time_windows: [{ start: '13:00', end: '17:00', slots: 20 }]
                }
            ]
        });

        expect(stats.courseCounts).toEqual({ 'Open Course': 3 });
        expect(stats.dateCounts).toEqual({ '2026-07-14': 3 });
        expect(stats.dateTimeCounts).toEqual({ '2026-07-14|08:00-12:00': 2 });
    });
});
