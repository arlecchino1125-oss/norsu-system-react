import { describe, expect, it } from 'vitest';
import {
    COUNSELING_COMPLETABLE_STATUSES,
    COUNSELING_QUEUE_STATUSES,
    assertDeptStatusAllowed,
    buildDeptRejectUpdate
} from './counselingTransitions';

describe('Department counselingTransitions logic', () => {
    it('restricts review queue to Approved and completion to Scheduled / Rescheduled', () => {
        expect(COUNSELING_QUEUE_STATUSES).toEqual(['Approved']);
        expect(COUNSELING_COMPLETABLE_STATUSES).toEqual(['Scheduled', 'Rescheduled']);
    });

    it('assertDeptStatusAllowed succeeds on Approved and rejects Submitted/Pending for department', () => {
        expect(() => assertDeptStatusAllowed('Approved', COUNSELING_QUEUE_STATUSES, 'department scheduling')).not.toThrow();
        expect(() => assertDeptStatusAllowed('Submitted', COUNSELING_QUEUE_STATUSES, 'department scheduling')).toThrow(
            'This record can no longer be used for department scheduling'
        );
        expect(() => assertDeptStatusAllowed('Pending', COUNSELING_QUEUE_STATUSES, 'department scheduling')).toThrow();
    });

    it('assertDeptStatusAllowed permits Scheduled and Rescheduled for completion', () => {
        expect(() => assertDeptStatusAllowed('Scheduled', COUNSELING_COMPLETABLE_STATUSES, 'completion')).not.toThrow();
        expect(() => assertDeptStatusAllowed('Rescheduled', COUNSELING_COMPLETABLE_STATUSES, 'completion')).not.toThrow();
        expect(() => assertDeptStatusAllowed('Completed', COUNSELING_COMPLETABLE_STATUSES, 'completion')).toThrow();
    });

    it('buildDeptRejectUpdate writes Returned_To_Care', () => {
        const update = buildDeptRejectUpdate('Cannot handle at department level');
        expect(update.status).toBe('Returned_To_Care');
        expect(update.resolution_notes).toBe('Cannot handle at department level');
    });
});
