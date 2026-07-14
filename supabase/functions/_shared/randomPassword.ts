const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

type RandomBytes = (length: number) => Uint8Array;

export const generateRandomPassword = (
    length = 12,
    randomBytes: RandomBytes = (size) => crypto.getRandomValues(new Uint8Array(size))
) => {
    const bytes = randomBytes(length);
    if (bytes.length < length) throw new Error('Random password source returned too few bytes.');

    return Array.from(bytes.slice(0, length), (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('');
};
