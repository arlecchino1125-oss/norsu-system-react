import { describe, expect, it } from 'vitest';

import {
    CARE_STAFF_ACTIVE_COUNSELING_STATUSES,
    CARE_STAFF_ACTIVE_SUPPORT_STATUSES,
    CARE_STAFF_SUPPORT_MONITORING_STATUSES,
    COUNSELING_STATUS,
    DEPT_SUPPORT_VISIBLE_STATUSES,
    SUPPORT_STATUS,
    getCounselingScheduledDate,
    isCareStaffCounselingSchedulable,
    isCareStaffSupportDeptUpdate,
    isCareStaffSupportQueue,
    isCounselingAwaitingDept,
    isCounselingCalendarVisible,
    isDeptSupportCompleted,
    isWithCareStaffCounseling
} from './workflow';

describe('workflow status helpers', () => {
    it('treats Submitted and legacy Pending counseling requests as awaiting department review', () => {
        expect(isCounselingAwaitingDept(COUNSELING_STATUS.SUBMITTED)).toBe(true);
        expect(isCounselingAwaitingDept(COUNSELING_STATUS.PENDING)).toBe(true);
        expect(CARE_STAFF_ACTIVE_COUNSELING_STATUSES).toContain(COUNSELING_STATUS.SUBMITTED);
    });

    it('keeps department-to-CARE handoff statuses visible on both portals', () => {
        expect(isWithCareStaffCounseling(COUNSELING_STATUS.REFERRED)).toBe(true);
        expect(isWithCareStaffCounseling(COUNSELING_STATUS.STAFF_SCHEDULED)).toBe(true);
        expect(isCareStaffCounselingSchedulable(COUNSELING_STATUS.REFERRED)).toBe(true);
        expect(isCareStaffCounselingSchedulable(COUNSELING_STATUS.PENDING)).toBe(true);
        expect(isCounselingCalendarVisible(COUNSELING_STATUS.STAFF_SCHEDULED)).toBe(true);
    });

    it('reads the scheduled counseling field from the current schema name', () => {
        expect(getCounselingScheduledDate({ scheduled_date: '2026-03-20 09:00' })).toBe('2026-03-20 09:00');
        expect(getCounselingScheduledDate({ schedule_date: 'legacy-field' })).toBe('legacy-field');
        expect(getCounselingScheduledDate({ scheduled_date: 'new', schedule_date: 'old' })).toBe('new');
    });

    it('keeps support requests visible through dept review, dept outcome, and care completion', () => {
        expect(isCareStaffSupportQueue(SUPPORT_STATUS.SUBMITTED)).toBe(true);
        expect(isCareStaffSupportQueue(SUPPORT_STATUS.FORWARDED_TO_DEPT)).toBe(true);
        expect(isCareStaffSupportDeptUpdate(SUPPORT_STATUS.VISIT_SCHEDULED)).toBe(true);
        expect(isCareStaffSupportDeptUpdate(SUPPORT_STATUS.RESOLVED_BY_DEPT)).toBe(true);
        expect(isCareStaffSupportDeptUpdate(SUPPORT_STATUS.REFERRED_TO_CARE)).toBe(true);
        expect(isDeptSupportCompleted(SUPPORT_STATUS.COMPLETED)).toBe(true);
        expect(CARE_STAFF_ACTIVE_SUPPORT_STATUSES).toContain(SUPPORT_STATUS.RESOLVED_BY_DEPT);
        expect(CARE_STAFF_SUPPORT_MONITORING_STATUSES).toContain(SUPPORT_STATUS.COMPLETED);
        expect(DEPT_SUPPORT_VISIBLE_STATUSES).toContain(SUPPORT_STATUS.COMPLETED);
    });
});
