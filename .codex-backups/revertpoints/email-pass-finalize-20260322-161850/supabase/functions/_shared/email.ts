const toText = (value: unknown, fallback = '') => {
    const text = String(value ?? '').trim();
    return text || fallback;
};

export const normalizeEmail = (value: unknown) => {
    const email = String(value ?? '').trim().toLowerCase();
    return email || null;
};

export const buildDisplayName = (...parts: unknown[]) => {
    const joined = parts
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ');

    return joined || 'Student';
};

const readResponseMessage = async (response: Response) => {
    try {
        const payload = await response.clone().json();
        if (payload?.error) return String(payload.error);
        if (payload?.message) return String(payload.message);
    } catch {
        try {
            const text = await response.clone().text();
            return String(text || '').trim();
        } catch {
            return '';
        }
    }

    return '';
};

export const sendTransactionalEmail = async (payload: Record<string, unknown>) => {
    const supabaseUrl = toText(Deno.env.get('SUPABASE_URL'));
    const authKey = toText(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY'));

    if (!supabaseUrl || !authKey) {
        throw new Error('Missing Supabase email function configuration.');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${authKey}`,
            apikey: authKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const message = await readResponseMessage(response);
        throw new Error(message || `Email function request failed with status ${response.status}.`);
    }

    try {
        return await response.json();
    } catch {
        return { success: true };
    }
};

export const safelySendTransactionalEmail = async (payload: Record<string, unknown>) => {
    const email = normalizeEmail(payload.email);
    if (!email) {
        return {
            emailSent: false,
            emailWarning: 'Email address is missing.'
        };
    }

    try {
        await sendTransactionalEmail({
            ...payload,
            email
        });

        return {
            emailSent: true,
            emailWarning: null
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send email.';
        console.error('Transactional email failed:', message, payload.type || 'UNKNOWN');
        return {
            emailSent: false,
            emailWarning: message
        };
    }
};

export const getStudentEmailTarget = async (
    adminClient: any,
    studentId: unknown,
    fallbackName?: string | null
) => {
    const nextStudentId = String(studentId || '').trim();
    if (!nextStudentId) {
        return {
            email: null,
            name: toText(fallbackName, 'Student')
        };
    }

    const { data, error } = await adminClient
        .from('students')
        .select('email, first_name, last_name')
        .eq('student_id', nextStudentId)
        .maybeSingle();

    if (error) throw error;

    return {
        email: normalizeEmail(data?.email),
        name: buildDisplayName(data?.first_name, data?.last_name, fallbackName)
    };
};
