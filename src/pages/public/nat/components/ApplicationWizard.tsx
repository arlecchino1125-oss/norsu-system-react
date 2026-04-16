import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Info, Loader2 } from 'lucide-react';
import NatPrivacyConsentCard from './NatPrivacyConsentCard';
import PersonalInfoStep from './steps/PersonalInfoStep';
import CourseSelectionStep from './steps/CourseSelectionStep';
import ContactDetailsStep from './steps/ContactDetailsStep';
import { ResolveNatInputClassName } from './steps/shared';

const APPLICATION_STEPS = [
  { id: 1, title: 'Personal Info', shortTitle: 'Personal' },
  { id: 2, title: 'Course Selection', shortTitle: 'Course' },
  { id: 3, title: 'Contact Details', shortTitle: 'Contact' }
] as const;

export interface ApplicationWizardProps {
  currentStep: number;
  formData: Record<string, any>;
  fieldErrors: Record<string, string>;
  isPrivacyOpen: boolean;
  hasRestoredDraft: boolean;
  loading: boolean;
  availableCourses: any[];
  availableDates: any[];
  selectedDateTimeSlots: any[];
  supportsTestTime: boolean;
  resolveInputClassName: ResolveNatInputClassName;
  handleChange: (event: any) => void;
  handleDobChange: (value: string) => void;
  handlePrivacyAgreementChange: (checked: boolean) => void;
  onTogglePrivacyOpen: () => void;
  onPreviousStep: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  getCourseCapacityMeta: (course: any) => {
    limit: number;
    applicantCount: number;
    remaining: number;
    isClosed: boolean;
    isFull: boolean;
    isSelectable: boolean;
  };
}

export default function ApplicationWizard({
  currentStep,
  formData,
  fieldErrors,
  isPrivacyOpen,
  hasRestoredDraft,
  loading,
  availableCourses,
  availableDates,
  selectedDateTimeSlots,
  supportsTestTime,
  resolveInputClassName,
  handleChange,
  handleDobChange,
  handlePrivacyAgreementChange,
  onTogglePrivacyOpen,
  onPreviousStep,
  onSubmit,
  getCourseCapacityMeta
}: ApplicationWizardProps) {
  return (
    <div className="nat-form-shell mx-auto flex w-full max-w-6xl flex-col gap-4 animate-slide-in-up pb-24 lg:flex-row lg:gap-8">
      <div className="block lg:hidden">
        <div className="nat-mobile-stepper rounded-2xl border border-white bg-white/40 p-4 shadow-lg shadow-blue-900/5 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-2">
            {APPLICATION_STEPS.map((step, index) => {
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${isActive ? 'scale-110 border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/30' : isPast ? 'border-green-500 bg-green-500 text-white' : 'border-slate-200 bg-white text-slate-400'}`}>
                      {isPast ? <Check className="h-4 w-4" /> : <span className="text-xs font-black">{step.id}</span>}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-700' : isPast ? 'text-green-600' : 'text-slate-400'}`}>{step.shortTitle}</span>
                  </div>
                  {index < APPLICATION_STEPS.length - 1 ? (
                    <div className={`mx-1 -mt-4 h-0.5 flex-1 rounded-full transition-colors duration-300 ${currentStep > step.id ? 'bg-green-400' : 'bg-slate-200'}`} />
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <NatPrivacyConsentCard
          collapsible={true}
          isOpen={isPrivacyOpen}
          onToggleOpen={onTogglePrivacyOpen}
          isAgreed={formData.agreedToPrivacy}
          onChange={handlePrivacyAgreementChange}
          errorMessage={fieldErrors.agreedToPrivacy}
        />
      </div>

      <div className="nat-sidebar hidden shrink-0 lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="nat-section-card nat-sidebar-card rounded-[2rem] border border-white bg-white/40 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-2xl">
            <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-800">Application Sections</h3>
            <div className="space-y-2">
              {APPLICATION_STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isPast = currentStep > step.id;
                return (
                  <div key={step.id} className={`flex items-center gap-3 rounded-xl p-3 transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : isPast ? 'border-green-500 bg-green-50 text-green-500' : 'border-slate-200 text-slate-400'}`}>
                      {isPast ? <Check className="h-4 w-4" /> : <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`} />}
                    </div>
                    <span className={`text-sm font-bold ${isActive ? 'text-blue-700' : isPast ? 'text-slate-700' : 'text-slate-500'}`}>{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <NatPrivacyConsentCard
            isAgreed={formData.agreedToPrivacy}
            onChange={handlePrivacyAgreementChange}
            errorMessage={fieldErrors.agreedToPrivacy}
          />
        </div>
      </div>

      <div className="nat-form-main">
        <div className="nat-callout mb-8 flex gap-4 rounded-2xl border border-blue-200/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-6 shadow-lg shadow-blue-500/5 backdrop-blur-xl">
          <Info className="h-6 w-6 shrink-0 text-blue-600 drop-shadow-sm" />
          <div>
            <h3 className="mb-1 font-extrabold tracking-tight text-blue-900">Before you begin</h3>
            <p className="text-sm font-medium leading-relaxed text-blue-800/90">
              Please fill out all fields accurately. Your application will be used for your official university records. Fields marked with <span className="font-black text-red-500">*</span> are required.
            </p>
            <p className="mt-2 text-xs font-bold text-blue-700">
              {hasRestoredDraft ? 'A saved draft from this browser has been restored for you.' : 'Drafts are saved automatically on this device while you complete the form.'}
            </p>
          </div>
        </div>

        {Object.keys(fieldErrors).length > 0 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
            Please review the highlighted fields before continuing.
          </div>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="relative z-10 min-h-[50vh] space-y-8">
          <AnimatePresence mode="wait">
            {currentStep === 1 ? (
              <PersonalInfoStep
                formData={formData}
                handleChange={handleChange}
                onDobChange={handleDobChange}
                fieldErrors={fieldErrors}
                resolveInputClassName={resolveInputClassName}
              />
            ) : null}

            {currentStep === 2 ? (
              <CourseSelectionStep
                formData={formData}
                handleChange={handleChange}
                availableCourses={availableCourses}
                availableDates={availableDates}
                selectedDateTimeSlots={selectedDateTimeSlots}
                supportsTestTime={supportsTestTime}
                fieldErrors={fieldErrors}
                resolveInputClassName={resolveInputClassName}
                getCourseCapacityMeta={getCourseCapacityMeta}
              />
            ) : null}

            {currentStep === 3 ? (
              <ContactDetailsStep
                formData={formData}
                handleChange={handleChange}
                fieldErrors={fieldErrors}
                resolveInputClassName={resolveInputClassName}
              />
            ) : null}
          </AnimatePresence>

          <div className="nat-action-bar group sticky bottom-6 z-50 mt-8 flex flex-col items-center justify-between gap-6 rounded-[2rem] border border-white bg-white/40 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur-2xl md:flex-row">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-r from-blue-50/50 to-indigo-50/50" />

            {currentStep > 1 ? (
              <button type="button" onClick={onPreviousStep} className="nat-secondary-action flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <button type="submit" disabled={loading} className="nat-primary-action flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition-colors active:scale-95 hover:bg-blue-700">
                Next Step <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="submit" disabled={loading} className="nat-primary-action group/btn relative flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-4 text-lg font-black text-white transition-all active:scale-95 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50">
                <div className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 ease-out group-hover/btn:translate-y-0" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  {loading ? 'Submitting...' : 'Submit Application'}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
