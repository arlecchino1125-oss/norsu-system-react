import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { NAT_PAGE_SIZE } from '../constants';
import { buildPaginationItems, getTotalPages } from '../utils';

// TODO(dedupe): near-duplicate of src/components/PaginationControls.tsx and the population page pagination —
// consolidate behind the shared component once behavior parity is verified.
const NatPaginationControls = ({
    page,
    totalItems,
    currentRowsCount,
    onPageChange,
    itemLabel
}: any) => {
    const totalPages = getTotalPages(totalItems);
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startItem = totalItems === 0 ? 0 : ((safePage - 1) * NAT_PAGE_SIZE) + 1;
    const visibleCount = totalItems === 0
        ? 0
        : currentRowsCount > 0
            ? currentRowsCount
            : Math.min(NAT_PAGE_SIZE, Math.max(totalItems - startItem + 1, 0));
    const endItem = totalItems === 0 ? 0 : Math.min(totalItems, startItem + visibleCount - 1);
    const paginationItems = buildPaginationItems(safePage, totalPages);
    const navButtonClass = 'inline-flex h-8 min-w-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 transition hover:border-purple-300 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm';

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-6 py-4 text-xs md:flex-row md:items-center md:justify-between rounded-b-[2.5rem]">
            <span className="font-semibold text-slate-500">
                {totalItems === 0
                    ? `No ${itemLabel} found.`
                    : `Showing ${startItem}-${endItem} of ${totalItems} ${itemLabel}`}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    disabled={safePage === 1}
                    className={navButtonClass}
                    aria-label="First page"
                >
                    <ChevronsLeft size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => onPageChange(safePage - 1)}
                    disabled={safePage === 1}
                    className={navButtonClass}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={14} />
                </button>
                {paginationItems.map((item, index) => (
                    typeof item === 'number' ? (
                        <button
                            key={`page-${item}`}
                            type="button"
                            onClick={() => onPageChange(item)}
                            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-xl border px-2.5 text-xs font-bold transition ${item === safePage
                                ? 'border-purple-650 bg-gradient-to-r from-purple-600 to-indigo-650 text-white shadow-md shadow-purple-500/20'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-purple-305 hover:text-purple-700'
                                }`}
                            aria-current={item === safePage ? 'page' : undefined}
                        >
                            {item}
                        </button>
                    ) : (
                        <span key={`ellipsis-${index}`} className="inline-flex h-8 min-w-8 items-center justify-center text-slate-400">
                            ...
                        </span>
                    )
                ))}
                <button
                    type="button"
                    onClick={() => onPageChange(safePage + 1)}
                    disabled={safePage === totalPages}
                    className={navButtonClass}
                    aria-label="Next page"
                >
                    <ChevronRight size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => onPageChange(totalPages)}
                    disabled={safePage === totalPages}
                    className={navButtonClass}
                    aria-label="Last page"
                >
                    <ChevronsRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default NatPaginationControls;
