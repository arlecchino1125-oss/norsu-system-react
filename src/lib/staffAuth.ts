export const sanitizeStaffSession = (staff: any, authUser?: { id?: string; email?: string } | null) => {
    const { password, ...safeStaff } = staff || {};
    const authUserId = authUser?.id || safeStaff.auth_user_id || null;
    const authEmail = authUser?.email
        || safeStaff.email
        || safeStaff.auth_email
        || null;

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
