import { describe, expect, it } from 'vitest';
import {
    CARE_ALLOWED_OUTCOMES,
    CARE_APPROVABLE_COUNSELING_STATUSES,
    CARE_COMPLETABLE_COUNSELING_STATUSES,
    CARE_FOLLOW_UP_ELIGIBLE_STATUSES,
    CARE_OUTCOME_ELIGIBLE_STATUSES,
    CARE_RESCHEDULABLE_STATUSES,
    CARE_SCHEDULABLE_COUNSELING_STATUSES,
    assertCareStatusAllowed,
    assertNoExistingFollowUp,
    buildFollowUpInsertPayload,
    validateOutcomeStatus
} from './counselingTransitions';

describe('CARE counselingTransitions logic', () => {
    it('defines the correct status matrices for approval, scheduling, completion', () => {
        expect(CARE_APPROVABLE_COUNSELING_STATUSES).toEqual(['Submitted', 'Pending']);
        expect(CARE_SCHEDULABLE_COUNSELING_STATUSES).toEqual(['Referred', 'Returned_To_Care']);
        expect(CARE_COMPLETABLE_COUNSELING_STATUSES).toEqual(['Scheduled', 'Staff_Scheduled', 'Rescheduled']);
        expect(CARE_OUTCOME_ELIGIBLE_STATUSES).toEqual(['Completed']);
        expect(CARE_ALLOWED_OUTCOMES).toEqual(['Counseled', 'Monitoring', 'Subject_For_2nd_Counseling']);
        expect(CARE_RESCHEDULABLE_STATUSES).toEqual(['Staff_Scheduled', 'Scheduled', 'Rescheduled', 'Completed']);
        expect(CARE_FOLLOW_UP_ELIGIBLE_STATUSES).toEqual([
            'Completed',
            'Counseled',
            'Monitoring',
            'Subject_For_2nd_Counseling'
        ]);
    });

    it('assertCareStatusAllowed succeeds on permitted status and throws on disallowed', () => {
        expect(() => assertCareStatusAllowed('Submitted', CARE_APPROVABLE_COUNSELING_STATUSES, 'approval')).not.toThrow();
        expect(() => assertCareStatusAllowed('Approved', CARE_APPROVABLE_COUNSELING_STATUSES, 'approval')).toThrow(
            'This record can no longer be used for approval'
        );
        expect(() => assertCareStatusAllowed('Staff_Scheduled', CARE_RESCHEDULABLE_STATUSES, 'rescheduling')).not.toThrow();
        expect(() => assertCareStatusAllowed('Scheduled', CARE_RESCHEDULABLE_STATUSES, 'rescheduling')).not.toThrow();
        expect(() => assertCareStatusAllowed('Rescheduled', CARE_RESCHEDULABLE_STATUSES, 'rescheduling')).not.toThrow();
        expect(() => assertCareStatusAllowed('Completed', CARE_RESCHEDULABLE_STATUSES, 'rescheduling')).not.toThrow();
        expect(() => assertCareStatusAllowed('Counseled', CARE_RESCHEDULABLE_STATUSES, 'rescheduling')).toThrow(
            'This record can no longer be used for rescheduling'
        );
    });

    it('validateOutcomeStatus validates allowed outcome statuses', () => {
        expect(validateOutcomeStatus('Counseled')).toBe('Counseled');
        expect(validateOutcomeStatus('Monitoring')).toBe('Monitoring');
        expect(validateOutcomeStatus('Subject_For_2nd_Counseling')).toBe('Subject_For_2nd_Counseling');
        expect(() => validateOutcomeStatus('Invalid_Status')).toThrow('Invalid outcome status');
    });

    it('assertNoExistingFollowUp throws when an active child exists', () => {
        expect(() => assertNoExistingFollowUp([])).not.toThrow();
        expect(() => assertNoExistingFollowUp([{ id: 1, status: 'Rejected' }])).not.toThrow();
        expect(() => assertNoExistingFollowUp([{ id: 2, status: 'Referred' }])).toThrow(
            'A follow-up counseling session has already been created for this request.'
        );
    });

    it('buildFollowUpInsertPayload builds correct row with and without schedule', () => {
        const parent = {
            id: 10,
            student_id: '2023-0001',
            student_name: 'John Doe',
            department: 'CCS',
            course_year: 'BSCS 3',
            contact_number: '09123456789',
            description: 'Parent issue'
        };

        const undated = buildFollowUpInsertPayload(parent, { actorName: 'Care Staff Alice' });
        expect(undated.follow_up_of).toBe(10);
        expect(undated.request_type).toBe('Follow-up Counseling');
        expect(undated.status).toBe('Referred');
        expect(undated.scheduled_date).toBeNull();
        expect(undated.referred_by).toBe('Care Staff Alice');

        const dated = buildFollowUpInsertPayload(parent, {
            date: '2026-10-01',
            time: '14:00',
            notes: 'Follow-up discussion',
            actorName: 'Care Staff Bob'
        });
        expect(dated.status).toBe('Staff_Scheduled');
        expect(dated.scheduled_date).toBe('2026-10-01 14:00');
        expect(dated.description).toBe('Follow-up discussion');
    });
});
