/**
 * Centralized formatting utility functions for the NORSU System React app.
 * Reduces repetitive parsing code inside components.
 */

/**
 * Formats a date string into a standard readable date.
 * Example: "2024-05-15T00:00:00Z" -> "May 15, 2024" or localized string
 * @param dateStr ISO date string
 * @returns Formatted date string or a fallback if null/invalid
 */
export const formatDate = (dateStr: string | null | undefined, fallback = '—'): string => {
    if (!dateStr) return fallback;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? fallback : date.toLocaleDateString();
};

/**
 * Formats a date string into a standard readable time.
 * Example: "2024-05-15T14:30:00Z" -> "2:30 PM"
 * @param dateStr ISO date string
 * @returns Formatted time string or a fallback if null/invalid
 */
export const formatTime = (dateStr: string | null | undefined, fallback = '—'): string => {
    if (!dateStr) return fallback;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? fallback : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formats a date string into a combined Date and Time string.
 * Example: -> "May 15, 2024, 2:30 PM"
 * @param dateStr ISO date string
 */
export const formatDateTime = (dateStr: string | null | undefined, fallback = '—'): string => {
    if (!dateStr) return fallback;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? fallback : date.toLocaleString();
};

/**
 * Generates an export filename appending the current date.
 * Example: "Students_List" -> "Students_List_2024-05-15.xlsx"
 */
export const generateExportFilename = (prefix: string, extension: string): string => {
    const dateStr = new Date().toISOString().split('T')[0];
    return `${prefix}_${dateStr}.${extension}`;
};
