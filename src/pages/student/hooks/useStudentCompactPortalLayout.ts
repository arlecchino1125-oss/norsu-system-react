import { useEffect, useState } from 'react';

export function useStudentCompactPortalLayout() {
    const [isCompactPortalLayout, setIsCompactPortalLayout] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth < 640 : false
    ));

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncCompactLayout = () => {
            setIsCompactPortalLayout(window.innerWidth < 640);
        };

        syncCompactLayout();
        window.addEventListener('resize', syncCompactLayout);

        return () => {
            window.removeEventListener('resize', syncCompactLayout);
        };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        document.body.classList.toggle('student-portal-compact-mobile', isCompactPortalLayout);

        return () => {
            document.body.classList.remove('student-portal-compact-mobile');
        };
    }, [isCompactPortalLayout]);

    return isCompactPortalLayout;
}
