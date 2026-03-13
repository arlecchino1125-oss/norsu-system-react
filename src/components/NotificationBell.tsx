import { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

interface NotificationItem {
    id?: string | number;
    message?: string;
    action?: string;
    details?: any;
    created_at?: string | null;
}

interface NotificationBellProps {
    notifications: NotificationItem[];
    accentColor?: 'blue' | 'purple' | 'emerald';
}

const COLOR_MAP = {
    blue: {
        hover: 'hover:text-blue-600',
        badge: 'bg-blue-600',
        header: 'from-blue-600 to-sky-500',
        ring: 'ring-blue-200',
    },
    purple: {
        hover: 'hover:text-purple-600',
        badge: 'bg-purple-600',
        header: 'from-purple-600 to-violet-500',
        ring: 'ring-purple-200',
    },
    emerald: {
        hover: 'hover:text-emerald-600',
        badge: 'bg-emerald-600',
        header: 'from-emerald-600 to-teal-500',
        ring: 'ring-emerald-200',
    },
};

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

const NotificationBell = ({ notifications, accentColor = 'blue' }: NotificationBellProps) => {
    const [isOpen, setIsOpen] = useState(false);
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
                                    <div
                                        key={n.id ?? idx}
                                        className="px-5 py-3.5 hover:bg-gray-50/80 transition-colors cursor-default"
                                    >
                                        <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">
                                            {getNotificationText(n)}
                                        </p>
                                        {n.created_at && (
                                            <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                                                {formatTimeAgo(n.created_at)}
                                            </p>
                                        )}
                                    </div>
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
