import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Keeps a portal's active tab in the URL so Back/Forward, refreshes, and deep
 * links all use the same source of truth.
 */
export function usePortalTabRoute<T extends string>(opts: {
  /** Route prefix that precedes the `:tab` segment, e.g. '/care-staff/dashboard'. */
  basePath: string;
  /** All valid tab ids (typically the portal's ACTIVE_TABS array). */
  tabs: readonly T[];
  /** Tab used when the URL has no/invalid segment. */
  defaultTab: T;
}) {
  const { basePath, tabs, defaultTab } = opts;
  const navigate = useNavigate();
  const { tab: urlTab } = useParams<{ tab?: string }>();
  const activeTab = readInitialTab(urlTab, tabs, defaultTab);

  useEffect(() => {
    if (urlTab && (tabs as readonly string[]).includes(urlTab)) return;
    // Bare or unknown segment: normalize the URL to the default tab.
    navigate(`${basePath}/${defaultTab}`, { replace: true });
  }, [urlTab, tabs, basePath, defaultTab, navigate]);

  const goToTab = useCallback(
    (tab: T) => {
      navigate(`${basePath}/${tab}`);
    },
    [navigate, basePath],
  );

  return { activeTab, goToTab };
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
