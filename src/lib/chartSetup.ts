// chart.js is loaded on demand so it stays out of the main bundle
// (react-doctor prefer-dynamic-import). Registration runs once per app load.
type BarChart = typeof import('chart.js')['Chart'];

let chartLoadPromise: Promise<BarChart> | null = null;

export const ensureBarChartSetup = (): Promise<BarChart> => {
    chartLoadPromise ??= import('chart.js').then(
        ({ Chart, CategoryScale, LinearScale, BarController, BarElement, Title, Tooltip, Legend }) => {
            Chart.register(
                CategoryScale,
                LinearScale,
                BarController,
                BarElement,
                Title,
                Tooltip,
                Legend
            );
            return Chart;
        }
    );
    return chartLoadPromise;
};
