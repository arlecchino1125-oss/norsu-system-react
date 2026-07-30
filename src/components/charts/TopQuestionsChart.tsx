import { useRef, useEffect } from 'react';
import { ensureBarChartSetup } from '../../lib/chartSetup';

// Helper Component for Top Questions Chart
// `stats` is the already-tallied output of buildQuestionStats, so picking a score
// is an array index rather than a scan of every answer row.
const TopQuestionsChart = ({ stats = [], scoreFilter }: any) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        ensureBarChartSetup().then((Chart) => {
            if (cancelled || !canvasRef.current) return;
            if (chartRef.current) chartRef.current.destroy();

            const scoreIndex = parseInt(scoreFilter, 10) - 1;
            const questionCounts = stats.map((stat: any) => ({
                question: stat.question.question_text ?? '',
                count: stat.counts?.[scoreIndex] ?? 0
            }));

            // Sort by count desc and take top 10
            const sorted = questionCounts.sort((a: any, b: any) => b.count - a.count).slice(0, 10);

            chartRef.current = new Chart(canvasRef.current, {
                type: 'bar',
                indexAxis: 'y', // Horizontal bar chart
                data: {
                    labels: sorted.map(i => i.question.length > 40 ? i.question.substring(0, 40) + '...' : i.question),
                    datasets: [{
                        label: `Respondents giving score ${scoreFilter}`,
                        data: sorted.map(i => i.count),
                        backgroundColor: '#8b5cf6', // Violet-500
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: `Top Questions with Score "${scoreFilter}"`, font: { size: 14, weight: 'bold' } }
                    },
                    scales: {
                        x: { beginAtZero: true, ticks: { precision: 0 } },
                        y: { grid: { display: false } }
                    }
                }
            } as any);
        });

        return () => {
            cancelled = true;
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [stats, scoreFilter]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-80 shadow-sm mb-6">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

export default TopQuestionsChart;
