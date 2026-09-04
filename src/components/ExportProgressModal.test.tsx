import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    ExportProgressModal,
    INITIAL_EXPORT_PROGRESS_STATE
} from './ExportProgressModal';

describe('ExportProgressModal', () => {
    it('does not render when isOpen is false', () => {
        const { container } = render(
            <ExportProgressModal
                isOpen={false}
                format="excel"
                exportProgress={INITIAL_EXPORT_PROGRESS_STATE}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders progress bar, percentage, and status text during active export', () => {
        render(
            <ExportProgressModal
                isOpen={true}
                format="excel"
                exportProgress={{
                    isExporting: true,
                    stage: 'fetching',
                    progressPct: 45,
                    loadedCount: 450,
                    totalCount: 1000,
                    unitLabel: 'students processed',
                    statusText: 'Retrieving cohort records...'
                }}
            />
        );

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('45%')).toBeInTheDocument();
        expect(screen.getByText('450 of 1,000 students processed')).toBeInTheDocument();
        expect(screen.getByText('Retrieving cohort records...')).toBeInTheDocument();
    });

    it('renders completion state with checkmark and done stage message', () => {
        render(
            <ExportProgressModal
                isOpen={true}
                format="zip"
                exportProgress={{
                    isExporting: true,
                    stage: 'done',
                    progressPct: 100,
                    loadedCount: 50,
                    totalCount: 50,
                    unitLabel: 'documents bundled',
                    statusText: 'ZIP download ready!'
                }}
            />
        );

        expect(screen.getByText('ZIP Download Ready!')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('renders custom badge details when provided', () => {
        render(
            <ExportProgressModal
                isOpen={true}
                format="excel"
                badgeDetails={[
                    { label: '1,701 Students', tone: 'purple' },
                    { label: 'All Programs', tone: 'emerald' }
                ]}
                exportProgress={{
                    isExporting: true,
                    stage: 'building',
                    progressPct: 85,
                    statusText: 'Writing workbook...'
                }}
            />
        );

        expect(screen.getByText('1,701 Students')).toBeInTheDocument();
        expect(screen.getByText('All Programs')).toBeInTheDocument();
    });
});
