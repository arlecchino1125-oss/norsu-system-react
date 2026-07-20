import { useCallback, useEffect, useMemo } from 'react';
import type { NavSection as LayoutNavSection } from '../../../components/layout/Sidebar';
import type { ActiveTab } from '../types';
import { CARE_STAFF_TAB_FEATURES, NAV_SECTIONS } from '../utils';

export function useCareStaffNavigation({
    setActiveTab,
    isFeatureVisible,
    setShowCommandHub
}: {
    setActiveTab: (tab: ActiveTab) => void;
    isFeatureVisible: (featureKey: string) => boolean;
    setShowCommandHub: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const isCareStaffTabVisible = useCallback((tab: ActiveTab) => {
        const featureKey = CARE_STAFF_TAB_FEATURES[tab];
        return featureKey ? isFeatureVisible(featureKey) : true;
    }, [isFeatureVisible]);

    const visibleNavSections = useMemo(
        () => NAV_SECTIONS.flatMap((section) => {
            const items = section.items.filter((item) => isCareStaffTabVisible(item.tab));
            return items.length > 0 ? [{ ...section, items }] : [];
        }),
        [isCareStaffTabVisible]
    );

    const layoutNavSections: LayoutNavSection[] = useMemo(
        () => visibleNavSections.map((section) => ({
            title: section.title,
            withDivider: section.withDivider,
            items: section.items.map((item) => ({
                id: item.tab,
                label: item.label,
                icon: item.icon,
            })),
        })),
        [visibleNavSections]
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowCommandHub((prev: boolean) => !prev);
                return;
            }

            if (e.key === 'Escape') {
                setShowCommandHub(false);
                return;
            }

            if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
                e.preventDefault();
                const flatItems = layoutNavSections.flatMap(s => s.items);
                const index = parseInt(e.key) - 1;
                if (flatItems[index]) {
                    setActiveTab(flatItems[index].id as ActiveTab);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [layoutNavSections, setShowCommandHub, setActiveTab]);

    return {
        isCareStaffTabVisible,
        layoutNavSections
    };
}
