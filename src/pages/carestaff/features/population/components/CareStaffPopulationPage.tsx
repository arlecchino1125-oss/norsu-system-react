import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Edit, Trash2, Archive,
    PieChart, List, ArrowUpDown, TrendingUp, CheckCircle2,
    Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    FileSpreadsheet, RefreshCw, Settings, Flag, MessageSquareMore,
    Users2, X, Check, Filter, XCircle, FileArchive, Loader2
} from 'lucide-react';
import { AsyncButton } from '../../../../../components/ui/Button';
import type { CareStaffDashboardFunctions } from '../../../types';
import { useCareStaffPopulation } from '../hooks/useCareStaffPopulation';
import StudentEditModal from './StudentEditModal';
import ArchivedStudentsModal from './ArchivedStudentsModal';
import EnrollmentKeysModal from './EnrollmentKeysModal';
import StudentProfileModal from './StudentProfileModal';
import IdSwapModal from './IdSwapModal';
import { STUDENT_BACKGROUND_FILTERS } from '../constants';
import { renderCareStudentPaddingRows, getArchivedSnapshotForSchoolYear } from '../utils';
import { toTitleCase } from '../../../../../utils/formatters';

interface CareStaffPopulationPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
    pendingProfileId?: string | null;
    onProfileOpened?: () => void;
    refreshSignal?: number;
}

