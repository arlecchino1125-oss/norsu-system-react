import { useMemo } from 'react';
import type React from 'react';
import { CheckCircle, Eye, EyeOff, Lock, UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import DatePicker from '../../../../../components/ui/DatePicker';
import SearchableSelect from '../../../../../components/ui/SearchableSelect';

type ActivatedStudentCredentials = {
    username: string;
    password: string;
};

type CourseOption = {
    name: string;
};

type ActivationWizardProps = {
    isMainModalHidden: boolean;
    activationStep: number;
    activatedCredentials: ActivatedStudentCredentials | null;
    courses: CourseOption[];
    programOptions: string[];
    formData: any;
    activationErrorFields: string[];
    showActivationPassword: boolean;
    isLoginPending: boolean;
    setActivationStep: React.Dispatch<React.SetStateAction<number>>;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    setActivationErrorFields: React.Dispatch<React.SetStateAction<string[]>>;
    onClose: () => void;
    onCancel: () => void;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onNextStep: () => void;
    onActivationTrigger: () => void;
    onActivatedCredentialsLogin: () => void;
    onReturnToLogin: () => void;
    onToggleActivationPassword: () => void;
};

const TOTAL_STEPS = 3;
const STEP_LABELS = ['Verify', 'Personal', 'Finish'] as const;
const SEX_OPTIONS = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' }
];

const wizardPageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
};

