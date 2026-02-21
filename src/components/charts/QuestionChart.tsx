import { useRef, useEffect } from 'react';
import { Chart } from 'chart.js/auto';

// Helper Component for Individual Question Charts
const QuestionChart = ({ question, answers }: any) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        if (chartRef.current) chartRef.current.destroy();

        // Filter answers for this specific question
        const relevantAnswers = answers.filter(a => a.question_id === question.id);

        // Count responses 1-5
        const counts = [0, 0, 0, 0, 0];
        let total = 0;
        relevantAnswers.forEach(a => {
            const val = parseInt(a.answer_value);
            if (val >= 1 && val <= 5) {
                counts[val - 1]++;
                total++;
            }
        });

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

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [question, answers]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-64 shadow-sm">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

export default QuestionChart;
