import { describe, expect, it } from 'vitest';

import {
    CARE_STAFF_ACTIVE_COUNSELING_STATUSES,
    CARE_STAFF_ACTIVE_SUPPORT_STATUSES,
    CARE_STAFF_COUNSELING_ACTIVITY_STATUSES,
    CARE_STAFF_SUPPORT_MONITORING_STATUSES,
    COUNSELING_AWAITING_CARE_STATUSES,
    COUNSELING_AWAITING_DEPT_STATUSES,
    COUNSELING_CALENDAR_STATUSES,
    COUNSELING_OUTCOME_STATUSES,
    COUNSELING_RETURNED_STATUSES,
    COUNSELING_SESSION_DONE_STATUSES,
    COUNSELING_STATUS,
    DEPT_SUPPORT_VISIBLE_STATUSES,
    SUPPORT_STATUS,
    getCounselingScheduledDate,
    isCareStaffCounselingApprovable,
    isCareStaffCounselingSchedulable,
    isCareStaffSupportDeptUpdate,
    isCareStaffSupportQueue,
    isCounselingAwaitingCare,
    isCounselingAwaitingDept,
    isCounselingCalendarVisible,
    isCounselingFollowUpEligible,
    isCounselingOutcomeStatus,
    isCounselingReschedulable,
    isCounselingReturnedToCare,
    isCounselingSessionDone,
    isDeptSupportCompleted,
    isWithCareStaffCounseling
} from './workflow';
import {
    getCounselingStatusLabel,
    getCounselingStatusMeta,
    getCounselingStatusTone
} from './counselingStatusMeta';

