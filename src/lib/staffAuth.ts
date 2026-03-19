const STAFF_AUTH_DOMAIN = 'staff.norsu.local';

export const buildStaffAuthEmail = (username: string) =>
    `${String(username || '').trim().toLowerCase()}@${STAFF_AUTH_DOMAIN}`;

export const sanitizeStaffSession = (staff: any, authUser?: { id?: string; email?: string } | null) => {
    const { password, ...safeStaff } = staff || {};
    const authUserId = authUser?.id || safeStaff.auth_user_id || null;
    const authEmail = authUser?.email
        || safeStaff.auth_email
        || (safeStaff.username ? buildStaffAuthEmail(safeStaff.username) : null);

    return {
        ...safeStaff,
        auth_user_id: authUserId,
        auth_email: authEmail,
        userType: 'staff',
        user: authUserId || authEmail
            ? {
                id: authUserId,
                email: authEmail
            }
            : undefined
    };
};
