import { useRef, useEffect } from 'react';
import { Chart } from 'chart.js/auto';

// Helper Component for Top Questions Chart
const TopQuestionsChart = ({ questions, answers, scoreFilter }: any) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        // Count occurrences of the selected score for each question
        const questionCounts = questions.map(q => {
            const count = answers.filter(a => a.question_id === q.id && parseInt(a.answer_value) === parseInt(scoreFilter)).length;
            return { question: q.question_text, count };
        });

        // Sort by count desc and take top 10
        const sorted = questionCounts.sort((a, b) => b.count - a.count).slice(0, 10);

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

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [questions, answers, scoreFilter]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-80 shadow-sm mb-6">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

export default TopQuestionsChart;
