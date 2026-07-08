import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Bridges a portal's existing `activeTab` state to the URL so that each
 * section is a real, shareable address. The URL is the source of navigation
 * intent: `goToTab` pushes a history entry, and a matching `:tab` route param
 * drives the local state back through `onTabResolved`. This gives Back/forward,
 * refresh persistence, and deep links without rewriting each portal's render
 * switch.
 *
 * Usage: seed `useState` from `readInitialTab(...)` to avoid a first-paint flash,
 * then pass the raw setter as `onTabResolved`.
 */
export function usePortalTabRoute<T extends string>(opts: {
  /** Route prefix that precedes the `:tab` segment, e.g. '/care-staff/dashboard'. */
  basePath: string;
  /** All valid tab ids (typically the portal's ACTIVE_TABS array). */
  tabs: readonly T[];
  /** Tab used when the URL has no/invalid segment. */
  defaultTab: T;
  /** Current active tab (used to skip redundant state updates). */
  activeTab: T;
  /** Called when the URL resolves to a valid, different tab (back/forward/deep-link). */
  onTabResolved: (tab: T) => void;
}) {
  const { basePath, tabs, defaultTab, activeTab, onTabResolved } = opts;
  const navigate = useNavigate();
  const { tab: urlTab } = useParams<{ tab?: string }>();

  useEffect(() => {
    if (urlTab && (tabs as readonly string[]).includes(urlTab)) {
      if (urlTab !== activeTab) {
        onTabResolved(urlTab as T);
      }
      return;
    }
    // Bare or unknown segment: normalize the URL to the default tab.
    navigate(`${basePath}/${defaultTab}`, { replace: true });
  }, [urlTab, tabs, basePath, defaultTab, activeTab, navigate, onTabResolved]);

  const goToTab = useCallback(
    (tab: T) => {
      navigate(`${basePath}/${tab}`);
    },
    [navigate, basePath],
  );

  return { goToTab };
}

/**
 * Resolves the initial tab from a route param for seeding `useState`, so the
 * first render already matches the URL (no flash of the default tab).
 */
export function readInitialTab<T extends string>(
  urlTab: string | undefined,
  tabs: readonly T[],
  defaultTab: T,
): T {
  return urlTab && (tabs as readonly string[]).includes(urlTab) ? (urlTab as T) : defaultTab;
}
