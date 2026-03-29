import React from 'react';

type NorsuBrandProps = {
    title: string;
    subtitle: string;
    accent?: 'blue' | 'emerald' | 'purple' | 'gold';
    size?: 'sm' | 'md' | 'lg';
    showCareLabel?: boolean;
    className?: string;
};

const ACCENT_STYLES = {
    blue: {
        ring: 'ring-blue-100',
        title: 'text-white',
        subtitle: 'text-sky-200/75',
        badge: 'bg-blue-50 text-blue-700 border-blue-100'
    },
    emerald: {
        ring: 'ring-emerald-100',
        title: 'text-white',
        subtitle: 'text-emerald-200/75',
        badge: 'bg-emerald-500/10 text-emerald-100 border-emerald-300/20'
    },
    purple: {
        ring: 'ring-purple-100',
        title: 'text-white',
        subtitle: 'text-purple-200/75',
        badge: 'bg-purple-500/10 text-purple-100 border-purple-300/20'
    },
    gold: {
        ring: 'ring-amber-100',
        title: 'text-slate-900',
        subtitle: 'text-slate-500',
        badge: 'bg-amber-50 text-amber-700 border-amber-100'
    }
} as const;

const SIZE_STYLES = {
    sm: {
        seal: 'h-11 w-11',
        care: 'h-10 w-10 -ml-2',
        title: 'text-sm',
        subtitle: 'text-[11px]',
        badge: 'px-2 py-1 text-[10px]'
    },
    md: {
        seal: 'h-14 w-14',
        care: 'h-12 w-12 -ml-3',
        title: 'text-base',
        subtitle: 'text-xs',
        badge: 'px-2.5 py-1 text-[10px]'
    },
    lg: {
        seal: 'h-20 w-20',
        care: 'h-16 w-16 -ml-4',
        title: 'text-xl',
        subtitle: 'text-sm',
        badge: 'px-3 py-1.5 text-xs'
    }
} as const;

export default function NorsuBrand({
    title,
    subtitle,
    accent = 'blue',
    size = 'md',
    showCareLabel = true,
    className = ''
}: NorsuBrandProps) {
    const [showSeal, setShowSeal] = React.useState(true);
    const accentStyles = ACCENT_STYLES[accent];
    const sizeStyles = SIZE_STYLES[size];

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="flex items-center">
                {showSeal && (
                    <img
                        src="/norsu.png"
                        alt="NORSU-G Seal"
                        className={`${sizeStyles.seal} rounded-full object-cover bg-white p-0.5 shadow-lg ring-4 ${accentStyles.ring}`}
                        onError={() => setShowSeal(false)}
                    />
                )}
                <img
                    src="/carecenter.png"
                    alt="NORSU-G CARE Center"
                    className={`${sizeStyles.care} rounded-full object-cover bg-white shadow-lg ring-4 ${accentStyles.ring}`}
                />
            </div>

            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <h1 className={`font-bold tracking-tight ${sizeStyles.title} ${accentStyles.title}`}>
                        {title}
                    </h1>
                    {showCareLabel && (
                        <span className={`hidden rounded-full border font-semibold uppercase tracking-[0.18em] md:inline-flex ${sizeStyles.badge} ${accentStyles.badge}`}>
                            Care
                        </span>
                    )}
                </div>
                <p className={`font-medium ${sizeStyles.subtitle} ${accentStyles.subtitle}`}>
                    {subtitle}
                </p>
            </div>
        </div>
    );
}
