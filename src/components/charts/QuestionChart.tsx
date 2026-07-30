import { useRef, useEffect } from 'react';
import { ensureBarChartSetup } from '../../lib/chartSetup';

// Helper Component for Individual Question Charts
// Counts arrive already tallied (by the stats RPC) instead of this component
// re-scanning the full answer set for every question on screen.
const QuestionChart = ({ question, counts = [0, 0, 0, 0, 0] }: any) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        ensureBarChartSetup().then((Chart) => {
            if (cancelled || !canvasRef.current) return;

            if (chartRef.current) chartRef.current.destroy();

            const total = counts.reduce((sum: number, n: number) => sum + n, 0);

            chartRef.current = new Chart(canvasRef.current, {
                type: 'bar',
                data: {
                    labels: ['1', '2', '3', '4', '5'],
                    datasets: [{
                        label: 'Count',
                        data: counts,
                        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'],
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: `${question.question_text} (n=${total})`,
                            font: { size: 11, weight: 'bold' },
                            padding: { bottom: 10 }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        });

        return () => {
            cancelled = true;
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [question, counts]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-64 shadow-sm">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

export default QuestionChart;
