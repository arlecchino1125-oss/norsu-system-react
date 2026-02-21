// Shared Render Helper (module-scoped so all page components can use it)
const StatusBadge = ({ status }: any) => {
    const colors = {
        'Pending': 'bg-yellow-100 text-yellow-700',
        'Approved': 'bg-green-100 text-green-700',
        'Rejected': 'bg-red-100 text-red-700',
        'Referred': 'bg-purple-100 text-purple-700',
        'Scheduled': 'bg-blue-100 text-blue-700',
        'Forwarded to Dept': 'bg-orange-100 text-orange-700',
        'Passed': 'bg-green-100 text-green-700',
        'Failed': 'bg-red-100 text-red-700',
        'Completed': 'bg-green-100 text-green-700',
        'Submitted': 'bg-blue-100 text-blue-700'
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
};

export default StatusBadge;
