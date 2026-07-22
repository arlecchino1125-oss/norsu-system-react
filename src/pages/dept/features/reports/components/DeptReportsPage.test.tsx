import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DeptReportsPage from './DeptReportsPage';

describe('DeptReportsPage', () => {
    it('shows a compact counseling status breakdown', () => {
        render(
            <DeptReportsPage
                chartData={{
                    labels: ['Awaiting Review', 'Dept Scheduled', 'With CARE Staff', 'Completed', 'Rejected'],
                    datasets: [{
                        data: [1, 2, 3, 4, 0],
                        backgroundColor: ['#ca8a04', '#2563eb', '#7c3aed', '#059669', '#e11d48']
                    }]
                }}
            />
        );

        expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument();
        expect(screen.getByText('10 counseling requests')).toBeInTheDocument();
        expect(screen.getAllByRole('progressbar')).toHaveLength(5);
        expect(screen.getByRole('progressbar', { name: 'Completed: 4 requests, 40%' })).toHaveAttribute('aria-valuenow', '40');
    });
});
