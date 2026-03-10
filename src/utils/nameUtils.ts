export interface NameParts {
    given: string;
    middle: string;
    last: string;
}

export const splitFullName = (rawValue: string | null | undefined): NameParts => {
    const cleaned = String(rawValue || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) return { given: '', middle: '', last: '' };

    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length === 1) return { given: parts[0], middle: '', last: '' };
    if (parts.length === 2) return { given: parts[0], middle: '', last: parts[1] };

    return {
        given: parts[0],
        middle: parts.slice(1, -1).join(' '),
        last: parts[parts.length - 1]
    };
};

export const joinNameParts = ({
    given,
    middle,
    last
}: Partial<NameParts>) => [given, middle, last].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
