import { supabase } from '../lib/supabase';
import { getFriendlyErrorMessage } from '../lib/invokeEdgeFunction';

export interface DriveUploadResponse {
    success: boolean;
    fileId?: string;
    webViewLink?: string;
    directLink?: string;
    error?: string;
}

export const driveService = {
    /**
     * Uploads a file to Google Drive via the Supabase Edge Function
     * @param file The file object to upload
     * @param studentId Optional student ID to prefix the filename
     * @returns The Google Drive fileId and webViewLink
     */
    uploadFile: async (file: File, studentId?: string): Promise<DriveUploadResponse> => {
        try {
            const formData = new FormData();
            // ponytail: Reading the file into memory as a Blob prevents net::ERR_UPLOAD_FILE_CHANGED in Chrome/Chromium.
            const fileData = await file.arrayBuffer();
            const blob = new Blob([fileData], { type: file.type });
            formData.append('file', blob, file.name);
            if (studentId) {
                formData.append('studentId', studentId);
            }

            const { data, error } = await supabase.functions.invoke('upload-to-drive', {
                body: formData,
            });

            if (error) {
                console.error('Edge Function Error:', error);
                const friendlyMessage = getFriendlyErrorMessage(error.message);
                return { success: false, error: friendlyMessage };
            }

            if (!data.success) {
                const rawError = data.error || 'Upload failed';
                const friendlyMessage = getFriendlyErrorMessage(rawError);
                return { success: false, error: friendlyMessage };
            }

            return {
                success: true,
                fileId: data.fileId,
                webViewLink: data.webViewLink,
                directLink: data.directLink
            };
        } catch (err: any) {
            console.error('Upload exception:', err);
            const rawError = err.message || 'An unexpected error occurred during upload';
            const friendlyMessage = getFriendlyErrorMessage(rawError);
            return { success: false, error: friendlyMessage };
        }
    }
};
