import { supabase } from '../lib/supabase';

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
            formData.append('file', file);
            if (studentId) {
                formData.append('studentId', studentId);
            }

            const { data, error } = await supabase.functions.invoke('upload-to-drive', {
                body: formData,
            });

            if (error) {
                console.error('Edge Function Error:', error);
                return { success: false, error: error.message };
            }

            if (!data.success) {
                return { success: false, error: data.error || 'Upload failed' };
            }

            return {
                success: true,
                fileId: data.fileId,
                webViewLink: data.webViewLink,
                directLink: data.directLink
            };
        } catch (err: any) {
            console.error('Upload exception:', err);
            return { success: false, error: err.message || 'An unexpected error occurred during upload' };
        }
    }
};