const PopulationHeader = ({
    isRefreshingData, handleRefreshData, canArchiveRecords, canRestoreRecords,
    overviewLoading, populationOverview, openArchivedStudentsModal, setShowIdSwapModal,
    setShowEnrollmentModal, viewMode, setViewMode
}: any) => (
    <m.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-gradient-to-r from-[#170529] via-[#2a0b4d] to-[#170529] rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-md border border-purple-900/40 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shrink-0"
    >
        <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Student Population</h1>
            <p className="text-purple-200/80 text-xs md:text-sm mt-1 font-medium">Comprehensive management and analytics for the student body.</p>
        </div>

        {/* Consolidated Single-Row Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={handleRefreshData}
                disabled={isRefreshingData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 disabled:opacity-50 hover:shadow-sm"
            >
                <RefreshCw size={14} className={isRefreshingData ? 'animate-spin' : ''} />
                <span>Refresh</span>
            </button>

            {(canArchiveRecords || canRestoreRecords) && (
                <button
                    type="button"
                    onClick={openArchivedStudentsModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm"
                >
                    <Archive size={14} />
                    <span>Archived ({overviewLoading ? '...' : populationOverview.archivedStudents})</span>
                </button>
            )}

            <button
                type="button"
                onClick={() => setShowIdSwapModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm"
            >
                <RefreshCw size={14} />
                <span>Swap IDs</span>
            </button>

            <button
                type="button"
                onClick={() => setShowEnrollmentModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] border border-purple-400/80 text-white text-xs font-bold shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-purple-500/20"
            >
                <Settings size={14} />
                <span>System Settings</span>
            </button>

            <button
                type="button"
                onClick={() => setViewMode(viewMode === 'list' ? 'stats' : 'list')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm"
            >
                {viewMode === 'list' ? <PieChart size={14} /> : <List size={14} />}
                <span>{viewMode === 'list' ? 'View Stats' : 'View List'}</span>
            </button>
        </div>
    </m.div>
);

const PopulationToolbar = ({
    searchTerm, setSearchTerm, overviewLoading, populationOverview,
    activeFilterCount, onOpenFilters,
    handleExportExcel, handleExportZip, canExportStudents, exportStatus
}: any) => (
    <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
        className="bg-white rounded-2xl border border-slate-200/70 p-2.5 md:p-3 shadow-2xs flex flex-col gap-2.5 shrink-0"
    >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search by Name or ID */}
            <div className="relative w-full md:w-64 lg:w-72 shrink-0">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <label htmlFor="population-search" className="sr-only">Search students by name or ID</label>
                <input
                    id="population-search"
                    type="text"
                    placeholder="Search by Name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs md:text-sm font-medium transition-all focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10"
                />
            </div>

            {/* Tinted Stat Cards */}
            <div className="grid grid-cols-3 gap-2 flex-1 min-w-0 max-w-lg">
                {/* Total Population */}
                <div className="flex items-center gap-2 md:gap-2.5 px-3 py-1.5 md:py-2 rounded-xl bg-[#f8f5ff] border border-purple-100/80 min-w-0">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                        <Users size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] md:text-[9.5px] font-bold uppercase tracking-wider text-slate-400 truncate">TOTAL POPULATION</p>
                        <p className="text-sm md:text-base font-extrabold text-purple-900 leading-tight">
                            {overviewLoading ? '...' : (populationOverview.totalPopulation || 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Active Students */}
                <div className="flex items-center gap-2 md:gap-2.5 px-3 py-1.5 md:py-2 rounded-xl bg-[#f0fdf4] border border-emerald-100/80 min-w-0">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] md:text-[9.5px] font-bold uppercase tracking-wider text-slate-400 truncate">ACTIVE STUDENTS</p>
                        <p className="text-sm md:text-base font-extrabold text-emerald-900 leading-tight">
                            {overviewLoading ? '...' : (populationOverview.activeStudents || 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Archived Students */}
                <div className="flex items-center gap-2 md:gap-2.5 px-3 py-1.5 md:py-2 rounded-xl bg-[#fffbeb] border border-amber-100/80 min-w-0">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <Archive size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] md:text-[9.5px] font-bold uppercase tracking-wider text-slate-400 truncate">ARCHIVED STUDENTS</p>
                        <p className="text-sm md:text-base font-extrabold text-amber-900 leading-tight">
                            {overviewLoading ? '...' : (populationOverview.archivedStudents || 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Export buttons + Filter — grouped on the right */}
            <div className="shrink-0 flex items-center gap-2 justify-end">
                {canExportStudents && (
                    <div className="relative group">
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={!!exportStatus}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold transition-all hover:border-purple-300 hover:bg-purple-50/40 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileSpreadsheet size={14} />
                            <span>Excel</span>
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10">
                            Export student profiles as an Excel spreadsheet with signed document links
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                    </div>
                )}
                {canExportStudents && (
                    <div className="relative group">
                        <button
                            type="button"
                            onClick={handleExportZip}
                            disabled={!!exportStatus}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold transition-all hover:border-purple-300 hover:bg-purple-50/40 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileArchive size={14} />
                            <span>ZIP</span>
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10">
                            Export Excel + actual supporting documents bundled in a ZIP file
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onOpenFilters}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs md:text-sm font-bold transition-all shadow-2xs ${activeFilterCount > 0
                        ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50/40'
                        }`}
                >
                    <Filter size={14} />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1.5 rounded-full bg-white text-purple-700 text-[10px] font-extrabold">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>
        </div>

        {/* Export progress bar */}
        <AnimatePresence>
            {exportStatus && (
                <m.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                >
                    <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200/60">
                        <Loader2 size={14} className="animate-spin text-purple-600 shrink-0" />
                        <span className="text-xs font-semibold text-purple-700">{exportStatus}</span>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    </m.div>
);

const FilterDrawer = ({
    isOpen, onClose, departmentFilter, setDepartmentFilter,
    courseFilter, setCourseFilter, yearFilter, setYearFilter,
    statusFilter, setStatusFilter, schoolYearFilter, setSchoolYearFilter,
    sectionFilter, setSectionFilter, hasNoteFilter, setHasNoteFilter,
    atRiskFilter, setAtRiskFilter, backgroundFilter, setBackgroundFilter,
    departmentNames, filteredCourseOptions, schoolYearOptions, availableSections,
    setCurrentPage
}: any) => {
    // Local draft state for explicit confirm / clear
    const [draftDept, setDraftDept] = useState(departmentFilter);
    const [draftCourse, setDraftCourse] = useState(courseFilter);
    const [draftYear, setDraftYear] = useState(yearFilter);
    const [draftStatus, setDraftStatus] = useState(statusFilter);
    const [draftSchoolYear, setDraftSchoolYear] = useState(schoolYearFilter);
    const [draftSection, setDraftSection] = useState(sectionFilter);
    const [draftHasNote, setDraftHasNote] = useState(hasNoteFilter);
    const [draftAtRisk, setDraftAtRisk] = useState(atRiskFilter);
    const [draftBackground, setDraftBackground] = useState<string[]>(backgroundFilter);

    // Sync draft with actual filters whenever drawer opens
    useEffect(() => {
        if (isOpen) {
            setDraftDept(departmentFilter);
            setDraftCourse(courseFilter);
            setDraftYear(yearFilter);
            setDraftStatus(statusFilter);
            setDraftSchoolYear(schoolYearFilter);
            setDraftSection(sectionFilter);
            setDraftHasNote(hasNoteFilter);
            setDraftAtRisk(atRiskFilter);
            setDraftBackground(backgroundFilter);
        }
    }, [isOpen, departmentFilter, courseFilter, yearFilter, statusFilter, schoolYearFilter, sectionFilter, hasNoteFilter, atRiskFilter, backgroundFilter]);

    const handleApply = () => {
        setDepartmentFilter(draftDept);
        setCourseFilter(draftCourse);
        setYearFilter(draftYear);
        setStatusFilter(draftStatus);
        setSchoolYearFilter(draftSchoolYear);
        setSectionFilter(draftSection);
        setHasNoteFilter(draftHasNote);
        setAtRiskFilter(draftAtRisk);
        setBackgroundFilter(draftBackground);
        setCurrentPage(1);
        onClose();
    };

    const handleClearAll = () => {
        setDraftDept('All');
        setDraftCourse('All');
        setDraftYear('All');
        setDraftStatus('All');
        setDraftSchoolYear('All');
        setDraftSection('All');
        setDraftHasNote(false);
        setDraftAtRisk(false);
        setDraftBackground([]);
    };

    const draftActiveCount = [draftDept, draftCourse, draftYear, draftStatus, draftSchoolYear, draftSection]
        .filter(v => v !== 'All').length + (draftHasNote ? 1 : 0) + (draftAtRisk ? 1 : 0) + (draftBackground.length ? 1 : 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-50 transition-opacity"
                    />

                    {/* Right Drawer Panel */}
                    <m.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200"
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                                    <Filter size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Filter Students</h2>
                                {draftActiveCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                                        {draftActiveCount} active
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close filters"
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Drawer Body - Scrollable Form Controls */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {/* College */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">College</label>
                                <select
                                    value={draftDept}
                                    onChange={(e) => {
                                        setDraftDept(e.target.value);
                                        setDraftCourse('All');
                                        setDraftYear('All');
                                        setDraftSection('All');
                                    }}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                                >
                                    <option value="All">All Colleges</option>
                                    {departmentNames.map((d: string) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            {/* Course */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Course</label>
                                <select
                                    value={draftCourse}
                                    onChange={(e) => {
                                        setDraftCourse(e.target.value);
                                        setDraftYear('All');
                                        setDraftSection('All');
                                    }}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                                >
                                    <option value="All">All Courses</option>
                                    {filteredCourseOptions.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Year Level & Status in 2 cols */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Year Level</label>
                                    <select
                                        value={draftYear}
                                        onChange={(e) => { setDraftYear(e.target.value); setDraftSection('All'); }}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                                    >
                                        <option value="All">All Years</option>
                                        <option value="1st Year">1st Year</option>
                                        <option value="2nd Year">2nd Year</option>
                                        <option value="3rd Year">3rd Year</option>
                                        <option value="4th Year">4th Year</option>
                                        <option value="5th Year">5th Year</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                                    <select
                                        value={draftStatus}
                                        onChange={(e) => setDraftStatus(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value="Active">Active</option>
                                        <option value="Incomplete">Incomplete</option>
                                    </select>
                                </div>
                            </div>

                            {/* School Year & Section */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">School Year</label>
                                    <select
                                        value={draftSchoolYear}
                                        onChange={(e) => { setDraftSchoolYear(e.target.value); setDraftSection('All'); }}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                                    >
                                        <option value="All">All SY</option>
                                        {schoolYearOptions.map((sy: string) => <option key={sy} value={sy}>{sy}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Section</label>
                                    <select
                                        value={draftSection}
                                        onChange={(e) => setDraftSection(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
                                    >
                                        <option value="All">All Sections</option>
                                        {availableSections.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Annotations Toggle */}
                            <div className="space-y-1.5 pt-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">College Annotations</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDraftHasNote((v: boolean) => !v)}
                                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${draftHasNote ? 'bg-purple-600 border-purple-600 text-white shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        <MessageSquareMore size={13} />
                                        Has Note
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDraftAtRisk((v: boolean) => !v)}
                                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${draftAtRisk ? 'bg-amber-500 border-amber-500 text-white shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        <Flag size={13} />
                                        At-Risk
                                    </button>
                                </div>
                            </div>

                            {/* Background Filter Chips */}
                            <div className="space-y-2 pt-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Student Background</label>
                                <div className="flex flex-wrap gap-2">
                                    {STUDENT_BACKGROUND_FILTERS.map(({ db, label }) => {
                                        const isSelected = draftBackground.includes(db);
                                        return (
                                            <button
                                                key={db}
                                                type="button"
                                                onClick={() => {
                                                    setDraftBackground((prev: string[]) =>
                                                        prev.includes(db) ? prev.filter(x => x !== db) : [...prev, db]
                                                    );
                                                }}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSelected
                                                    ? 'bg-[#8B5CF6] text-white shadow-2xs border border-purple-500'
                                                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                                                    }`}
                                            >
                                                {isSelected ? (
                                                    <Check size={12} strokeWidth={3} className="text-white" />
                                                ) : (
                                                    <Users2 size={12} className="text-slate-400" />
                                                )}
                                                <span>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10.5px] text-slate-400 leading-tight">Selecting multiple matches students with any chosen background.</p>
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                            >
                                Clear All
                            </button>
                            <button
                                type="button"
                                onClick={handleApply}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all text-center"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </m.div>
                </>
            )}
        </AnimatePresence>
    );
};

