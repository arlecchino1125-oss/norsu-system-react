import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
    label: string;
    value: string;
}

interface SearchableSelectProps {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    searchable?: boolean;
    className?: string;
    disabled?: boolean;
    onDisabledClick?: () => void;
}

export default function SearchableSelect({
    label,
    value,
    options,
    onChange,
    placeholder = 'Select an option',
    required = false,
    searchable = true,
    className = '',
    disabled = false,
    onDisabledClick
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClick = () => {
        if (disabled) {
            if (onDisabledClick) onDisabledClick();
            return;
        }
        setIsOpen(true);
    };

    return (
        <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
            <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            </div>

            <button
                type="button"
                onClick={handleClick}
                className={`w-full px-4 py-3 sm:py-2.5 bg-slate-50 border rounded-xl text-left transition-all duration-200 flex items-center justify-between ${
                    disabled 
                        ? 'border-slate-200 cursor-not-allowed opacity-70' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-100 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none'
                }`}
            >
                <span className={`text-[16px] sm:text-sm truncate leading-5 ${!selectedOption ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
            </button>

            <AnimatePresence>
                {isOpen && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />
                        
                        {/* Modal Box */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2, type: 'spring', bounce: 0.25 }}
                            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-800">{placeholder}</h3>
                                <button type="button" onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {searchable && (
                                <div className="p-3 border-b border-slate-100 bg-white">
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            autoFocus
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400"
                                            placeholder={`Search...`}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="overflow-y-auto flex-grow custom-scrollbar p-2">
                                {filteredOptions.length > 0 ? (
                                    <div className="space-y-1">
                                        {filteredOptions.map((option) => (
                                            <div
                                                key={option.value}
                                                onClick={() => handleSelect(option.value)}
                                                className={`px-4 py-3 rounded-xl text-[15px] sm:text-sm cursor-pointer flex items-center justify-between transition-all ${
                                                    value === option.value
                                                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200'
                                                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 font-medium'
                                                }`}
                                            >
                                                <span className="truncate pr-4">{option.label}</span>
                                                {value === option.value && <Check className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                                            <Search className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <p className="text-sm text-slate-600 font-bold">No results found</p>
                                        <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </AnimatePresence>
        </div>
    );
}
