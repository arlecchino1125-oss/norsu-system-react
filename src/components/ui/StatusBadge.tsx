import React from 'react';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    status: string;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
    ({ status, className = '', ...props }, ref) => {
        const colors: Record<string, string> = {
            'Pending': 'bg-yellow-100 text-yellow-700',
            'Approved': 'bg-green-100 text-green-700',
            'Rejected': 'bg-red-100 text-red-700',
            'Referred': 'bg-purple-100 text-purple-700',
            'Scheduled': 'bg-blue-100 text-blue-700',
            'Forwarded to Dept': 'bg-orange-100 text-orange-700',
            'Passed': 'bg-green-100 text-green-700',
            'Failed': 'bg-red-100 text-red-700',
            'Completed': 'bg-green-100 text-green-700',
            'Submitted': 'bg-blue-100 text-blue-700',
            'Open': 'bg-green-100 text-green-700',
            'Closed': 'bg-red-100 text-red-700',
            'Qualified for Interview (1st Choice)': 'bg-green-100 text-green-700',
            'Application Unsuccessful': 'bg-gray-100 text-gray-700',
            'Approved for Enrollment': 'bg-green-100 text-green-700',
            'Ongoing': 'bg-green-100 text-green-700 animate-pulse',
            'Active': 'bg-green-100 text-green-700',
            'Inactive': 'bg-gray-100 text-gray-500',
        };

        const badgeColor = colors[status] || 'bg-gray-100 text-gray-600';

        return (
            <span
                ref={ref}
                className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center justify-center ${badgeColor} ${className}`}
                {...props}
            >
                {status}
            </span>
        );
    }
);

StatusBadge.displayName = 'StatusBadge';
