import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, X } from 'lucide-react';

interface NotificationItem {
    id?: string | number;
    message?: string;
    action?: string;
    details?: any;
    created_at?: string | null;
    time_label?: string | null;
    sort_at?: string | null;
}

interface NotificationBellProps {
    notifications: NotificationItem[];
    accentColor?: 'blue' | 'purple' | 'emerald';
    expandProfileUpdates?: boolean;
}

const COLOR_MAP = {
    blue: {
        hover: 'hover:text-blue-600',
        badge: 'bg-blue-600',
        header: 'from-blue-600 to-sky-500',
        ring: 'ring-blue-200',
        soft: 'bg-blue-50 text-blue-700 border-blue-100',
    },
    purple: {
        hover: 'hover:text-purple-600',
        badge: 'bg-purple-600',
        header: 'from-purple-600 to-violet-500',
        ring: 'ring-purple-200',
        soft: 'bg-purple-50 text-purple-700 border-purple-100',
    },
    emerald: {
        hover: 'hover:text-emerald-600',
        badge: 'bg-emerald-600',
        header: 'from-emerald-600 to-teal-500',
        ring: 'ring-emerald-200',
        soft: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
};

const PROFILE_UPDATE_ACTIONS = new Set([
    'Student Profile Updated',
    'Student Profile Completed',
    'Student Profile Picture Updated',
]);

const formatTimeAgo = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getNotificationText = (n: NotificationItem): string => {
    if (n.message) return n.message;
    if (n.action) {
        const detailStr = typeof n.details === 'string' ? n.details : '';
        return detailStr ? `${n.action}: ${detailStr}` : n.action;
    }
    return 'New notification';
};

const getNotificationKey = (n: NotificationItem, idx: number) => {
    if (n.id === undefined || n.id === null) return `idx-${idx}`;
    if (typeof n.message === 'string' && n.message) return `message-${n.id}`;
    if (typeof n.action === 'string' && n.action) return `action-${n.id}`;
    return `item-${n.id}`;
};

const isProfileUpdateNotification = (n: NotificationItem) => {
    const rawMessage = String(n.message || '').trim();
    return rawMessage.startsWith('[PROFILE UPDATE]') || PROFILE_UPDATE_ACTIONS.has(String(n.action || ''));
};

const parseProfileUpdateNotification = (n: NotificationItem) => {
    if (!isProfileUpdateNotification(n)) return null;

    const rawText = String(
        (typeof n.message === 'string' && n.message.trim())
            ? n.message
            : (typeof n.details === 'string' && n.details.trim())
                ? n.details
                : ''
    ).trim();

    const cleanedText = rawText.replace(/^\[PROFILE UPDATE\]\s*/i, '').trim();
    if (!cleanedText) return null;

    const match = cleanedText.match(/^(.*?)\s+\(([^)]+)\)\s+modified:\s*(.+)$/i);
    const studentName = match?.[1]?.trim() || '';
    const studentId = match?.[2]?.trim() || '';
    const changedSection = String(match?.[3] || '').replace(/\.\s*$/, '');
    const moreMatch = changedSection.match(/\(\+(\d+)\s+more\)/i);
    const hiddenFieldCount = moreMatch ? Number(moreMatch[1]) : 0;
    const visibleFieldsText = changedSection.replace(/\s*\(\+\d+\s+more\)\s*/i, '').trim();
    const fields = visibleFieldsText
        .split(',')
        .map((field) => field.trim().replace(/\.$/, ''))
        .filter(Boolean)
        .filter((field, index, list) => list.indexOf(field) === index);

    const previewFields = fields.slice(0, 3).join(', ');
    const shownFieldCount = fields.length;
    const totalFieldCount = shownFieldCount + hiddenFieldCount;

    return {
        cleanedText,
        studentName,
        studentId,
        fields,
        hiddenFieldCount,
        previewFields,
        totalFieldCount,
    };
};

