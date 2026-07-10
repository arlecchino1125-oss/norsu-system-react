export const PEER_FACILITATOR_STATUS_EMAIL_TYPE = 'PEER_FACILITATOR_STATUS_UPDATE';

const toCleanText = (value: unknown) => String(value || '').trim();

export const buildPeerFacilitatorStatusEmailPayload = (application: any, status: string) => {
    const student = application?.students || {};
    const email = toCleanText(student.email).toLowerCase();
    if (!email) return null;

    const name = [student.first_name, student.last_name].map(toCleanText).filter(Boolean).join(' ') || 'Volunteer';

    return {
        type: PEER_FACILITATOR_STATUS_EMAIL_TYPE,
        email,
        name,
        status,
        schoolYear: toCleanText(application?.school_year)
    };
};