const PopulationTable = ({
    sortConfig, handleSort, isStudentTableLoading, effectiveTotal, paginatedStudents,
    studentAnnotationsById, schoolYearFilter, canArchiveRecords,
    openProfileModal, openEditModal, setStudentToDelete, setShowDeleteModal,
    renderCareStudentPaddingRows, startIndex, endIndex, currentPage, setCurrentPage,
    totalPages, paginationItems, itemsPerPage
}: any) => (
    <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35, ease: 'easeOut' }}
        data-refresh-surface
        className="flex flex-1 flex-col min-h-0 bg-white rounded-2xl border border-slate-200/70 shadow-2xs overflow-hidden"
    >
        {/* Table Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left text-[13px]">
                <thead className="sticky top-0 z-10 bg-white border-b border-slate-200/80 text-[10.5px] uppercase text-slate-400 font-bold tracking-wider">
                    <tr>
                        <th scope="col" aria-sort={sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="py-3 px-6">
                            <button type="button" className="inline-flex items-center gap-1 font-bold text-slate-400 hover:text-purple-600 transition-colors uppercase tracking-wider" onClick={() => handleSort('name')}>
                                STUDENT <ArrowUpDown size={11} className="text-slate-300" />
                            </button>
                        </th>
                        <th scope="col" aria-sort={sortConfig.key === 'student_id' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="py-3 px-6">
                            <button type="button" className="inline-flex items-center gap-1 font-bold text-slate-400 hover:text-purple-600 transition-colors uppercase tracking-wider" onClick={() => handleSort('student_id')}>
                                ID <ArrowUpDown size={11} className="text-slate-300" />
                            </button>
                        </th>
                        <th scope="col" aria-sort={sortConfig.key === 'course' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="py-3 px-6">
                            <button type="button" className="inline-flex items-center gap-1 font-bold text-slate-400 hover:text-purple-600 transition-colors uppercase tracking-wider" onClick={() => handleSort('course')}>
                                COURSE &amp; YEAR <ArrowUpDown size={11} className="text-slate-300" />
                            </button>
                        </th>
                        <th scope="col" aria-sort={sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="py-3 px-6">
                            <button type="button" className="inline-flex items-center gap-1 font-bold text-slate-400 hover:text-purple-600 transition-colors uppercase tracking-wider" onClick={() => handleSort('status')}>
                                STATUS <ArrowUpDown size={11} className="text-slate-300" />
                            </button>
                        </th>
                        <th className="py-3 px-6 text-right font-bold text-slate-400 uppercase tracking-wider">
                            ACTIONS
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {isStudentTableLoading ? (
                        <tr>
                            <td colSpan={5} className="h-64 p-12 text-center text-slate-400 font-medium">Loading students...</td>
                        </tr>
                    ) : effectiveTotal === 0 ? (
                        <tr>
                            <td colSpan={5} className="h-64 p-12 text-center text-slate-400 font-medium">No students found.</td>
                        </tr>
                    ) : (
                        <AnimatePresence mode="wait">
                            {paginatedStudents.map((student: any, idx: number) => {
                                const annotations = studentAnnotationsById[String(student.id)] || [];
                                const hasDeptNote = annotations.some((annotation: any) => String(annotation.note || '').trim());
                                const isDeptFlagged = annotations.some((annotation: any) => annotation.is_at_risk);
                                const filteredSnapshot = schoolYearFilter === 'All'
                                    ? null
                                    : getArchivedSnapshotForSchoolYear(student, schoolYearFilter);
                                const displayCourse = filteredSnapshot?.course || student.course || '-';
                                const displayYear = filteredSnapshot?.year_level || student.year_level || '-';
                                const isInactive = student.status === 'Inactive' || student.profile_completed !== true;

                                return (
                                    <m.tr
                                        key={student.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15, delay: idx * 0.015 }}
                                        className="group odd:bg-white even:bg-slate-50/40 hover:bg-purple-50/25 transition-colors"
                                    >
                                        {/* Student Name */}
                                        <td className="py-3.5 px-6 font-bold text-slate-800 text-[13.5px]">
                                            {toTitleCase(`${student.first_name || ''} ${student.last_name || ''}`)}
                                        </td>

                                        {/* Student ID */}
                                        <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-500">
                                            {student.student_id}
                                        </td>

                                        {/* Course & Year */}
                                        <td className="py-3.5 px-6">
                                            <div className="text-[13px] font-medium text-slate-800 truncate max-w-[280px] 2xl:max-w-[420px]" title={displayCourse}>
                                                {displayCourse}
                                            </div>
                                            <div className="text-[10.5px] font-bold uppercase tracking-wider text-purple-600 mt-0.5">
                                                {displayYear}{student.section ? ` — Sec ${student.section}` : ''}
                                                {filteredSnapshot && <span className="ml-1 text-[10px] text-indigo-600">({schoolYearFilter})</span>}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3.5 px-6">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {isInactive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60 shadow-2xs">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        INCOMPLETE
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        ACTIVE
                                                    </span>
                                                )}

                                                {hasDeptNote && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-200/60 bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                                                        <MessageSquareMore size={11} />
                                                        Note
                                                    </span>
                                                )}

                                                {isDeptFlagged && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                                        <Flag size={11} />
                                                        At-Risk
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions - Floating Pill Card on Hover */}
                                        <td className="py-3.5 px-6 text-right">
                                            <div className="inline-flex items-center gap-1 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 bg-white/95 backdrop-blur-sm border border-slate-200/80 shadow-xs rounded-full px-2 py-1">
                                                <button
                                                    type="button"
                                                    aria-label={`View profile for ${student.first_name} ${student.last_name}`}
                                                    onClick={() => openProfileModal(student)}
                                                    className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full transition-colors"
                                                    title="View Profile"
                                                >
                                                    <Eye size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    aria-label={`Edit ${student.first_name} ${student.last_name}`}
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(student); }}
                                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                                                    title="Edit Student"
                                                >
                                                    <Edit size={15} />
                                                </button>

                                                {canArchiveRecords && (
                                                    <button
                                                        type="button"
                                                        aria-label={`Archive ${student.first_name} ${student.last_name}`}
                                                        onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); setShowDeleteModal(true); }}
                                                        className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-full transition-colors"
                                                        title="Archive Student"
                                                    >
                                                        <Archive size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </m.tr>
                                );
                            })}
                            {renderCareStudentPaddingRows(5, paginatedStudents.length, itemsPerPage)}
                        </AnimatePresence>
                    )}
                </tbody>
            </table>
        </div>

        {/* Sticky Table Footer Pagination */}
        <div className="sticky bottom-0 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-6 py-3 text-xs shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            <span className="font-medium text-slate-500">
                {isStudentTableLoading
                    ? 'Loading students...'
                    : effectiveTotal === 0
                        ? 'No students found.'
                        : `Showing ${startIndex + 1}-${endIndex} of ${effectiveTotal.toLocaleString()} students`}
            </span>

            <div className="flex flex-wrap items-center justify-end gap-1">
                <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={isStudentTableLoading || currentPage === 1}
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="First page"
                >
                    <ChevronsLeft size={13} />
                </button>
                <button
                    type="button"
                    onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                    disabled={isStudentTableLoading || currentPage === 1}
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={13} />
                </button>

                {paginationItems.map((item: any, index: number) => (
                    typeof item === 'number' ? (
                        <button
                            key={`student-page-${item}`}
                            type="button"
                            onClick={() => setCurrentPage(item)}
                            disabled={isStudentTableLoading}
                            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${item === currentPage
                                ? 'border-purple-600 bg-purple-600 text-white shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-purple-700'
                                }`}
                            aria-current={item === currentPage ? 'page' : undefined}
                        >
                            {item}
                        </button>
                    ) : (
                        <span key={`student-ellipsis-${index}`} className="inline-flex h-7 min-w-7 items-center justify-center text-slate-400 text-xs">
                            ...
                        </span>
                    )
                ))}

                <button
                    type="button"
                    onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
                    disabled={isStudentTableLoading || currentPage === totalPages}
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                >
                    <ChevronRight size={13} />
                </button>
                <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={isStudentTableLoading || currentPage === totalPages}
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Last page"
                >
                    <ChevronsRight size={13} />
                </button>
            </div>
        </div>
    </m.div>
);

const PopulationStatsView = ({
    courseYearCountsLoading, allCourses, courseYearCountMap
}: any) => (
    <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/70 shadow-2xs overflow-hidden p-6 flex flex-col"
    >
        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-purple-600" /> Live Student Population Counter
        </h3>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-white border-b border-slate-200 text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">
                    <tr>
                        <th className="p-3.5 font-bold">Course</th>
                        <th className="p-3.5 font-bold text-center">1st Year</th>
                        <th className="p-3.5 font-bold text-center">2nd Year</th>
                        <th className="p-3.5 font-bold text-center">3rd Year</th>
                        <th className="p-3.5 font-bold text-center">4th Year</th>
                        <th className="p-3.5 font-bold text-center bg-purple-50/50 text-purple-700">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {courseYearCountsLoading ? (
                        <tr><td colSpan={6} className="p-12 text-center text-slate-400">Loading student population stats...</td></tr>
                    ) : allCourses.map((course: any) => {
                        const courseCounts = courseYearCountMap[course.name] || {};
                        const y1 = courseCounts['1st Year'] || 0;
                        const y2 = courseCounts['2nd Year'] || 0;
                        const y3 = courseCounts['3rd Year'] || 0;
                        const y4 = courseCounts['4th Year'] || 0;
                        const total = y1 + y2 + y3 + y4;
                        return (
                            <tr key={course.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-purple-50/30 transition-colors">
                                <td className="p-3.5 font-bold text-slate-800">{course.name}</td>
                                <td className="p-3.5 text-center font-medium text-slate-600">{y1}</td>
                                <td className="p-3.5 text-center font-medium text-slate-600">{y2}</td>
                                <td className="p-3.5 text-center font-medium text-slate-600">{y3}</td>
                                <td className="p-3.5 text-center font-medium text-slate-600">{y4}</td>
                                <td className="p-3.5 text-center font-black text-purple-700 bg-purple-50/30">{total}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </m.div>
);

const RefreshingOverlay = () => (
    <div className="pointer-events-none fixed left-1/2 top-24 z-[60] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 lg:left-auto lg:right-8 lg:translate-x-0" role="status" aria-live="polite">
        <div className="care-refresh-card relative overflow-hidden rounded-xl border border-violet-100 bg-white/95 p-4 shadow-2xl shadow-violet-200/40 backdrop-blur-md">
            <div className="care-refresh-scan" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
                <div className="care-refresh-core relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-300/60">
                    <span className="care-refresh-ring care-refresh-ring-one" aria-hidden="true" />
                    <span className="care-refresh-ring care-refresh-ring-two" aria-hidden="true" />
                    <RefreshCw size={20} className="care-refresh-icon" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">Refreshing student data</p>
                        <span className="care-refresh-dot" aria-hidden="true" />
                        <span className="care-refresh-dot care-refresh-dot-delay-one" aria-hidden="true" />
                        <span className="care-refresh-dot care-refresh-dot-delay-two" aria-hidden="true" />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">Syncing totals, filters, and the current page.</p>
                </div>
            </div>
            <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="care-refresh-progress h-full rounded-full" />
            </div>
        </div>
    </div>
);

const CareStaffPopulationPage = ({ functions, pendingProfileId, onProfileOpened, refreshSignal = 0 }: CareStaffPopulationPageProps) => {
    const {
        showToast, canArchiveRecords, canRestoreRecords, populationOverview,
        overviewLoading, allCourses, allDepartments,
        archivedStudentsList, archivedStudentsLoading,
        availableSections, courseYearCountsLoading,
        courseApplicantCounts, courseApplicantCountsLoading,
        showEnrollmentModal, setShowEnrollmentModal, showArchivedStudentsModal,
        setShowArchivedStudentsModal, showEditModal, setShowEditModal, editForm, setEditForm, showDeleteModal,
        setShowDeleteModal, studentToDelete, setStudentToDelete, archivedSearchTerm, setArchivedSearchTerm, restoringStudentId,
        openEditModal, handleUpdateStudent, confirmDeleteStudent, handleRestoreStudent, searchTerm,
        setSearchTerm, currentPage, setCurrentPage, enrollmentStatusFilter,
        setEnrollmentStatusFilter, enrollmentSearchQuery, setEnrollmentSearchQuery, totalEnrollmentKeysCount, courseFilter,
        setCourseFilter, departmentFilter, setDepartmentFilter, courseDeptFilter, setCourseDeptFilter, yearFilter,
        setYearFilter, statusFilter, setStatusFilter, schoolYearFilter, setSchoolYearFilter, sectionFilter,
        setSectionFilter, hasNoteFilter, setHasNoteFilter, atRiskFilter, setAtRiskFilter, backgroundFilter,
        setBackgroundFilter, activeFilterCount, viewMode, setViewMode, itemsPerPage,
        isRefreshingData, sortConfig,
        enrollmentKeys, courseForm, setCourseForm, bulkWindowForm, setBulkWindowForm, isApplyingBulkWindow,
        isSyncingBulkKeys, settingsTab, setSettingsTab, showIdSwapModal,
        setShowIdSwapModal, sourceId, setSourceId, targetId, setTargetId, isSwappingIds,
        sourceStudent, setSourceStudent, targetStudent, setTargetStudent, sourceLoading,
        targetLoading, profileViewStudent,
        setProfileViewStudent, profileCategoryIndex, setProfileCategoryIndex, profileLoading, showPhotoModal,
        setShowPhotoModal, openProfileModal, fetchEnrollmentKeys, handleRefreshData,
        applyBulkCourseYearWindow, clearBulkCourseYearWindow, syncEnrollmentKeysFromStudents, handleAddCourse, handleUpdateCourseLimit, handleBulkUpload,
        handleDownloadTemplate, departmentNames, filteredCourseOptions, schoolYearOptions, courseRowsForManagement,
        bulkTargetCount, filteredArchivedStudents, handleExportExcel, handleExportZip, exportStatus, canExportStudents, handleSwapIds, handleSort,
        effectiveTotal, isStudentTableLoading, totalPages,
        startIndex, paginatedStudents, studentAnnotationsById, paginationItems, endIndex,
        courseYearCountMap, openArchivedStudentsModal, handleDeleteKey, handleGenerateKey
    } = useCareStaffPopulation({ functions, pendingProfileId, onProfileOpened, refreshSignal });

    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    return (
        <div className={`relative flex-1 flex flex-col min-h-0 gap-3 h-full overflow-hidden ${isRefreshingData ? 'care-student-refreshing' : ''}`}>
            {isRefreshingData && <RefreshingOverlay />}

            {/* 1. Header Banner */}
            <PopulationHeader
                isRefreshingData={isRefreshingData}
                handleRefreshData={handleRefreshData}
                canArchiveRecords={canArchiveRecords}
                canRestoreRecords={canRestoreRecords}
                overviewLoading={overviewLoading}
                populationOverview={populationOverview}
                openArchivedStudentsModal={openArchivedStudentsModal}
                setShowIdSwapModal={setShowIdSwapModal}
                setShowEnrollmentModal={setShowEnrollmentModal}
                viewMode={viewMode}
                setViewMode={setViewMode}
            />

            {/* 2. Search & Stats Toolbar */}
            <PopulationToolbar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                overviewLoading={overviewLoading}
                populationOverview={populationOverview}
                activeFilterCount={activeFilterCount}
                onOpenFilters={() => setIsFilterDrawerOpen(true)}
                handleExportExcel={handleExportExcel}
                handleExportZip={handleExportZip}
                canExportStudents={canExportStudents}
                exportStatus={exportStatus}
            />

            {/* 3. Table / Stats View */}
            {viewMode === 'stats' ? (
                <PopulationStatsView
                    courseYearCountsLoading={courseYearCountsLoading}
                    allCourses={allCourses}
                    courseYearCountMap={courseYearCountMap}
                />
            ) : (
                <PopulationTable
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    isStudentTableLoading={isStudentTableLoading}
                    effectiveTotal={effectiveTotal}
                    paginatedStudents={paginatedStudents}
                    studentAnnotationsById={studentAnnotationsById}
                    schoolYearFilter={schoolYearFilter}
                    canArchiveRecords={canArchiveRecords}
                    openProfileModal={openProfileModal}
                    openEditModal={openEditModal}
                    setStudentToDelete={setStudentToDelete}
                    setShowDeleteModal={setShowDeleteModal}
                    renderCareStudentPaddingRows={renderCareStudentPaddingRows}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalPages={totalPages}
                    paginationItems={paginationItems}
                    itemsPerPage={itemsPerPage}
                />
            )}

            {/* 4. Filter Right-Side Drawer */}
            <FilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                departmentFilter={departmentFilter}
                setDepartmentFilter={setDepartmentFilter}
                courseFilter={courseFilter}
                setCourseFilter={setCourseFilter}
                yearFilter={yearFilter}
                setYearFilter={setYearFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                schoolYearFilter={schoolYearFilter}
                setSchoolYearFilter={setSchoolYearFilter}
                sectionFilter={sectionFilter}
                setSectionFilter={setSectionFilter}
                hasNoteFilter={hasNoteFilter}
                setHasNoteFilter={setHasNoteFilter}
                atRiskFilter={atRiskFilter}
                setAtRiskFilter={setAtRiskFilter}
                backgroundFilter={backgroundFilter}
                setBackgroundFilter={setBackgroundFilter}
                departmentNames={departmentNames}
                filteredCourseOptions={filteredCourseOptions}
                schoolYearOptions={schoolYearOptions}
                availableSections={availableSections}
                setCurrentPage={setCurrentPage}
            />

            {/* 5. Modals */}
            <StudentEditModal
                allCourses={allCourses}
                editForm={editForm}
                handleUpdateStudent={handleUpdateStudent}
                setEditForm={setEditForm}
                setShowEditModal={setShowEditModal}
                showEditModal={showEditModal}
            />

            {/* Archive Student Confirmation Modal */}
            {showDeleteModal && studentToDelete && canArchiveRecords && (
                <div className="absolute inset-0 z-40 flex items-center justify-center p-4 pointer-events-auto">
                    <button
                        type="button"
                        aria-label="Close archive dialog backdrop"
                        onClick={() => { setShowDeleteModal(false); setStudentToDelete(null); }}
                        className="absolute inset-0 bg-transparent focus:outline-none cursor-default"
                    />
                    <div className="relative z-10 bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.28)] w-full max-w-md overflow-hidden border border-slate-200/90 animate-scale-in">
                        <div className="bg-gradient-to-r from-[#170529] via-[#2a0b4d] to-[#170529] p-5 px-6 flex justify-between items-center text-white border-b border-purple-900/40">
                            <div>
                                <h3 className="font-extrabold text-base text-white">Archive Student</h3>
                                <p className="text-purple-200/80 text-xs mt-0.5">Move student to archived storage.</p>
                            </div>
                            <button
                                type="button"
                                aria-label="Close archive student dialog"
                                onClick={() => { setShowDeleteModal(false); setStudentToDelete(null); }}
                                className="text-purple-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                                Archive <span className="font-bold text-slate-900">{toTitleCase(`${studentToDelete.first_name || ''} ${studentToDelete.last_name || ''}`)}</span> ({studentToDelete.student_id}) and mark the linked enrollment key as archived?
                            </p>
                            <p className="text-[11.5px] text-slate-500 leading-relaxed bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-amber-800">
                                The student record remains preserved in the archive history and can be restored at any time.
                            </p>
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowDeleteModal(false); setStudentToDelete(null); }}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <AsyncButton
                                    type="button"
                                    onClick={confirmDeleteStudent}
                                    className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center shadow-sm"
                                >
                                    Archive
                                </AsyncButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ArchivedStudentsModal
                archivedSearchTerm={archivedSearchTerm}
                archivedStudentsList={archivedStudentsList}
                archivedStudentsLoading={archivedStudentsLoading}
                canRestoreRecords={canRestoreRecords}
                filteredArchivedStudents={filteredArchivedStudents}
                handleRestoreStudent={handleRestoreStudent}
                openProfileModal={openProfileModal}
                restoringStudentId={restoringStudentId}
                setArchivedSearchTerm={setArchivedSearchTerm}
                setShowArchivedStudentsModal={setShowArchivedStudentsModal}
                showArchivedStudentsModal={showArchivedStudentsModal}
            />

            <EnrollmentKeysModal
                allCourses={allCourses}
                allDepartments={allDepartments}
                applyBulkCourseYearWindow={applyBulkCourseYearWindow}
                bulkTargetCount={bulkTargetCount}
                bulkWindowForm={bulkWindowForm}
                clearBulkCourseYearWindow={clearBulkCourseYearWindow}
                courseApplicantCounts={courseApplicantCounts}
                courseApplicantCountsLoading={courseApplicantCountsLoading}
                courseDeptFilter={courseDeptFilter}
                courseForm={courseForm}
                courseRowsForManagement={courseRowsForManagement}
                departmentNames={departmentNames}
                enrollmentKeys={enrollmentKeys}
                enrollmentSearchQuery={enrollmentSearchQuery}
                enrollmentStatusFilter={enrollmentStatusFilter}
                handleAddCourse={handleAddCourse}
                handleBulkUpload={handleBulkUpload}
                handleDeleteKey={handleDeleteKey}
                handleDownloadTemplate={handleDownloadTemplate}
                handleGenerateKey={handleGenerateKey}
                handleUpdateCourseLimit={handleUpdateCourseLimit}
                modalState={{
                    canArchiveRecords,
                    isApplyingBulkWindow,
                    isSyncingBulkKeys,
                    showEnrollmentModal
                }}
                setBulkWindowForm={setBulkWindowForm}
                setCourseDeptFilter={setCourseDeptFilter}
                setCourseForm={setCourseForm}
                setEnrollmentSearchQuery={setEnrollmentSearchQuery}
                setEnrollmentStatusFilter={setEnrollmentStatusFilter}
                setSettingsTab={setSettingsTab}
                setShowEnrollmentModal={setShowEnrollmentModal}
                settingsTab={settingsTab}
                syncEnrollmentKeysFromStudents={syncEnrollmentKeysFromStudents}
                totalEnrollmentKeysCount={totalEnrollmentKeysCount}
            />

            <StudentProfileModal
                openEditModal={openEditModal}
                profileCategoryIndex={profileCategoryIndex}
                profileLoading={profileLoading}
                profileStudentAnnotations={profileViewStudent ? studentAnnotationsById[String(profileViewStudent.id)] || [] : []}
                profileViewStudent={profileViewStudent}
                setProfileCategoryIndex={setProfileCategoryIndex}
                setProfileViewStudent={setProfileViewStudent}
                setShowPhotoModal={setShowPhotoModal}
                showPhotoModal={showPhotoModal}
                showToast={showToast}
            />

            <IdSwapModal
                handleSwapIds={handleSwapIds}
                isSwappingIds={isSwappingIds}
                setShowIdSwapModal={setShowIdSwapModal}
                setSourceId={setSourceId}
                setSourceStudent={setSourceStudent}
                setTargetId={setTargetId}
                setTargetStudent={setTargetStudent}
                showIdSwapModal={showIdSwapModal}
                sourceId={sourceId}
                sourceLoading={sourceLoading}
                sourceStudent={sourceStudent}
                targetId={targetId}
                targetLoading={targetLoading}
                targetStudent={targetStudent}
            />
        </div>
    );
};

export default CareStaffPopulationPage;
