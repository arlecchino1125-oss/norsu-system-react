import { describe, expect, it } from 'vitest';
import { CARE_STAFF_REFRESHABLE_TABS } from '../../utils';

describe('forms refresh wiring', () => {
    it('allows the header Refresh View button to refresh forms data', () => {
        expect(CARE_STAFF_REFRESHABLE_TABS.has('forms')).toBe(true);
    });
});
