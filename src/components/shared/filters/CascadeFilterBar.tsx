import React from 'react';
import FilterBar from './FilterBar';
import SelectFilter from './SelectFilter';

export interface CascadeFilterBarProps {
  courseOptions: string[];
  yearOptions: string[];
  sectionOptions: string[];
  selectedCourse: string;
  selectedYear: string;
  selectedSection: string;
  onCourseChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onReset: () => void;
  courseLabel?: string;
  yearLabel?: string;
  sectionLabel?: string;
  allCourseLabel?: string;
  allYearLabel?: string;
  allSectionLabel?: string;
}

export default function CascadeFilterBar({
  courseOptions,
  yearOptions,
  sectionOptions,
  selectedCourse,
  selectedYear,
  selectedSection,
  onCourseChange,
  onYearChange,
  onSectionChange,
  onReset,
  courseLabel = 'Course',
  yearLabel = 'Year',
  sectionLabel = 'Section',
  allCourseLabel = 'All Courses',
  allYearLabel = 'All Years',
  allSectionLabel = 'All Sections'
}: CascadeFilterBarProps) {
  const hasActiveFilters = selectedCourse !== 'All' || selectedYear !== 'All' || selectedSection !== 'All';

  return (
    <FilterBar className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
      <div className="mr-1 flex min-h-[42px] items-center text-sm font-semibold text-slate-500">
        Filter:
      </div>
      <SelectFilter
        label={courseLabel}
        value={selectedCourse}
        onChange={onCourseChange}
        options={[
          { label: allCourseLabel, value: 'All' },
          ...courseOptions.map((value) => ({ label: value, value }))
        ]}
        className="min-w-[220px]"
      />
      <SelectFilter
        label={yearLabel}
        value={selectedYear}
        onChange={onYearChange}
        options={[
          { label: allYearLabel, value: 'All' },
          ...yearOptions.map((value) => ({ label: value, value }))
        ]}
      />
      <SelectFilter
        label={sectionLabel}
        value={selectedSection}
        onChange={onSectionChange}
        options={[
          { label: allSectionLabel, value: 'All' },
          ...sectionOptions.map((value) => ({ label: `Sec ${value}`, value }))
        ]}
      />
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          Reset
        </button>
      ) : null}
    </FilterBar>
  );
}