describe('workflow status helpers', () => {
    it('treats Submitted and Pending counseling requests as awaiting CARE review, and Approved as awaiting department review', () => {
        expect(isCounselingAwaitingCare(COUNSELING_STATUS.SUBMITTED)).toBe(true);
        expect(isCounselingAwaitingCare(COUNSELING_STATUS.PENDING)).toBe(true);
        expect(isCounselingAwaitingDept(COUNSELING_STATUS.APPROVED)).toBe(true);
        expect(isCounselingAwaitingDept(COUNSELING_STATUS.SUBMITTED)).toBe(false);
        expect(isCounselingAwaitingDept(COUNSELING_STATUS.PENDING)).toBe(false);
        expect(CARE_STAFF_ACTIVE_COUNSELING_STATUSES).toContain(COUNSELING_STATUS.SUBMITTED);
        expect(CARE_STAFF_ACTIVE_COUNSELING_STATUSES).toContain(COUNSELING_STATUS.APPROVED);
        expect(CARE_STAFF_ACTIVE_COUNSELING_STATUSES).toContain(COUNSELING_STATUS.RETURNED_TO_CARE);
        expect(CARE_STAFF_ACTIVE_COUNSELING_STATUSES).toContain(COUNSELING_STATUS.RESCHEDULED);
    });

    it('handles CARE scheduling and department handoffs with v2 workflow rules', () => {
        expect(isWithCareStaffCounseling(COUNSELING_STATUS.REFERRED)).toBe(true);
        expect(isWithCareStaffCounseling(COUNSELING_STATUS.STAFF_SCHEDULED)).toBe(true);
        expect(isWithCareStaffCounseling(COUNSELING_STATUS.RETURNED_TO_CARE)).toBe(true);
        expect(isWithCareStaffCounseling(COUNSELING_STATUS.RESCHEDULED)).toBe(true);
        expect(isWithCareStaffCounseling(COUNSELING_STATUS.SCHEDULED)).toBe(false);
        expect(isCounselingReturnedToCare(COUNSELING_STATUS.RETURNED_TO_CARE)).toBe(true);
        expect(isCareStaffCounselingSchedulable(COUNSELING_STATUS.REFERRED)).toBe(true);
        expect(isCareStaffCounselingSchedulable(COUNSELING_STATUS.RETURNED_TO_CARE)).toBe(true);
        expect(isCareStaffCounselingSchedulable(COUNSELING_STATUS.PENDING)).toBe(false);
        expect(isCounselingCalendarVisible(COUNSELING_STATUS.STAFF_SCHEDULED)).toBe(true);
        expect(isCounselingCalendarVisible(COUNSELING_STATUS.RESCHEDULED)).toBe(true);
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

    it('correctly evaluates approval, outcome, and session completion transitions', () => {
        expect(isCareStaffCounselingApprovable(COUNSELING_STATUS.SUBMITTED)).toBe(true);
        expect(isCareStaffCounselingApprovable(COUNSELING_STATUS.PENDING)).toBe(true);
        expect(isCareStaffCounselingApprovable(COUNSELING_STATUS.APPROVED)).toBe(false);

        expect(isCounselingOutcomeStatus(COUNSELING_STATUS.COUNSELED)).toBe(true);
        expect(isCounselingOutcomeStatus(COUNSELING_STATUS.MONITORING)).toBe(true);
        expect(isCounselingOutcomeStatus(COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING)).toBe(true);
        expect(isCounselingOutcomeStatus(COUNSELING_STATUS.COMPLETED)).toBe(false);

        expect(isCounselingSessionDone(COUNSELING_STATUS.COMPLETED)).toBe(true);
        expect(isCounselingSessionDone(COUNSELING_STATUS.COUNSELED)).toBe(true);
        expect(isCounselingSessionDone(COUNSELING_STATUS.MONITORING)).toBe(true);
        expect(isCounselingSessionDone(COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING)).toBe(true);
        expect(isCounselingSessionDone(COUNSELING_STATUS.SCHEDULED)).toBe(false);

        expect(isCounselingReschedulable(COUNSELING_STATUS.STAFF_SCHEDULED)).toBe(true);
        expect(isCounselingReschedulable(COUNSELING_STATUS.SCHEDULED)).toBe(true);
        expect(isCounselingReschedulable(COUNSELING_STATUS.COMPLETED)).toBe(true);
        expect(isCounselingReschedulable(COUNSELING_STATUS.RESCHEDULED)).toBe(true);
        expect(isCounselingReschedulable(COUNSELING_STATUS.COUNSELED)).toBe(false);

        expect(isCounselingFollowUpEligible(COUNSELING_STATUS.COMPLETED)).toBe(true);
        expect(isCounselingFollowUpEligible(COUNSELING_STATUS.COUNSELED)).toBe(true);
        expect(isCounselingFollowUpEligible(COUNSELING_STATUS.MONITORING)).toBe(true);
        expect(isCounselingFollowUpEligible(COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING)).toBe(true);
        expect(isCounselingFollowUpEligible(COUNSELING_STATUS.REJECTED)).toBe(false);

        expect(CARE_STAFF_COUNSELING_ACTIVITY_STATUSES).toContain(COUNSELING_STATUS.APPROVED);
        expect(CARE_STAFF_COUNSELING_ACTIVITY_STATUSES).toContain(COUNSELING_STATUS.RETURNED_TO_CARE);
        expect(CARE_STAFF_COUNSELING_ACTIVITY_STATUSES).toContain(COUNSELING_STATUS.RESCHEDULED);
        expect(CARE_STAFF_COUNSELING_ACTIVITY_STATUSES).toContain(COUNSELING_STATUS.COUNSELED);
        expect(CARE_STAFF_COUNSELING_ACTIVITY_STATUSES).toContain(COUNSELING_STATUS.MONITORING);
        expect(CARE_STAFF_COUNSELING_ACTIVITY_STATUSES).toContain(COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING);
    });

    it('formats status labels and tones appropriately for staff and student audiences', () => {
        expect(getCounselingStatusLabel(COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING, 'student')).toBe('For Follow-up Session');
        expect(getCounselingStatusLabel(COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING, 'staff')).toBe('Subject for 2nd Counseling');

        expect(getCounselingStatusLabel(COUNSELING_STATUS.RETURNED_TO_CARE, 'student')).toBe('Under CARE Handling');
        expect(getCounselingStatusLabel(COUNSELING_STATUS.RETURNED_TO_CARE, 'staff')).toBe('Returned to CARE');

        expect(getCounselingStatusLabel(COUNSELING_STATUS.APPROVED, 'staff')).toBe('College Review');
        expect(getCounselingStatusLabel(COUNSELING_STATUS.APPROVED, 'student')).toBe('Approved');

        expect(getCounselingStatusLabel(COUNSELING_STATUS.REFERRED, 'student')).toBe('Referred for Counseling');
        expect(getCounselingStatusLabel(COUNSELING_STATUS.REFERRED, 'staff')).toBe('Forwarded');

        expect(getCounselingStatusTone(COUNSELING_STATUS.COMPLETED)).toContain('text-green');
        expect(getCounselingStatusTone(COUNSELING_STATUS.COUNSELED)).toContain('text-emerald');
        expect(getCounselingStatusTone(COUNSELING_STATUS.MONITORING)).toContain('text-violet');
        expect(getCounselingStatusMeta(COUNSELING_STATUS.APPROVED).staffLabel).toBe('College Review');
    });
});
