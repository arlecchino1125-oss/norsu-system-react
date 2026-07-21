import { Suspense, lazy } from 'react';
import { ensureBarChartSetup } from '../../../../../lib/chartSetup';

// react-chartjs-2 and chart.js load on demand so they stay out of the main
// bundle (react-doctor prefer-dynamic-import). Registration must finish before
// the first render, hence the Promise.all with ensureBarChartSetup.
const Bar = lazy(async () => {
    const [{ Bar: BarComponent }] = await Promise.all([
        import('react-chartjs-2'),
        ensureBarChartSetup()
    ]);
    return { default: BarComponent };
});

const DeptReportsPage = ({ chartData }: any) => (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm w-full mx-auto card-hover">
            <h3 className="font-bold text-gray-900 mb-6 dark:text-white">Status Distribution</h3>
            <div className="relative h-96 w-full">
                <Suspense fallback={null}>
                    <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                </Suspense>
            </div>
        </div>
    </div>
);

export default DeptReportsPage;
