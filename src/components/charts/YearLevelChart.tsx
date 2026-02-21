import { useRef, useEffect } from 'react';
import { Chart } from 'chart.js/auto';

// Helper Component for Year Level Chart
const YearLevelChart = ({ submissions }: any) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const counts = {};
        submissions.forEach(s => {
            const year = s.students?.year_level || 'Unknown';
            counts[year] = (counts[year] || 0) + 1;
        });

        const labels = Object.keys(counts).sort();
        const data = labels.map(l => counts[l]);

        chartRef.current = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Respondents',
                    data: data,
                    backgroundColor: '#6366f1',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Respondents by Year Level', font: { size: 14, weight: 'bold' } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                }
            }
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [submissions]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-80 shadow-sm mb-6">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

export default YearLevelChart;
