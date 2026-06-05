import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
    page: number;
    pageSize: number;
    total: number;
    isLoading?: boolean;
    onPageChange: (page: number) => void;
}

const PaginationControls = ({
    page,
    pageSize,
    total,
    isLoading = false,
    onPageChange
}: PaginationControlsProps) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const end = Math.min(total, safePage * pageSize);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
            <span>
                Showing <strong className="text-gray-900">{start}</strong>-<strong className="text-gray-900">{end}</strong> of <strong className="text-gray-900">{total}</strong>
            </span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(safePage - 1)}
                    disabled={isLoading || safePage <= 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="min-w-20 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                    {safePage} / {totalPages}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange(safePage + 1)}
                    disabled={isLoading || safePage >= totalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Next page"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default PaginationControls;
