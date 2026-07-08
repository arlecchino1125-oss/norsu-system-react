import React from 'react';

type NorsuBrandProps = {
    title: string;
    subtitle?: string;
    accent?: 'blue' | 'emerald' | 'purple' | 'gold';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

const ACCENT_STYLES = {
    blue: { ring: 'ring-2 ring-blue-200/50', title: 'text-white' },
    emerald: { ring: 'ring-2 ring-emerald-200/50', title: 'text-white' },
    purple: { ring: 'ring-2 ring-purple-200/30', title: 'text-white' },
    gold: { ring: 'ring-2 ring-amber-200/50', title: 'text-slate-900' },
} as const;

// NORSU seal size, CARE logo size (notably bigger to "zoom" it)
const SIZE_STYLES = {
    sm: { seal: 'h-12 w-12', care: 'h-14 w-14 -ml-3', title: 'text-sm', subtitle: 'text-[10px]' },
    md: { seal: 'h-14 w-14', care: 'h-16 w-16 -ml-4', title: 'text-[15px]', subtitle: 'text-xs' },
    lg: { seal: 'h-20 w-20', care: 'h-24 w-24 -ml-5', title: 'text-xl', subtitle: 'text-sm' },
} as const;

export default function NorsuBrand({
    title,
    subtitle,
    accent = 'blue',
    size = 'md',
    className = '',
}: NorsuBrandProps) {
    const [showSeal, setShowSeal] = React.useState(true);
    const accentStyles = ACCENT_STYLES[accent];
    const sizeStyles = SIZE_STYLES[size];

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Logo stack — CARE logo rendered bigger and on top */}
            <div className="flex items-center">
                {showSeal && (
                    <img
                        src="/norsu.png"
                        alt="NORSU-G Seal"
                        className={`${sizeStyles.seal} rounded-full object-cover bg-white shadow-md ${accentStyles.ring} relative z-0`}
                        onError={() => setShowSeal(false)}
                    />
                )}
                <img
                    src="/carecenter.png"
                    alt="CARE Center"
                    className={`${sizeStyles.care} rounded-full object-cover bg-white shadow-xl ${accentStyles.ring} relative z-10`}
                />
            </div>

            <div className="min-w-0">
                <h1 className={`font-extrabold tracking-tight leading-tight ${sizeStyles.title} ${accentStyles.title}`}>
                    {title}
                </h1>
                {subtitle && (
                    <p className={`font-medium opacity-60 ${sizeStyles.subtitle} ${accentStyles.title}`}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
