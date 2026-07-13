// claude
// Detects social-app in-app browsers (webviews) — chiefly Facebook and Facebook
// Lite, which is how most students open the app from a posted link. These webviews
// break login two ways: no password-manager autofill (more mistyped passwords) and
// partitioned/ephemeral WebKit storage that can drop the Supabase session right
// after sign-in. We surface a "open in a real browser" nudge when detected.
//
// Markers: FBAN/FBAV/FBLC (Facebook iOS), FB4A/FB_IAB (Facebook + FB Lite Android),
// Instagram (IG in-app browser). Substring match is enough — these tokens are
// distinctive and only appear in the respective in-app browsers.
const IN_APP_BROWSER_MARKERS = /FBAN|FBAV|FBLC|FB4A|FB_IAB|Instagram/i;

export const isInAppBrowser = (
    userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''
): boolean => IN_APP_BROWSER_MARKERS.test(userAgent);
