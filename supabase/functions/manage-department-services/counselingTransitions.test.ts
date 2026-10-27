import { describe, expect, it } from 'vitest';
import {
    COUNSELING_COMPLETABLE_STATUSES,
    COUNSELING_QUEUE_STATUSES,
    assertDeptStatusAllowed
} from './counselingTransitions';

describe('Department counselingTransitions logic', () => {
    it('restricts scheduling queue to Approved and Scheduled, and completion to college-owned Scheduled', () => {
        expect(COUNSELING_QUEUE_STATUSES).toEqual(['Approved', 'Scheduled']);
        expect(COUNSELING_COMPLETABLE_STATUSES).toEqual(['Scheduled']);
    });

    it('assertDeptStatusAllowed succeeds on Approved and Scheduled and rejects Submitted/Pending for department', () => {
        expect(() => assertDeptStatusAllowed('Approved', COUNSELING_QUEUE_STATUSES, 'department scheduling')).not.toThrow();
        expect(() => assertDeptStatusAllowed('Scheduled', COUNSELING_QUEUE_STATUSES, 'department scheduling')).not.toThrow();
        expect(() => assertDeptStatusAllowed('Submitted', COUNSELING_QUEUE_STATUSES, 'department scheduling')).toThrow(
            'This record can no longer be used for department scheduling'
        );
        expect(() => assertDeptStatusAllowed('Pending', COUNSELING_QUEUE_STATUSES, 'department scheduling')).toThrow();
    });

    it('college can complete/forward only its own Scheduled sessions, never CARE-owned ones', () => {
        expect(() => assertDeptStatusAllowed('Scheduled', COUNSELING_COMPLETABLE_STATUSES, 'completion')).not.toThrow();
        expect(() => assertDeptStatusAllowed('Rescheduled', COUNSELING_COMPLETABLE_STATUSES, 'completion')).toThrow();
        expect(() => assertDeptStatusAllowed('Staff_Scheduled', COUNSELING_COMPLETABLE_STATUSES, 'completion')).toThrow();
        expect(() => assertDeptStatusAllowed('Completed', COUNSELING_COMPLETABLE_STATUSES, 'completion')).toThrow();
    });
});
