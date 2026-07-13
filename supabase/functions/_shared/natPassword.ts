// NAT applicant password hashing. New hashes use salted PBKDF2-SHA256;
// legacy unsalted SHA-256 hex hashes still verify and are flagged for upgrade
// so callers can re-hash after a successful login. Web Crypto only, so the
// module runs in both Deno (edge functions) and Node (vitest).

const textEncoder = new TextEncoder();

export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const toHex = (bytes: Uint8Array) =>
    Array.from(bytes)
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');

const fromHex = (value: string) =>
    new Uint8Array((value.match(/.{2}/g) || []).map((pair) => Number.parseInt(pair, 16)));

const derivePbkdf2 = async (password: string, salt: Uint8Array, iterations: number) => {
    const key = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
        key,
        KEY_BITS
    );
    return new Uint8Array(bits);
};

const legacySha256Hex = async (password: string) => {
    const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(password));
    return toHex(new Uint8Array(digest));
};

// Constant-time comparison; length mismatch may return early (length is not secret).
const hexEquals = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let difference = 0;
    for (let index = 0; index < a.length; index += 1) {
        difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
    }
    return difference === 0;
};

export const hashNatPassword = async (password: string) => {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const derived = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
    return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(derived)}`;
};

export type NatPasswordCheck = {
    valid: boolean;
    needsUpgrade: boolean;
};

export const verifyNatPassword = async (password: string, storedHash: unknown): Promise<NatPasswordCheck> => {
    const stored = String(storedHash || '').trim();
    if (!password || !stored) return { valid: false, needsUpgrade: false };

    if (stored.startsWith('pbkdf2$')) {
        const [, iterationsText, saltHex, hashHex] = stored.split('$');
        const iterations = Number(iterationsText);
        if (
            !Number.isInteger(iterations) || iterations < 1_000 || iterations > 10_000_000
            || !saltHex || !hashHex || /[^0-9a-f]/i.test(saltHex) || /[^0-9a-f]/i.test(hashHex)
        ) {
            return { valid: false, needsUpgrade: false };
        }
        const derived = toHex(await derivePbkdf2(password, fromHex(saltHex.toLowerCase()), iterations));
        return {
            valid: hexEquals(derived, hashHex.toLowerCase()),
            needsUpgrade: iterations < PBKDF2_ITERATIONS
        };
    }

    const valid = hexEquals(await legacySha256Hex(password), stored.toLowerCase());
    return { valid, needsUpgrade: valid };
};