const NotificationBell = ({ notifications, accentColor = 'blue', expandProfileUpdates = false }: NotificationBellProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const colors = COLOR_MAP[accentColor];

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    const count = notifications.length;
    const toggleExpandedItem = (key: string) => {
        setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-gray-500 ${colors.hover} hover:shadow-md transition-all relative border border-gray-100`}
            >
                <Bell size={20} />
                {count > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] ${colors.badge} rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold px-1`}>
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    ref={panelRef}
                    className={`absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in-up ring-1 ${colors.ring}`}
                    style={{ maxHeight: '70vh' }}
                >
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${colors.header} px-5 py-3.5 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                            <Bell size={16} className="text-white/80" />
                            <h3 className="text-white font-bold text-sm">Notifications</h3>
                            {count > 0 && (
                                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {count}
                                </span>
                            )}
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Notification list */}
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 52px)' }}>
                        {count === 0 ? (
                            <div className="px-5 py-12 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell size={20} className="text-gray-300" />
                                </div>
                                <p className="text-gray-400 text-sm font-medium">No notifications yet</p>
                                <p className="text-gray-300 text-xs mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((n, idx) => (
                                    (() => {
                                        const itemKey = getNotificationKey(n, idx);
                                        const profileUpdate = expandProfileUpdates ? parseProfileUpdateNotification(n) : null;
                                        const isExpanded = Boolean(expandedItems[itemKey]);

                                        if (profileUpdate) {
                                            return (
                                                <div key={itemKey} className="px-3 py-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpandedItem(itemKey)}
                                                        className="w-full rounded-xl border border-gray-100 px-4 py-3 text-left transition-all hover:border-gray-200 hover:bg-gray-50/70"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`mt-0.5 rounded-full border px-2 py-1 text-[10px] font-black tracking-[0.18em] ${colors.soft}`}>
                                                                PROFILE UPDATE
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-semibold text-gray-900">
                                                                            {profileUpdate.studentName || 'Student profile updated'}
                                                                            {profileUpdate.studentId ? (
                                                                                <span className="ml-1 font-mono text-xs text-gray-400">
                                                                                    ({profileUpdate.studentId})
                                                                                </span>
                                                                            ) : null}
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-gray-500">
                                                                            {profileUpdate.totalFieldCount > 0
                                                                                ? `${profileUpdate.totalFieldCount} field${profileUpdate.totalFieldCount === 1 ? '' : 's'} updated`
                                                                                : 'Profile information updated'}
                                                                        </p>
                                                                        {profileUpdate.previewFields && (
                                                                            <p className="mt-1.5 text-xs text-gray-600">
                                                                                {profileUpdate.previewFields}
                                                                                {profileUpdate.hiddenFieldCount > 0 ? `, +${profileUpdate.hiddenFieldCount} more` : ''}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center gap-2">
                                                                        {(n.time_label || n.created_at) && (
                                                                            <span className="text-[10px] font-medium text-gray-400">
                                                                                {n.time_label || formatTimeAgo(n.created_at)}
                                                                            </span>
                                                                        )}
                                                                        <ChevronDown
                                                                            size={16}
                                                                            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="px-2 pb-1 pt-3">
                                                            {profileUpdate.fields.length > 0 ? (
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {profileUpdate.fields.map((field) => (
                                                                        <div
                                                                            key={`${itemKey}-${field}`}
                                                                            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2"
                                                                        >
                                                                            <span className="text-sm font-medium text-gray-800">{field}</span>
                                                                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${colors.soft}`}>
                                                                                Modified
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs text-gray-600">
                                                                    {profileUpdate.cleanedText}
                                                                </div>
                                                            )}

                                                            {profileUpdate.hiddenFieldCount > 0 && (
                                                                <p className="mt-2 px-1 text-[11px] text-gray-400">
                                                                    +{profileUpdate.hiddenFieldCount} more field{profileUpdate.hiddenFieldCount === 1 ? '' : 's'} were updated but not included in this notification preview.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={itemKey}
                                                className="px-5 py-3.5 hover:bg-gray-50/80 transition-colors cursor-default"
                                            >
                                                <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">
                                                    {getNotificationText(n)}
                                                </p>
                                                {(n.time_label || n.created_at) && (
                                                    <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                                                        {n.time_label || formatTimeAgo(n.created_at)}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
