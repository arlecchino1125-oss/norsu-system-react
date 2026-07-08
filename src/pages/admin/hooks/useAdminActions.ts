import { supabase } from '../../../lib/supabase';
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction';
import { getArchiveSchemaErrorMessage } from '../utils';

export function useAdminActions({ showToast, session, refetchAccounts }: { showToast: (msg: string, type?: string) => void; session?: any; refetchAccounts?: () => void }) {

    const invokeManagedStaffFunction = async (body: any) => {
        return invokeEdgeFunction('manage-staff-accounts', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your admin session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to manage staff account.'
        });
    };

    const invokeManagedStudentFunction = async (body: any) => {
        return invokeEdgeFunction('manage-student-accounts', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your admin session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to manage student accounts.'
        });
    };

    const handleArchiveAccount = async (account: any, archivingAccountId: string | null, setArchivingAccountId: (id: string | null) => void) => {
        const nextAccountId = String(account?.id || '').trim();
        if (!nextAccountId || archivingAccountId === nextAccountId) return;

        const currentSessionId = String(session?.id || '').trim();
        const currentAuthUserId = String(session?.auth_user_id || session?.user?.id || '').trim();
        if (
            (currentSessionId && String(account.id) === currentSessionId)
            || (currentAuthUserId && String(account.auth_user_id || '') === currentAuthUserId)
        ) {
            showToast('You cannot archive the account you are currently using.', 'error');
            return;
        }

        const accountLabel = String(account.full_name || account.username || 'this staff account').trim();
        if (!confirm(`Archive ${accountLabel}? The record stays saved, but it will be removed from active staff account lists and blocked from login.`)) return;
        setArchivingAccountId(nextAccountId);

        try {
            const { error } = await supabase
                .from('staff_accounts')
                .update({
                    is_archived: true,
                    archived_at: new Date().toISOString(),
                    archive_note: 'Archived from the admin dashboard.'
                })
                .eq('id', Number(nextAccountId));

            if (error) throw error;

            showToast(`Staff account "${accountLabel}" archived.`);
            if (refetchAccounts) await refetchAccounts();
        } catch (error: any) {
            showToast(getArchiveSchemaErrorMessage(error, 'Failed to archive staff account.'), 'error');
        } finally {
            setArchivingAccountId(null);
        }
    };

    return {
        invokeManagedStaffFunction,
        invokeManagedStudentFunction,
        handleArchiveAccount
    };
}
