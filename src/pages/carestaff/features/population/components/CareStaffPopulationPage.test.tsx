import { render, screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CareStaffPopulationPage from './CareStaffPopulationPage';

const { mockUseCareStaffPopulation } = vi.hoisted(() => ({
    mockUseCareStaffPopulation: vi.fn()
}));

vi.mock('../hooks/useCareStaffPopulation', () => ({
    useCareStaffPopulation: mockUseCareStaffPopulation
}));

describe('CareStaffPopulationPage', () => {
    const openProfileModal = vi.fn();
    const openEditModal = vi.fn();
    const setStudentToDelete = vi.fn();
    const setShowDeleteModal = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        mockUseCareStaffPopulation.mockReturnValue({
            showToast: vi.fn(),
            canArchiveRecords: true,
            canRestoreRecords: true,
            populationOverview: {
                totalPopulation: 3357,
                activeStudents: 3357,
                archivedStudents: 61,
                schoolYears: []
            },
            overviewLoading: false,
            allCourses: [],
            allDepartments: [],
            archivedStudentsList: [],
            archivedStudentsLoading: false,
            availableSections: [],
            courseYearCountsLoading: false,
            courseApplicantCounts: {},
            courseApplicantCountsLoading: false,
            showEnrollmentModal: false,
            setShowEnrollmentModal: vi.fn(),
            showArchivedStudentsModal: false,
            setShowArchivedStudentsModal: vi.fn(),
            showEditModal: false,
            setShowEditModal: vi.fn(),
            editForm: {},
            setEditForm: vi.fn(),
            showDeleteModal: false,
            setShowDeleteModal,
            studentToDelete: null,
            setStudentToDelete,
            archivedSearchTerm: '',
            setArchivedSearchTerm: vi.fn(),
            restoringStudentId: null,
            openEditModal,
            handleUpdateStudent: vi.fn(),
            confirmDeleteStudent: vi.fn(),
            handleRestoreStudent: vi.fn(),
            searchTerm: '',
            setSearchTerm: vi.fn(),
            currentPage: 1,
            setCurrentPage: vi.fn(),
            enrollmentStatusFilter: 'All',
            setEnrollmentStatusFilter: vi.fn(),
            enrollmentSearchQuery: '',
            setEnrollmentSearchQuery: vi.fn(),
            totalEnrollmentKeysCount: 0,
            courseFilter: 'All',
            setCourseFilter: vi.fn(),
            departmentFilter: 'All',
            setDepartmentFilter: vi.fn(),
            courseDeptFilter: 'All',
            setCourseDeptFilter: vi.fn(),
            yearFilter: 'All',
            setYearFilter: vi.fn(),
            statusFilter: 'All',
            setStatusFilter: vi.fn(),
            schoolYearFilter: 'All',
            setSchoolYearFilter: vi.fn(),
            sectionFilter: 'All',
            setSectionFilter: vi.fn(),
            hasNoteFilter: false,
            setHasNoteFilter: vi.fn(),
            atRiskFilter: false,
            setAtRiskFilter: vi.fn(),
            backgroundFilter: [],
            setBackgroundFilter: vi.fn(),
            activeFilterCount: 0,
            viewMode: 'list',
            setViewMode: vi.fn(),
            itemsPerPage: 10,
            isRefreshingData: false,
            sortConfig: { key: 'created_at', direction: 'desc' },
            enrollmentKeys: [],
            courseForm: { name: '', capacity: 500, application_limit: 200, department_id: '' },
            setCourseForm: vi.fn(),
            bulkWindowForm: { start: '', end: '' },
            setBulkWindowForm: vi.fn(),
            isApplyingBulkWindow: false,
            isSyncingBulkKeys: false,
            settingsTab: 'keys',
            setSettingsTab: vi.fn(),
            showIdSwapModal: false,
            setShowIdSwapModal: vi.fn(),
            sourceId: '',
            setSourceId: vi.fn(),
            targetId: '',
            setTargetId: vi.fn(),
            isSwappingIds: false,
            sourceStudent: null,
            setSourceStudent: vi.fn(),
            targetStudent: null,
            setTargetStudent: vi.fn(),
            sourceLoading: false,
            targetLoading: false,
            profileViewStudent: null,
            setProfileViewStudent: vi.fn(),
            profileCategoryIndex: 0,
            setProfileCategoryIndex: vi.fn(),
            profileLoading: false,
            showPhotoModal: false,
            setShowPhotoModal: vi.fn(),
            openProfileModal,
            fetchEnrollmentKeys: vi.fn(),
            handleRefreshData: vi.fn(),
            applyBulkCourseYearWindow: vi.fn(),
            clearBulkCourseYearWindow: vi.fn(),
            syncEnrollmentKeysFromStudents: vi.fn(),
            handleAddCourse: vi.fn(),
            handleUpdateCourseLimit: vi.fn(),
            handleBulkUpload: vi.fn(),
            handleDownloadTemplate: vi.fn(),
            departmentNames: [],
            filteredCourseOptions: [],
            schoolYearOptions: [],
            courseRowsForManagement: [],
            bulkTargetCount: 0,
            filteredArchivedStudents: [],
            handleExportExcel: vi.fn(),
            handleExportZip: vi.fn(),
            exportStatus: null,
            exportProgress: { isExporting: false, current: 0, total: 0, percentage: 0, statusText: '' },
            exportFormat: 'excel',
            canExportStudents: true,
            handleSwapIds: vi.fn(),
            handleSort: vi.fn(),
            effectiveTotal: 3357,
            isStudentTableLoading: false,
            totalPages: 336,
            startIndex: 0,
            endIndex: 4,
            paginatedStudents: [
                {
                    id: 1,
                    student_id: '420127001',
                    first_name: 'Diana',
                    last_name: 'Reyes',
                    course: 'Bachelor of Science in Agribusiness',
                    year_level: '1st Year',
                    status: 'Active',
                    profile_completed: true
                },
                {
                    id: 2,
                    student_id: '420134648',
                    first_name: 'Maria',
                    last_name: 'Santos',
                    course: 'Bachelor of Science in Computer Science (BSCS)',
                    year_level: '1st Year',
                    status: 'Active',
                    profile_completed: true
                },
                {
                    id: 3,
                    student_id: '420133913',
                    first_name: 'Earl Lawrence',
                    last_name: 'Cruz',
                    course: 'Bachelor of Science in Hospitality Management (BSHM)',
                    year_level: '2nd Year',
                    status: 'Active',
                    profile_completed: true
                },
                {
                    id: 4,
                    student_id: '420135002',
                    first_name: 'Christina',
                    last_name: 'Lim',
                    course: 'Bachelor of Science in Office Administration (BSOA)',
                    year_level: '3rd Year',
                    status: 'Active',
                    profile_completed: true
                }
            ],
            studentAnnotationsById: {},
            paginationItems: [1, 2, 3, 'right-ellipsis', 336],
            courseYearCountMap: {},
            openArchivedStudentsModal: vi.fn(),
            handleDeleteKey: vi.fn(),
            handleGenerateKey: vi.fn()
        });
    });

    it('renders mobile student cards with abbreviated courses, pagination, a default-minimized hero, and a 3-dot action menu without Delete', () => {
        render(<CareStaffPopulationPage functions={{ showToast: vi.fn() }} />);

        // Mobile hero is minimized by default with a button showing what is inside
        const showHeroActionsBtn = screen.getByRole('button', {
            name: /Show hero actions: Refresh, Export, Archive, Swap IDs, Settings, Stats/i
        });
        expect(showHeroActionsBtn).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();

        // Expanding mobile hero shows the 3x2 action buttons and a Hide button
        fireEvent.click(showHeroActionsBtn);
        expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Stats' })).toBeInTheDocument();

        const hideHeroActionsBtn = screen.getByRole('button', { name: /Hide hero actions/i });
        expect(hideHeroActionsBtn).toBeInTheDocument();
        fireEvent.click(hideHeroActionsBtn);
        expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();

        // Desktop header labels preserved
        expect(screen.getByRole('button', { name: 'System Settings' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View Stats' })).toBeInTheDocument();

        // Active and Archived counters retained; redundant Total counters removed
        expect(screen.queryByText('TOTAL')).not.toBeInTheDocument();
        expect(screen.queryByText('TOTAL POPULATION')).not.toBeInTheDocument();
        expect(screen.queryByText('3,357 total')).not.toBeInTheDocument();
        expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
        expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
        expect(screen.getByText('ACTIVE STUDENTS')).toBeInTheDocument();
        expect(screen.getByText('ARCHIVED STUDENTS')).toBeInTheDocument();

        // Abbreviated courses on mobile cards
        expect(screen.getByText('BS Agribusiness')).toBeInTheDocument();
        expect(screen.getByText('BSCS')).toBeInTheDocument();
        expect(screen.getByText('BSHM')).toBeInTheDocument();
        expect(screen.getByText('BSOA')).toBeInTheDocument();

        // Mobile pagination center indicator
        expect(screen.getByText('Page 1 of 336')).toBeInTheDocument();

        // Three-dot action menu on card opens View, Edit, Archive (no Delete)
        const actionBtn = screen.getByRole('button', { name: 'Actions for Diana Reyes' });
        fireEvent.click(actionBtn);

        const menu = screen.getByRole('menu', { name: 'Actions for Diana Reyes' });
        expect(within(menu).getByRole('menuitem', { name: 'View' })).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: 'Archive' })).toBeInTheDocument();
        expect(within(menu).queryByRole('menuitem', { name: /delete/i })).not.toBeInTheDocument();

        fireEvent.click(within(menu).getByRole('menuitem', { name: 'View' }));
        expect(openProfileModal).toHaveBeenCalledTimes(1);
    });

    it('renders a mobile Back button inside the Filter drawer header that closes the drawer', () => {
        render(<CareStaffPopulationPage functions={{ showToast: vi.fn() }} />);

        const filterButtons = screen.getAllByRole('button', { name: /Filters/i });
        expect(filterButtons).toHaveLength(2);
        fireEvent.click(filterButtons[0]);

        expect(screen.getByText('Filter Students')).toBeInTheDocument();
        const backBtn = screen.getByRole('button', { name: /Back/i });
        expect(backBtn).toBeInTheDocument();

        fireEvent.click(backBtn);
        expect(screen.queryByText('Filter Students')).not.toBeInTheDocument();
    });

    it('renders the reconstructed mobile StudentProfileModal with compact categories, short labels, and 2-column grid alongside the desktop view', () => {
        const currentReturn = mockUseCareStaffPopulation();
        mockUseCareStaffPopulation.mockReturnValue({
            ...currentReturn,
            profileViewStudent: {
                id: 1,
                student_id: '420135828',
                first_name: 'Don Deneeb',
                middle_name: 'Isaran',
                last_name: 'Cañete',
                course: 'Bachelor of Science in Agribusiness',
                year_level: '1st Year',
                city: 'Guihulngan City',
                sex: 'Male'
            },
            profileCategoryIndex: 0
        });

        render(<CareStaffPopulationPage functions={{ showToast: vi.fn() }} />);

        // Mobile compact category tabs & footer indicator
        expect(screen.getByText('1 / 8 · Personal')).toBeInTheDocument();
        expect(screen.getByText('Section 1 of 8')).toBeInTheDocument();

        // Mobile shortened field labels
        expect(screen.getByText('Town / City')).toBeInTheDocument();
        expect(screen.getByText('Sex at Birth')).toBeInTheDocument();

        // Desktop field labels still preserved
        expect(screen.getByText('Permanent Address - Town/City Municipality')).toBeInTheDocument();
        expect(screen.getByText('Sex Assigned at Birth')).toBeInTheDocument();
    });
});

