import { COUNSELING_STATUS } from './workflow';

export type CounselingAudience = 'staff' | 'student';

export interface CounselingStatusMeta {
    staffLabel: string;
    studentLabel: string;
    tone: string;
}

export const COUNSELING_STATUS_META: Record<string, CounselingStatusMeta> = {
    [COUNSELING_STATUS.PENDING]: {
        staffLabel: 'Pending Review',
        studentLabel: 'Pending Review',
        tone: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    [COUNSELING_STATUS.SUBMITTED]: {
        staffLabel: 'Pending Review',
        studentLabel: 'Pending Review',
        tone: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    [COUNSELING_STATUS.APPROVED]: {
        staffLabel: 'College Review',
        studentLabel: 'Approved',
        tone: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    [COUNSELING_STATUS.RETURNED_TO_CARE]: {
        staffLabel: 'Returned to CARE',
        studentLabel: 'Under CARE Handling',
        tone: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    [COUNSELING_STATUS.REFERRED]: {
        staffLabel: 'Forwarded',
        studentLabel: 'Referred for Counseling',
        tone: 'bg-purple-100 text-purple-700 border-purple-200'
    },
    [COUNSELING_STATUS.STAFF_SCHEDULED]: {
        staffLabel: 'With CARE Staff',
        studentLabel: 'With CARE Staff',
        tone: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    [COUNSELING_STATUS.SCHEDULED]: {
        staffLabel: 'Scheduled',
        studentLabel: 'Scheduled',
        tone: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    [COUNSELING_STATUS.RESCHEDULED]: {
        staffLabel: 'Rescheduled',
        studentLabel: 'Rescheduled',
        tone: 'bg-cyan-100 text-cyan-700 border-cyan-200'
    },
    [COUNSELING_STATUS.COMPLETED]: {
        staffLabel: 'Completed',
        studentLabel: 'Completed',
        tone: 'bg-green-100 text-green-700 border-green-200'
    },
    [COUNSELING_STATUS.COUNSELED]: {
        staffLabel: 'Counseled',
        studentLabel: 'Counseled',
        tone: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    [COUNSELING_STATUS.MONITORING]: {
        staffLabel: 'Monitoring',
        studentLabel: 'Monitoring',
        tone: 'bg-violet-100 text-violet-700 border-violet-200'
    },
    [COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING]: {
        staffLabel: 'Subject for 2nd Counseling',
        studentLabel: 'For Follow-up Session',
        tone: 'bg-rose-100 text-rose-700 border-rose-200'
    },
    [COUNSELING_STATUS.REJECTED]: {
        staffLabel: 'Rejected',
        studentLabel: 'Rejected',
        tone: 'bg-red-100 text-red-700 border-red-200'
    }
};

const DEFAULT_META: CounselingStatusMeta = {
    staffLabel: 'Unknown',
    studentLabel: 'Unknown',
    tone: 'bg-gray-100 text-gray-600 border-gray-200'
};

export function getCounselingStatusMeta(status?: string | null): CounselingStatusMeta {
    if (!status) return DEFAULT_META;
    return COUNSELING_STATUS_META[status] ?? {
        staffLabel: status,
        studentLabel: status,
        tone: DEFAULT_META.tone
    };
}

export function getCounselingStatusLabel(
    status?: string | null,
    audience: CounselingAudience = 'staff'
): string {
    const meta = getCounselingStatusMeta(status);
    return audience === 'student' ? meta.studentLabel : meta.staffLabel;
}

export function getCounselingStatusTone(status?: string | null): string {
    return getCounselingStatusMeta(status).tone;
}
