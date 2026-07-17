import React from 'react';
import { m } from 'framer-motion';
import { Calendar, Info } from 'lucide-react';
import { FieldErrorText, NAT_ORANGE_INPUT_CLASS, NAT_ORANGE_SELECT_CLASS, ResolveNatInputClassName } from './shared';

export interface NatCourseSelectionStepProps {
  formData: Record<string, any>;
  handleChange: (event: any) => void;
  availableCourses: any[];
  availableDates: any[];
  selectedDateTimeSlots: any[];
  supportsTestTime: boolean;
  fieldErrors: Record<string, string>;
  resolveInputClassName: ResolveNatInputClassName;
  getCourseCapacityMeta: (course: any) => {
    limit: number;
    applicantCount: number;
    remaining: number;
    isClosed: boolean;
    isFull: boolean;
    isSelectable: boolean;
  };
}

export default function CourseSelectionStep({
  formData,
  handleChange,
  availableCourses,
  availableDates,
  selectedDateTimeSlots,
  supportsTestTime,
  fieldErrors,
  resolveInputClassName,
  getCourseCapacityMeta
}: NatCourseSelectionStepProps) {
  return (
    <m.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="nat-section-card group relative overflow-hidden rounded-3xl border border-white/50 bg-white/60 p-8 shadow-xl shadow-blue-900/5 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/10 backdrop-blur-md">
        <div className="absolute left-0 top-0 h-full w-1.5 bg-orange-500" />
        <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-gray-900">
          <div className="rounded-lg bg-orange-100 p-2 text-orange-600"><Calendar className="h-5 w-5" /></div>
          Course & Schedule
        </h3>

        <div className="mb-6 flex gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800">
          <Info className="h-5 w-5 shrink-0" />
          Please select three different courses in order of preference.
        </div>

        <div className="mb-6 space-y-1.5">
          <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Reason for Choosing NORSU <span className="text-red-500">*</span></label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            rows={3}
            className={resolveInputClassName(`${NAT_ORANGE_INPUT_CLASS} resize-none`, 'reason')}
            placeholder="Briefly explain why you want to study at NORSU..."
          />
          <FieldErrorText message={fieldErrors.reason} />
        </div>

        <div className="mb-8">
          {availableCourses.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Priority Course (1st Choice) <span className="text-red-500">*</span></label>
                <select required name="priorityCourse" value={formData.priorityCourse} onChange={handleChange} className={resolveInputClassName(NAT_ORANGE_INPUT_CLASS, 'priorityCourse')}>
                  <option value="">Select priority course</option>
                  {availableCourses.map((course) => {
                    const capacity = getCourseCapacityMeta(course);
                    return (
                      <option key={course.name} value={course.name} disabled={!capacity.isSelectable}>
                        {course.name} {capacity.isClosed ? '(CLOSED)' : capacity.isFull ? '(FULL)' : `(${capacity.applicantCount}/${capacity.limit})`}
                      </option>
                    );
                  })}
                </select>
                <FieldErrorText message={fieldErrors.priorityCourse} />
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Alternative Course (2nd Choice) <span className="text-red-500">*</span></label>
                <select required name="altCourse1" value={formData.altCourse1} onChange={handleChange} className={resolveInputClassName(NAT_ORANGE_INPUT_CLASS, 'altCourse1')}>
                  <option value="">Select alternative course</option>
                  {availableCourses
                    .filter((course) => course.name !== formData.priorityCourse)
                    .map((course) => {
                      const capacity = getCourseCapacityMeta(course);
                      return (
                        <option key={course.name} value={course.name} disabled={!capacity.isSelectable}>
                          {course.name} {capacity.isClosed ? '(CLOSED)' : capacity.isFull ? '(FULL)' : `(${capacity.applicantCount}/${capacity.limit})`}
                        </option>
                      );
                    })}
                </select>
                <FieldErrorText message={fieldErrors.altCourse1} />
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Alternative Course (3rd Choice) <span className="text-red-500">*</span></label>
                <select required name="altCourse2" value={formData.altCourse2} onChange={handleChange} className={resolveInputClassName(NAT_ORANGE_INPUT_CLASS, 'altCourse2')}>
                  <option value="">Select alternative course</option>
                  {availableCourses
                    .filter((course) => course.name !== formData.priorityCourse && course.name !== formData.altCourse1)
                    .map((course) => {
                      const capacity = getCourseCapacityMeta(course);
                      return (
                        <option key={course.name} value={course.name} disabled={!capacity.isSelectable}>
                          {course.name} {capacity.isClosed ? '(CLOSED)' : capacity.isFull ? '(FULL)' : `(${capacity.applicantCount}/${capacity.limit})`}
                        </option>
                      );
                    })}
                </select>
                <FieldErrorText message={fieldErrors.altCourse2} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
              No courses are currently available for selection. Please try again later.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Preferred Test Date <span className="text-red-500">*</span></label>
          {availableDates.length > 0 ? (
            <select required name="testDate" value={formData.testDate} onChange={handleChange} className={resolveInputClassName(NAT_ORANGE_SELECT_CLASS, 'testDate')}>
              <option value="">Select a date for examination</option>
              {availableDates.map((date) => {
                const remaining = (date.slots || 0) - (date.applicantCount || 0);
                return (
                  <option key={date.id} value={date.date} disabled={remaining <= 0}>
                    {new Date(date.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {date.venue ? ` - ${date.venue}` : ''}
                    {date.slots ? ` (${remaining > 0 ? remaining : 0} slots left)` : ''}
                  </option>
                );
              })}
            </select>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <Info className="h-5 w-5" /> No test schedules are currently available. Please check back later.
            </div>
          )}
          <FieldErrorText message={fieldErrors.testDate} />

          {supportsTestTime && formData.testDate && selectedDateTimeSlots.length > 0 ? (
            <div className="pt-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Preferred Test Time <span className="text-red-500">*</span></label>
              <select
                required
                name="testTime"
                value={formData.testTime}
                onChange={handleChange}
                className={resolveInputClassName(`mt-1 ${NAT_ORANGE_SELECT_CLASS}`, 'testTime')}
              >
                <option value="">Select a time slot</option>
                {selectedDateTimeSlots.map((slot) => (
                  <option key={slot.key} value={slot.key} disabled={(slot.remaining ?? 0) <= 0}>
                    {slot.label} ({slot.remaining ?? 0} slots left)
                  </option>
                ))}
              </select>
              <FieldErrorText message={fieldErrors.testTime} />
            </div>
          ) : null}
        </div>
      </div>
    </m.div>
  );
}
