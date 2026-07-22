const DeptReportsPage = ({ chartData }: any) => {
    const labels = Array.isArray(chartData?.labels) ? chartData.labels : [];
    const dataset = chartData?.datasets?.[0] || {};
    const counts = labels.map((_: string, index: number) => Math.max(0, Number(dataset.data?.[index]) || 0));
    const total = counts.reduce((sum: number, count: number) => sum + count, 0);

    return (
        <div className="space-y-5 animate-fade-in">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        A clear view of counseling requests across your department.
                    </p>
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {total} counseling request{total === 1 ? '' : 's'}
                </p>
            </header>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
                    <h2 className="font-bold text-slate-900 dark:text-white">Status distribution</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Share of requests at each stage.</p>
                </div>

                {total === 0 ? (
                    <p className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                        No counseling requests are available yet.
                    </p>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {labels.map((label: string, index: number) => {
                            const count = counts[index];
                            const percentage = Math.round((count / total) * 100);
                            const color = Array.isArray(dataset.backgroundColor)
                                ? dataset.backgroundColor[index]
                                : dataset.backgroundColor;

                            return (
                                <div key={label} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(10rem,0.8fr)_minmax(16rem,2fr)_5rem] sm:items-center sm:gap-5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color || '#059669' }} />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                                    </div>
                                    <div
                                        role="progressbar"
                                        aria-label={`${label}: ${count} request${count === 1 ? '' : 's'}, ${percentage}%`}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={percentage}
                                        className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                                    >
                                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color || '#059669' }} />
                                    </div>
                                    <div className="flex items-baseline justify-between text-sm sm:justify-end sm:gap-2">
                                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">{count}</span>
                                        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{percentage}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default DeptReportsPage;
