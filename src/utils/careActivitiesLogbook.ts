/** Shared pieces for the CARE activities logbook (student + care staff views). */

// Re-use all date/status helpers from peer support — identical behaviour.
export {
    monthKeyOf,
    monthStartOf,
    monthLabelOf,
    todayIso,
    shouldPromptSubmit,
    LOGBOOK_STATUS_TONE
} from './peerLogbook';

export const CARE_LOG_ENTRY_COLUMNS = `
    id, logbook_id, logbook_month, entry_date, logged_at,
    activity_type, action_taken, speakers, remarks
`;

export interface CareActivityLogEntry {
    id: string;
    logbook_id: string;
    logbook_month: string;
    entry_date: string;
    logged_at: string;
    activity_type: string;
    action_taken: string;
    speakers: string | null;
    remarks: string | null;
}

export interface CareActivityLogEntryDraft {
    entry_date: string;
    activity_type: string;
    action_taken: string;
    speakers: string;
    remarks: string;
}
