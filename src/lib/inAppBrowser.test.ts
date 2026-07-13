// claude
import { describe, it, expect } from 'vitest';
import { isInAppBrowser } from './inAppBrowser';

describe('isInAppBrowser', () => {
    it('detects the Facebook iOS in-app browser (real UA from the auth log)', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22H355 [FBAN/FBIOS;FBAV/567.0.0.48.70;FBDV/iPhone11,8;FBLC/en_Qaau_US]';
        expect(isInAppBrowser(ua)).toBe(true);
    });

    it('detects Facebook / Facebook Lite on Android (FB4A / FB_IAB)', () => {
        const ua = 'Mozilla/5.0 (Linux; Android 13; TECNO BG6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.0;]';
        expect(isInAppBrowser(ua)).toBe(true);
    });

    it('detects the Instagram in-app browser', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0.0.0';
        expect(isInAppBrowser(ua)).toBe(true);
    });

    it('returns false for normal mobile Safari', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
        expect(isInAppBrowser(ua)).toBe(false);
    });

    it('returns false for desktop Chrome', () => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        expect(isInAppBrowser(ua)).toBe(false);
    });
});
