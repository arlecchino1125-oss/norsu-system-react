import {
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip
} from 'chart.js';

let barChartRegistered = false;

export const ensureBarChartSetup = () => {
    if (!barChartRegistered) {
        ChartJS.register(
            CategoryScale,
            LinearScale,
            BarController,
            BarElement,
            Title,
            Tooltip,
            Legend
        );
        barChartRegistered = true;
    }

    return ChartJS;
};
