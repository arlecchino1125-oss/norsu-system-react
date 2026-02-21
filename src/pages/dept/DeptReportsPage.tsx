import { Bar } from 'react-chartjs-2';

const DeptReportsPage = ({ chartData }: any) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm w-full mx-auto card-hover">
                <h3 className="font-bold text-gray-900 mb-6 dark:text-white">Status Distribution</h3>
                <div className="relative h-96 w-full">
                    <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                </div>
            </div>
        </div>
    );
};

export default DeptReportsPage;
