import React from 'react';
import { m } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { FieldErrorText, NAT_TEAL_INPUT_CLASS, ResolveNatInputClassName } from './shared';

export interface NatContactInfoStepProps {
  formData: Record<string, any>;
  handleChange: (event: any) => void;
  fieldErrors: Record<string, string>;
  resolveInputClassName: ResolveNatInputClassName;
}

export default function ContactDetailsStep({
  formData,
  handleChange,
  fieldErrors,
  resolveInputClassName
}: NatContactInfoStepProps) {
  return (
    <m.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="nat-section-card group relative overflow-hidden rounded-[2rem] border border-white bg-white/40 p-8 shadow-xl shadow-blue-900/5 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/10 backdrop-blur-2xl">
        <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-teal-400 to-teal-600" />
        <h3 className="mb-6 flex items-center gap-3 text-xl font-black text-slate-800">
          <div className="rounded-xl border border-teal-200/50 bg-gradient-to-br from-teal-100 to-teal-200 p-2.5 shadow-inner">
            <MapPin className="h-5 w-5 text-teal-700 drop-shadow-sm" />
          </div>
          Contact Information
        </h3>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="street" className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Complete Address <span className="text-red-500">*</span></label>
            <input
              id="street"
              name="street"
              value={formData.street}
              onChange={handleChange}
              required
              placeholder="Street, Purok, House No."
              className={resolveInputClassName(NAT_TEAL_INPUT_CLASS, 'street')}
            />
            <FieldErrorText message={fieldErrors.street} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="city" className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">City/Municipality <span className="text-red-500">*</span></label>
              <input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className={resolveInputClassName(NAT_TEAL_INPUT_CLASS, 'city')}
              />
              <FieldErrorText message={fieldErrors.city} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="province" className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Province <span className="text-red-500">*</span></label>
              <input
                id="province"
                name="province"
                value={formData.province}
                onChange={handleChange}
                required
                className={resolveInputClassName(NAT_TEAL_INPUT_CLASS, 'province')}
              />
              <FieldErrorText message={fieldErrors.province} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="zip-code" className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Zip Code <span className="text-red-500">*</span></label>
              <input
                id="zip-code"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                required
                className={resolveInputClassName(NAT_TEAL_INPUT_CLASS, 'zipCode')}
              />
              <FieldErrorText message={fieldErrors.zipCode} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="mobile" className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Mobile Number <span className="text-red-500">*</span></label>
              <input
                id="mobile"
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                required
                className={resolveInputClassName(NAT_TEAL_INPUT_CLASS, 'mobile')}
                placeholder="09123456789"
              />
              <FieldErrorText message={fieldErrors.mobile} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Email Address <span className="text-red-500">*</span></label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={resolveInputClassName(NAT_TEAL_INPUT_CLASS, 'email')}
                placeholder="email@example.com"
              />
              <FieldErrorText message={fieldErrors.email} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="facebook-url" className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-500">Facebook Account Link (Optional)</label>
              <input
                id="facebook-url"
                name="facebookUrl"
                value={formData.facebookUrl}
                onChange={handleChange}
                className={NAT_TEAL_INPUT_CLASS}
                placeholder="https://facebook.com/username"
              />
            </div>
          </div>
        </div>
      </div>
    </m.div>
  );
}
