import { useEffect, useState } from 'react';

type PublicTheme = 'light' | 'dark';

const PUBLIC_THEME_STORAGE_KEY = 'norsu-public-theme';

const getStoredTheme = (): PublicTheme => {
    if (typeof window === 'undefined') {
        return 'light';
    }

    try {
        return window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
};

export default function usePublicTheme() {
    const [theme, setTheme] = useState<PublicTheme>(() => getStoredTheme());

    useEffect(() => {
        try {
            window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, theme);
        } catch {
            // Ignore storage failures so the public pages still render normally.
        }
    }, [theme]);

    return {
        theme,
        isDark: theme === 'dark',
        setTheme,
        toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark')
    };
}
