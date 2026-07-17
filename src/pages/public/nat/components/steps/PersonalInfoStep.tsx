import React from 'react';
import { m } from 'framer-motion';
import { User } from 'lucide-react';
import DatePicker from '../../../../../components/ui/DatePicker';
import { FieldErrorText, NAT_BLUE_INPUT_CLASS, ResolveNatInputClassName } from './shared';

export interface NatPersonalInfoStepProps {
  formData: Record<string, any>;
  handleChange: (event: any) => void;
  onDobChange: (value: string) => void;
  fieldErrors: Record<string, string>;
  resolveInputClassName: ResolveNatInputClassName;
}

export default function PersonalInfoStep({
  formData,
  handleChange,
  onDobChange,
  fieldErrors,
  resolveInputClassName
}: NatPersonalInfoStepProps) {
  return (
    <m.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="nat-section-card group relative overflow-hidden rounded-[2rem] border border-white bg-white/40 p-8 shadow-xl shadow-blue-900/5 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/10 backdrop-blur-2xl">
        <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-400 to-blue-600" />
        <h3 className="mb-6 flex items-center gap-3 text-xl font-black text-slate-800">
          <div className="rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-100 to-blue-200 p-2.5 shadow-inner">
            <User className="h-5 w-5 text-blue-700 drop-shadow-sm" />
          </div>
          Personal Information
        </h3>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'First Name', name: 'firstName', width: 'md:col-span-1' },
            { label: 'Last Name', name: 'lastName', width: 'md:col-span-1' },
            { label: 'Middle Name', name: 'middleName', width: 'md:col-span-1', required: false },
            { label: 'Suffix', name: 'suffix', width: 'md:col-span-1', placeholder: 'e.g. Jr.', required: false }
          ].map((field) => (
            <div key={field.name} className={`space-y-1.5 ${field.width || ''}`.trim()}>
              <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                {field.label} {field.required !== false ? <span className="text-red-500">*</span> : null}
              </label>
              <input
                type="text"
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                required={field.required !== false}
                placeholder={field.placeholder || ''}
                className={resolveInputClassName(NAT_BLUE_INPUT_CLASS, field.name)}
              />
              <FieldErrorText message={fieldErrors[field.name]} />
            </div>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Date of Birth <span className="text-red-500">*</span></label>
            <DatePicker
              required
              name="dob"
              value={formData.dob}
              onChange={onDobChange}
              placeholder="Select birth date"
              className={resolveInputClassName(NAT_BLUE_INPUT_CLASS, 'dob')}
            />
            <FieldErrorText message={fieldErrors.dob} />
          </div>
          <div className="space-y-1.5">
            <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Age <span className="text-red-500">*</span></label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
              className={resolveInputClassName(NAT_BLUE_INPUT_CLASS, 'age')}
            />
            <FieldErrorText message={fieldErrors.age} />
          </div>
          <div className="space-y-1.5">
            <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Place of Birth <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="placeOfBirth"
              value={formData.placeOfBirth}
              onChange={handleChange}
              required
              className={resolveInputClassName(NAT_BLUE_INPUT_CLASS, 'placeOfBirth')}
            />
            <FieldErrorText message={fieldErrors.placeOfBirth} />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Nationality <span className="text-red-500">*</span></label>
            <input
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              required
              className={resolveInputClassName(NAT_BLUE_INPUT_CLASS, 'nationality')}
            />
            <FieldErrorText message={fieldErrors.nationality} />
          </div>
          <div className="space-y-1.5">
            <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Sex Assigned at Birth <span className="text-red-500">*</span></label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              required
              className={resolveInputClassName(NAT_BLUE_INPUT_CLASS, 'sex')}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <FieldErrorText message={fieldErrors.sex} />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Gender Identity</label>
          <div className="flex flex-wrap gap-4">
            {['Cis-gender', 'Transgender', 'Non-binary', 'Prefer not to say'].map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white/40 px-3 py-2 transition-all hover:border-blue-200 hover:bg-blue-50">
                <input type="radio" name="genderIdentity" value={option} checked={formData.genderIdentity === option} onChange={handleChange} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Civil Status <span className="text-red-500">*</span></label>
          <select
            name="civilStatus"
            value={formData.civilStatus}
            onChange={handleChange}
            required
            className={resolveInputClassName(NAT_BLUE_INPUT_CLASS, 'civilStatus')}
          >
            <option value="">Select status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Separated (Legally)">Separated (Legally)</option>
            <option value="Separated (Physically)">Separated (Physically)</option>
            <option value="With Live-In Partner">With Live-In Partner</option>
            <option value="Divorced">Divorced</option>
            <option value="Widow/er">Widow/er</option>
          </select>
          <FieldErrorText message={fieldErrors.civilStatus} />
        </div>
      </div>
    </m.div>
  );
}
