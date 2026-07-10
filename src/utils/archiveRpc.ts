// sessionStorage flags used by both the care-staff population page and the
// student profile flow to remember whether the archive_and_reset_expired_course_year
// RPC exists on the backend. Shared so the key strings can't drift between portals.
export const ARCHIVE_RPC_MISSING_CACHE_KEY = 'norsu_archive_rpc_missing';
export const ARCHIVE_RPC_CHECKED_CACHE_KEY = 'norsu_archive_rpc_checked_student';
