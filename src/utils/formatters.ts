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

/**
 * Converts a potentially broken Google Drive webViewLink into a direct rendering thumbnail link.
 * This acts as a fallback "auto-healer" for images uploaded before the directLink patch.
 * Example: "https://drive.google.com/file/d/1XYZ/view" -> "https://drive.google.com/thumbnail?id=1XYZ&sz=w1000"
 */
export const getValidProfileImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    // If it's the old web view link format
    if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        }
    }
    // If it's already a direct link or something else, return it as-is
    return url;
};
