import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { google } from 'npm:googleapis@126.0.1';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });

const ALLOWED_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf'
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

const getAuthClient = () => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase service role configuration.');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

const getBearerTokenFromHeader = (value: string | null) => {
    const headerValue = String(value || '').trim();
    if (!headerValue.toLowerCase().startsWith('bearer ')) {
        return null;
    }

    const token = headerValue.slice('Bearer '.length).trim();
    return token || null;
};

// Any authenticated portal user (student or staff) may upload; this blocks
// anonymous callers from using the org Google Drive as free file hosting.
const requireAuthenticatedUser = async (request: Request) => {
    const accessToken = getBearerTokenFromHeader(
        request.headers.get('x-supabase-auth')
        || request.headers.get('x-client-authorization')
        || request.headers.get('Authorization')
    );
    if (!accessToken) {
        throw withStatus('Missing authenticated session.', 401);
    }

    const { data, error } = await getAuthClient().auth.getUser(accessToken);
    if (error || !data?.user) {
        throw withStatus('Unable to verify the current user.', 401);
    }

    return data.user;
};

serve(async (request) => {
    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed.' }, 405);
    }

    try {
        await requireAuthenticatedUser(request);

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const studentId = formData.get('studentId') as string | null;

        if (!file) {
            return json({ success: false, error: 'No file uploaded.' }, 400);
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return json({ success: false, error: 'Unsupported file type. Allowed: PNG, JPEG, WebP, GIF, PDF.' }, 400);
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            return json({ success: false, error: 'File is too large. Maximum size is 10 MB.' }, 400);
        }

        // Environment variables for Google Auth
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
        const driveFolderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');

        if (!clientId || !clientSecret || !refreshToken || !driveFolderId) {
            console.error('Missing Google OAuth credentials in environment.');
            return json({ success: false, error: 'Server misconfiguration. Missing OAuth credentials.' }, 200);
        }

        // Initialize Google OAuth2 Client
        const authClient = new google.auth.OAuth2(clientId, clientSecret);
        authClient.setCredentials({ refresh_token: refreshToken });

        // Convert the File object to a Buffer/Stream for googleapis
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Use Readable stream for upload
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(uint8Array);
                controller.close();
            }
        });
        
        // Wait, node readable streams might be expected. The googleapis npm package running in Deno 
        // can accept standard Web Streams or Buffers. Let's use a Blob/Buffer wrapper if needed.
        // Actually, npm:googleapis expects a Node.js Readable stream. Let's use a simpler approach.
        // Deno's compatibility layer allows passing Uint8Array directly if we wrap it, or we can use the fetch API directly,
        // but since we are using googleapis, we can pass a readable stream converted to node format or just the Uint8Array.
        // Actually, passing `media: { mimeType: file.type, body: stream }` might fail if it's a Web Stream.
        // An easier way in Deno is to convert the ArrayBuffer to a Node Buffer.
        // Deno has Node polyfills via `node:buffer`.

        // Let's do the safe Deno way for googleapis:
        const { Buffer } = await import('node:buffer');
        const buffer = Buffer.from(arrayBuffer);

        const fileMetadata = {
            name: `${studentId ? studentId + '_' : ''}${file.name}`,
            parents: [driveFolderId]
        };

        // We use raw REST API to avoid stream incompatibilities in Deno
        
        // Let's get the token and use fetch.
        const tokenResponse = await authClient.getAccessToken();
        const accessToken = tokenResponse.token;

        if (!accessToken) {
             throw new Error('Failed to retrieve access token');
        }

        // Upload using raw fetch to avoid Node stream incompatibilities in Deno
        const boundary = 'foo_bar_baz';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        let multipartRequestBody = '';
        multipartRequestBody += delimiter;
        multipartRequestBody += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
        multipartRequestBody += JSON.stringify(fileMetadata);
        multipartRequestBody += delimiter;
        multipartRequestBody += `Content-Type: ${file.type}\r\n\r\n`;

        // We have to mix text and binary. Easiest way in Deno:
        const encoder = new TextEncoder();
        const bodyParts = [
            encoder.encode(multipartRequestBody),
            new Uint8Array(arrayBuffer),
            encoder.encode(closeDelimiter)
        ];

        const totalLength = bodyParts.reduce((acc, val) => acc + val.length, 0);
        const finalBody = new Uint8Array(totalLength);
        let offset = 0;
        for (const part of bodyParts) {
            finalBody.set(part, offset);
            offset += part.length;
        }

        const uploadRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                    'Content-Length': finalBody.length.toString(),
                },
                body: finalBody,
            }
        );

        if (!uploadRes.ok) {
            const errBody = await uploadRes.text();
            console.error('Google Drive API Error:', errBody);
            throw new Error(`Google Drive API failed: ${uploadRes.status} - ${errBody}`);
        }

        const driveData = await uploadRes.json();

        // Make the file publicly viewable so it can be displayed in an <img> tag in the portal
        await fetch(`https://www.googleapis.com/drive/v3/files/${driveData.id}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'reader', type: 'anyone' })
        });

        // Google blocks uc?export=view in <img> tags now. We must use thumbnailLink.
        // The thumbnailLink has a size parameter (e.g. =s220). We replace it to get a high-res image.
        const directLink = driveData.thumbnailLink ? driveData.thumbnailLink.replace(/=s\d+$/, '=s1000') : '';

        return json({
            success: true,
            fileId: driveData.id,
            webViewLink: driveData.webViewLink,
            directLink: directLink
        });

    } catch (error) {
        console.error('Upload error:', error);
        await captureEdgeException(error, { endpoint: 'upload-to-drive' });
        const message = error instanceof Error ? error.message : 'Unexpected upload error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 200;
        return json({ success: false, error: message }, status);
    }
});
