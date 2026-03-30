import { beforeEach, describe, expect, it } from 'vitest';

import {
    clearPendingProfileCompletion,
    getPendingProfileCompletionProfile,
    getPendingProfileCompletionStudentId,
    rememberPendingProfileCompletion,
    shouldForceProfileCompletionPrompt
} from './studentProfileCompletionPrompt';

describe('studentProfileCompletionPrompt', () => {
    beforeEach(() => {
        window.sessionStorage.clear();
        window.localStorage.clear();
    });

    it('stores and resolves the pending student id for the first portal entry', () => {
        rememberPendingProfileCompletion(' 202312345 ', {
            firstName: 'Jamie',
            email: 'jamie@example.com'
        });

        expect(getPendingProfileCompletionStudentId()).toBe('202312345');
        expect(getPendingProfileCompletionProfile('202312345')).toEqual({
            firstName: 'Jamie',
            email: 'jamie@example.com'
        });
        expect(shouldForceProfileCompletionPrompt('202312345')).toBe(true);
        expect(shouldForceProfileCompletionPrompt('202300000')).toBe(false);
    });

    it('clears the handoff once the matching profile is completed', () => {
        rememberPendingProfileCompletion('202312345');

        clearPendingProfileCompletion('202312345');

        expect(getPendingProfileCompletionStudentId()).toBe('');
        expect(shouldForceProfileCompletionPrompt('202312345')).toBe(false);
    });

    it('can restore the pending profile handoff from shared local storage', () => {
        window.localStorage.setItem('norsu_force_profile_completion_student_id', JSON.stringify({
            studentId: '202355555',
            profile: {
                firstName: 'Casey'
            }
        }));

        expect(getPendingProfileCompletionStudentId()).toBe('202355555');
        expect(getPendingProfileCompletionProfile('202355555')).toEqual({
            firstName: 'Casey'
        });
    });
});
