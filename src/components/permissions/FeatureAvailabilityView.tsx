import {
    Clock3,
    EyeOff,
    Settings2,
    Sparkles
} from 'lucide-react';
import {
    getPermissionNotice,
    PERMISSION_STATUS_LABELS,
    type PermissionStatus,
    type ResolvedPermissionState
} from '../../types/permissions';

type Accent = 'blue' | 'emerald' | 'purple' | 'slate' | 'teal';

const STATUS_META: Record<PermissionStatus, {
    icon: typeof Settings2;
    badgeClassName: string;
    iconClassName: string;
}> = {
    enabled: {
        icon: Sparkles,
        badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        iconClassName: 'bg-emerald-50 text-emerald-600'
    },
    hidden: {
        icon: EyeOff,
        badgeClassName: 'border-slate-200 bg-slate-100 text-slate-600',
        iconClassName: 'bg-slate-100 text-slate-600'
    },
    maintenance: {
        icon: Settings2,
        badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
        iconClassName: 'bg-amber-50 text-amber-600'
    },
    coming_soon: {
        icon: Clock3,
        badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700',
        iconClassName: 'bg-sky-50 text-sky-600'
    }
};

const ACCENT_CLASSNAMES: Record<Accent, string> = {
    blue: 'shadow-blue-200/40',
    emerald: 'shadow-emerald-200/40',
    purple: 'shadow-purple-200/40',
    slate: 'shadow-slate-200/50',
    teal: 'shadow-teal-200/40'
};

type FeatureAvailabilityViewProps = {
    title: string;
    permission: ResolvedPermissionState;
    description?: string;
    accent?: Accent;
    className?: string;
    showStatusBadge?: boolean;
    showNotice?: boolean;
};

export default function FeatureAvailabilityView({
    title,
    permission,
    description,
    accent = 'slate',
    className = '',
    showStatusBadge = true,
    showNotice = true
}: FeatureAvailabilityViewProps) {
    const resolvedStatus = permission.status;
    const statusMeta = STATUS_META[resolvedStatus];
    const StatusIcon = statusMeta.icon;
    const notice = getPermissionNotice(permission, title);

    return (
        <div className={`flex min-h-[420px] items-center justify-center ${className}`.trim()}>
            <div className={`w-full max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-2xl ${ACCENT_CLASSNAMES[accent]}`}>
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${statusMeta.iconClassName}`}>
                    <StatusIcon className="h-8 w-8" />
                </div>
                {showStatusBadge && (
                    <div className={`mx-auto mt-5 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusMeta.badgeClassName}`}>
                        {PERMISSION_STATUS_LABELS[resolvedStatus]}
                    </div>
                )}
                <h1 className="mt-5 text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h1>
                {showNotice && (
                    <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                        {notice}
                    </p>
                )}
                {description && (
                    <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}