export function ActivationWizard({
    isMainModalHidden,
    activationStep,
    activatedCredentials,
    courses,
    programOptions,
    formData,
    activationErrorFields,
    showActivationPassword,
    isLoginPending,
    setActivationStep,
    setFormData,
    setActivationErrorFields,
    onClose,
    onCancel,
    onChange,
    onNextStep,
    onActivationTrigger,
    onActivatedCredentialsLogin,
    onReturnToLogin,
    onToggleActivationPassword
}: ActivationWizardProps) {
    const courseOptions = useMemo(
        () => (
            courses.length > 0
                ? courses.map((course) => ({ label: course.name, value: course.name }))
                : programOptions.map((name) => ({ label: name, value: name }))
        ),
        [courses, programOptions]
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-transparent p-0 md:items-center md:justify-center md:p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                className={`relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl shadow-indigo-900/50 md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-[2.5rem] ${isMainModalHidden ? 'hidden' : ''}`}
            >
                <div className="p-5 border-b border-slate-100 flex flex-col bg-slate-50/30">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><UserPlus size={16} /></div>
                                Create Account
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {!activatedCredentials && (
                        <div className="w-full">
                            <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1.5 px-1 uppercase tracking-widest">
                                {STEP_LABELS.map((label, index) => (
                                    <span key={label} className={activationStep >= index + 1 ? 'text-indigo-600' : ''}>{label}</span>
                                ))}
                            </div>
                            <div className="relative w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-indigo-500 to-sky-400" />
                                <motion.div
                                    className="absolute inset-0 h-full w-full origin-right bg-slate-200"
                                    initial={{ scaleX: 1 }}
                                    animate={{ scaleX: 1 - activationStep / TOTAL_STEPS }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5 pb-28 [scrollbar-width:none] sm:p-6 sm:pb-28 md:p-10 md:pb-10 [&::-webkit-scrollbar]:hidden">
                    {activatedCredentials ? (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12 text-emerald-600" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-2">Activation Successful!</h3>
                            <p className="text-slate-500 mb-6 max-w-sm mx-auto font-medium">Your student portal account is ready. Use your Student ID and the password you created during activation.</p>

                            <div className="max-w-sm mx-auto rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6 text-left shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Reminder</p>
                                <p className="text-sm text-amber-900 leading-relaxed">Take a screenshot if you want a record of your Student ID. Your password is not displayed here.</p>
                            </div>

                            <div className="max-w-sm mx-auto bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 mb-6 shadow-inner">
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm text-left relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Student ID</p>
                                        <p className="font-mono font-bold text-xl text-slate-800 tracking-wider pl-1">{activatedCredentials.username}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm text-left relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500"></div>
                                        <p className="text-xs text-sky-500 font-bold uppercase tracking-wider mb-1">Password</p>
                                        <p className="text-sm font-semibold leading-relaxed text-slate-600">Not shown. Use the password you typed in the final step.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="max-w-sm mx-auto flex flex-col gap-3">
                                <button
                                    type="button"
                                    disabled={isLoginPending}
                                    onClick={onActivatedCredentialsLogin}
                                    className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1 w-full disabled:opacity-70"
                                >
                                    {isLoginPending ? 'Logging In...' : 'Log In to Student Portal'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onReturnToLogin}
                                    className="bg-white text-slate-700 px-10 py-3 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all w-full"
                                >
                                    Return to Login Form
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <form id="activationForm" onSubmit={(event) => event.preventDefault()} className="relative min-h-[300px]">
                            <AnimatePresence mode="wait">
                                {activationStep === 1 && (
                                    <motion.div key="step1" initial="initial" animate="in" exit="out" variants={wizardPageVariants} className="space-y-6 py-2">
                                        <div className="mb-2 px-1">
                                            <h3 className="text-base font-bold text-slate-800">Enrollment Details</h3>
                                            <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Verify your student identity to begin activation.</p>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Student ID <span className="text-rose-500">*</span></label>
                                                <input required name="studentId" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300" placeholder="Ex: 202312345" value={formData.studentId} onChange={onChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <SearchableSelect
                                                    id="courseSelect"
                                                    label="Course"
                                                    value={formData.course}
                                                    options={courseOptions}
                                                    onChange={(value) => setFormData((prev: any) => ({ ...prev, course: value }))}
                                                    placeholder="Select your enrolled course"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activationStep === 2 && (
                                    <motion.div key="step2" initial="initial" animate="in" exit="out" variants={wizardPageVariants} className="space-y-6 py-2">
                                        <div className="mb-2 px-1">
                                            <h3 className="text-base font-bold text-slate-800">Personal Information</h3>
                                            <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Basic details needed for your student profile.</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Last Name *</label>
                                                <input required name="lastName" value={formData.lastName} onChange={onChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">First Name *</label>
                                                <input required name="firstName" value={formData.firstName} onChange={onChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Suffix</label>
                                                <input name="suffix" value={formData.suffix} onChange={onChange} placeholder="Jr., II, etc." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Middle Name</label>
                                                <input name="middleName" value={formData.middleName} onChange={onChange} placeholder="N/A if none" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Address</label>
                                            <input name="street" placeholder="Street / Block / Subd." value={formData.street} onChange={onChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700" />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-x-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">City</label>
                                                <input name="city" value={formData.city} onChange={onChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Province</label>
                                                <input name="province" value={formData.province} onChange={onChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Zip</label>
                                                <input name="zipCode" value={formData.zipCode} onChange={onChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Contact Number *</label>
                                                <input required name="mobile" value={formData.mobile} onChange={onChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Email *</label>
                                                <input required type="email" name="email" value={formData.email} onChange={onChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-x-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Birthday *</label>
                                                <DatePicker
                                                    required
                                                    name="dob"
                                                    value={formData.dob}
                                                    onChange={(value) => {
                                                        setFormData((prev: any) => {
                                                            const age = value ? Math.floor((Date.now() - new Date(value + 'T00:00:00').getTime()) / 31557600000) : '';
                                                            return { ...prev, dob: value, age };
                                                        });
                                                    }}
                                                    placeholder="Select birth date"
                                                    className="[&>button]:py-3 [&>button>span]:truncate"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.08em] px-1">Age</label>
                                                <input type="number" name="age" value={formData.age} onChange={onChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700" readOnly />
                                            </div>
                                            <div className="space-y-3">
                                                <SearchableSelect
                                                    id="sexSelect"
                                                    label="Sex"
                                                    value={formData.sex}
                                                    options={SEX_OPTIONS}
                                                    onChange={(value) => setFormData((prev: any) => ({ ...prev, sex: value }))}
                                                    placeholder="Select sex"
                                                    required
                                                    searchable={false}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activationStep === 3 && (
                                    <motion.div key="step3" initial="initial" animate="in" exit="out" variants={wizardPageVariants} className="space-y-6">
                                        <div className="mb-4 text-center">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
                                                <Lock className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-800">Final Step</h3>
                                        </div>
                                        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 p-6 text-center shadow-sm">
                                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600/80">Security Notice</p>
                                            <p className="mt-2 text-base font-bold leading-relaxed text-indigo-900">
                                                Please create a strong password to secure your student account.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
                                            <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Create Your Password</h4>
                                            <p className="mt-2 text-sm text-slate-600">This password will be used for your Student Portal login. It will not be emailed or displayed after account creation.</p>
                                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-1.5 relative">
                                                    <label className="text-xs font-bold uppercase text-slate-500">Password *</label>
                                                    <div className="relative">
                                                        <input
                                                            required
                                                            type={showActivationPassword ? 'text' : 'password'}
                                                            name="password"
                                                            autoComplete="new-password"
                                                            value={formData.password}
                                                            onChange={(event) => {
                                                                onChange(event);
                                                                setActivationErrorFields((prev) => prev.filter((field) => field !== 'password'));
                                                            }}
                                                            placeholder="At least 8 characters"
                                                            className={`w-full pl-4 pr-12 py-3 bg-white border ${activationErrorFields.includes('password') ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-600' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'} rounded-xl outline-none transition-all text-sm`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={onToggleActivationPassword}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                                        >
                                                            {showActivationPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 relative">
                                                    <label className="text-xs font-bold uppercase text-slate-500">Confirm Password *</label>
                                                    <div className="relative">
                                                        <input
                                                            required
                                                            type={showActivationPassword ? 'text' : 'password'}
                                                            name="confirmPassword"
                                                            autoComplete="new-password"
                                                            value={formData.confirmPassword}
                                                            onChange={(event) => {
                                                                onChange(event);
                                                                setActivationErrorFields((prev) => prev.filter((field) => field !== 'confirmPassword'));
                                                            }}
                                                            placeholder="Re-enter password"
                                                            className={`w-full pl-4 pr-12 py-3 bg-white border ${activationErrorFields.includes('confirmPassword') ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-600' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'} rounded-xl outline-none transition-all text-sm`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={onToggleActivationPassword}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                                        >
                                                            {showActivationPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    )}
                </div>

                {!activatedCredentials && (
                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-8 md:rounded-b-[2.5rem]">
                        {activationStep > 1 ? (
                            <button
                                type="button"
                                onClick={() => setActivationStep((prev) => prev - 1)}
                                className="w-full rounded-2xl px-8 py-3 text-sm font-black text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-600 sm:w-auto"
                            >
                                Previous
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="w-full rounded-2xl px-8 py-3 text-sm font-black text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 sm:w-auto"
                            >
                                Cancel
                            </button>
                        )}

                        {activationStep < TOTAL_STEPS ? (
                            <button
                                type="button"
                                onClick={onNextStep}
                                className="w-full rounded-2xl bg-slate-900 px-10 py-3 text-sm font-black text-white shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800 active:scale-95 sm:w-auto"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onActivationTrigger}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 px-10 py-3 text-sm font-black text-white shadow-xl shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-95 sm:w-auto"
                            >
                                Create Account
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
