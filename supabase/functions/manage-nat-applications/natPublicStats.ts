type NatPublicStatsInput = {
    applications: Array<Record<string, unknown>>;
    courses: Array<Record<string, unknown>>;
    schedules: Array<Record<string, unknown>>;
};

const normalizeText = (value: unknown) => String(value || '').trim();

export const buildNatPublicStats = ({ applications, courses, schedules }: NatPublicStatsInput) => {
    const openCourses = new Set(
        courses.flatMap((course) => {
            if (String(course.status || '') !== 'Open') return [];
            const name = normalizeText(course.name);
            return name ? [name] : [];
        })
    );
    const activeScheduleTimes = new Map<string, Set<string>>();

    for (const schedule of schedules) {
        if (schedule.is_active !== true) continue;
        const date = normalizeText(schedule.date);
        if (!date) continue;

        const allowedTimes = new Set<string>();
        if (Array.isArray(schedule.time_windows)) {
            for (const window of schedule.time_windows) {
                const start = normalizeText(window?.start);
                const end = normalizeText(window?.end);
                if (start && end) allowedTimes.add(`${start}-${end}`);
            }
        }
        activeScheduleTimes.set(date, allowedTimes);
    }

    const courseCounts: Record<string, number> = {};
    const dateCounts: Record<string, number> = {};
    const dateTimeCounts: Record<string, number> = {};

    for (const application of applications) {
        const courseName = normalizeText(application.priority_course);
        const testDate = normalizeText(application.test_date);
        const testTime = normalizeText(application.test_time);

        if (openCourses.has(courseName)) {
            courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
        }

        const allowedTimes = activeScheduleTimes.get(testDate);
        if (!allowedTimes) continue;

        dateCounts[testDate] = (dateCounts[testDate] || 0) + 1;
        if (testTime && allowedTimes.has(testTime)) {
            const key = `${testDate}|${testTime}`;
            dateTimeCounts[key] = (dateTimeCounts[key] || 0) + 1;
        }
    }

    return { courseCounts, dateCounts, dateTimeCounts };
};
