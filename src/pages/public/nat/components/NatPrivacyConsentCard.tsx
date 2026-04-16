import React from 'react';
import { Check, ChevronDown, Info } from 'lucide-react';
import { FieldErrorText } from './steps/shared';

export interface NatPrivacyConsentCardProps {
  collapsible?: boolean;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  isAgreed: boolean;
  onChange: (checked: boolean) => void;
  errorMessage?: string;
}

export default function NatPrivacyConsentCard({
  collapsible = false,
  isOpen = false,
  onToggleOpen,
  isAgreed,
  onChange,
  errorMessage
}: NatPrivacyConsentCardProps) {
  if (collapsible) {
    return (
      <div className="nat-mobile-privacy mt-3 overflow-hidden rounded-2xl border border-white bg-white/40 shadow-lg shadow-blue-900/5 backdrop-blur-2xl">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-800">Data Privacy Disclaimer</span>
            {isAgreed ? (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                <Check className="h-3 w-3 text-white" />
              </span>
            ) : null}
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4">
            <div className={`relative overflow-hidden rounded-xl border p-4 ${errorMessage ? 'border-red-200 bg-red-50/70' : 'border-blue-100 bg-blue-50/50'}`}>
              <p className="mb-3 text-justify text-xs font-medium leading-relaxed text-slate-600">
                By submitting this application, I hereby authorize the NORSU CARE Center and concerned university offices to collect, process, and utilize the information provided herein for admission evaluation, guidance services, research, and other school-related programs and activities, in accordance with the Data Privacy Act of 2012.
              </p>
              <label className={`flex w-fit cursor-pointer items-center gap-2.5 rounded-xl border bg-white p-3 transition-all ${errorMessage ? 'border-red-200 hover:bg-red-50' : 'border-white/60 hover:bg-blue-50'}`}>
                <div className={`flex h-5 w-5 items-center justify-center rounded border-2 shadow-sm transition-all ${isAgreed ? 'border-blue-600 bg-blue-600' : errorMessage ? 'border-red-300' : 'border-slate-300'}`}>
                  {isAgreed ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                </div>
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(event) => onChange(event.target.checked)}
                  className="hidden"
                />
                <span className="text-sm font-bold text-slate-800">I agree to the terms and conditions</span>
              </label>
              <FieldErrorText message={errorMessage} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nat-section-card nat-sidebar-card relative overflow-hidden rounded-[2rem] border border-white bg-white/40 p-5 shadow-xl shadow-blue-900/5 backdrop-blur-2xl">
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-blue-400 to-indigo-500" />
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-800">
        <Info className="h-3 w-3 text-blue-500" />
        Data Privacy Disclaimer
      </h4>
      <p className="mb-3 text-justify text-[11px] font-medium leading-relaxed text-slate-600">
        By submitting this application, I hereby authorize the NORSU CARE Center and concerned university offices to collect, process, and utilize the information provided herein for admission evaluation, guidance services, research, and other school-related programs and activities, in accordance with the Data Privacy Act of 2012.
      </p>
      <label className={`group/check flex w-fit cursor-pointer items-center gap-2 rounded-lg border bg-white/50 p-2.5 transition-all ${errorMessage ? 'border-red-200 hover:bg-red-50' : 'border-white/60 hover:bg-white'}`}>
        <div className={`flex h-4 w-4 items-center justify-center rounded border-2 shadow-sm transition-all ${isAgreed ? 'border-blue-600 bg-blue-600' : errorMessage ? 'border-red-300' : 'border-slate-300 group-hover/check:border-blue-400'}`}>
          {isAgreed ? <Check className="h-3 w-3 text-white" /> : null}
        </div>
        <input
          type="checkbox"
          checked={isAgreed}
          onChange={(event) => onChange(event.target.checked)}
          className="hidden"
        />
        <span className="text-xs font-bold text-slate-800">I agree to the terms and conditions</span>
      </label>
      <FieldErrorText message={errorMessage} />
    </div>
  );
}
