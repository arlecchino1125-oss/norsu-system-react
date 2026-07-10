import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPeerFacilitatorStatusEmailPayload } from './peerFacilitatorEmail';

describe('peer facilitator email wiring', () => {
    it('builds a status update email payload for the volunteer', () => {
        const payload = buildPeerFacilitatorStatusEmailPayload({
            school_year: '2026-2027',
            students: {
                email: ' Volunteer@Example.com ',
                first_name: 'Cejie',
                last_name: 'Bustamante'
            }
        }, 'approved');

        expect(payload).toEqual({
            type: 'PEER_FACILITATOR_STATUS_UPDATE',
            email: 'volunteer@example.com',
            name: 'Cejie Bustamante',
            status: 'approved',
            schoolYear: '2026-2027'
        });
    });

    it('keeps a peer facilitator template in the email function', () => {
        const source = readFileSync(resolve(process.cwd(), 'supabase/functions/send-email/index.ts'), 'utf8');

        expect(source).toContain("case 'PEER_FACILITATOR_STATUS_UPDATE'");
        expect(source).toContain('CARE Peer Facilitator');
    });
});
