import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearLogoutStorage,
    getSupabaseAuthStorageKey,
    signOutAndClearBrowserState
} from './authLogout';

const AUTH_STORAGE_KEY = 'sb-project-ref-auth-token';

const seedSensitiveStorage = () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'auth-session');
    localStorage.setItem(`${AUTH_STORAGE_KEY}-code-verifier`, 'verifier');
    localStorage.setItem(`${AUTH_STORAGE_KEY}-user`, 'user');
    localStorage.setItem('norsu_session', 'app-session');
    localStorage.setItem('care_staff_notes', 'private-notes');
    localStorage.setItem('norsu_session:v1', 'app-session');
    localStorage.setItem('care_staff_notes:v1', 'private-notes');
    localStorage.setItem('profile_completion_draft_2024-001', 'profile-draft');
    localStorage.setItem('profile_completion_step_2024-001', '3');
    localStorage.setItem('norsu_force_profile_completion_student_id', 'profile-handoff');
    localStorage.setItem('norsu-nat-application-draft-v1', 'legacy-nat-draft');
    sessionStorage.setItem('norsu_force_profile_completion_student_id', 'profile-handoff');
    sessionStorage.setItem('norsu-nat-application-draft-v1', 'nat-draft');
    sessionStorage.setItem('norsu-nat-applicant-session-v1', 'nat-session');

    localStorage.setItem('norsu_public_theme', 'dark');
    localStorage.setItem('sb-other-project-auth-token', 'other-project-session');
};

describe('secure browser logout', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('derives the same project-scoped storage key used by supabase-js', () => {
        expect(getSupabaseAuthStorageKey('https://project-ref.supabase.co'))
            .toBe(AUTH_STORAGE_KEY);
    });

    it('removes only the current auth credentials and known sensitive drafts', () => {
        seedSensitiveStorage();

        clearLogoutStorage(AUTH_STORAGE_KEY);

        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(`${AUTH_STORAGE_KEY}-code-verifier`)).toBeNull();
        expect(localStorage.getItem(`${AUTH_STORAGE_KEY}-user`)).toBeNull();
        expect(localStorage.getItem('norsu_session')).toBeNull();
        expect(localStorage.getItem('care_staff_notes')).toBeNull();
        expect(localStorage.getItem('norsu_session:v1')).toBeNull();
        expect(localStorage.getItem('care_staff_notes:v1')).toBeNull();
        expect(localStorage.getItem('profile_completion_draft_2024-001')).toBeNull();
        expect(localStorage.getItem('profile_completion_step_2024-001')).toBeNull();
        expect(localStorage.getItem('norsu_force_profile_completion_student_id')).toBeNull();
        expect(localStorage.getItem('norsu-nat-application-draft-v1')).toBeNull();
        expect(sessionStorage.getItem('norsu_force_profile_completion_student_id')).toBeNull();
        expect(sessionStorage.getItem('norsu-nat-application-draft-v1')).toBeNull();
        expect(sessionStorage.getItem('norsu-nat-applicant-session-v1')).toBeNull();

        expect(localStorage.getItem('norsu_public_theme')).toBe('dark');
        expect(localStorage.getItem('sb-other-project-auth-token')).toBe('other-project-session');
    });

    it('clears local credentials when Supabase returns a logout error', async () => {
        seedSensitiveStorage();
        const error = new Error('Network request failed');
        const signOut = vi.fn().mockResolvedValue({ error });

        await expect(signOutAndClearBrowserState({ auth: { signOut } }, AUTH_STORAGE_KEY))
            .resolves.toBe(error);

        expect(signOut).toHaveBeenCalledOnce();
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem('norsu_session')).toBeNull();
    });

    it('clears local credentials when Supabase unexpectedly rejects', async () => {
        seedSensitiveStorage();
        const error = new Error('Storage unavailable');
        const signOut = vi.fn().mockRejectedValue(error);

        await expect(signOutAndClearBrowserState({ auth: { signOut } }, AUTH_STORAGE_KEY))
            .resolves.toBe(error);

        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem('norsu_session')).toBeNull();
    });
});
