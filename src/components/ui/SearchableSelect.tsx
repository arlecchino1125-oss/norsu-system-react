import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
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
}

export default function SearchableSelect({
    label,
    value,
    options,
    onChange,
    placeholder = 'Select an option',
    required = false,
    searchable = true,
    className = ''
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.15em]">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            </div>

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`group w-full px-4 py-2.5 bg-slate-50 border rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200 ${
                    isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/5 bg-white' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-xs font-bold truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-700'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : 'group-hover:text-slate-400'}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 4, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-[100] w-full bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-indigo-900/10 overflow-hidden flex flex-col max-h-[250px]"
                    >
                        {searchable && (
                            <div className="p-2 border-b border-slate-50 bg-slate-50/50 sticky top-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full pl-9 pr-8 py-2 bg-white border border-slate-100 rounded-lg text-xs font-semibold outline-none focus:border-indigo-400 transition-all"
                                        placeholder={`Search...`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="overflow-y-auto flex-grow custom-scrollbar p-1">
                            {filteredOptions.length > 0 ? (
                                <div className="space-y-0.5">
                                    {filteredOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(option.value);
                                            }}
                                            className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-all ${
                                                value === option.value
                                                    ? 'bg-indigo-600 text-white font-bold'
                                                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                                            }`}
                                        >
                                            <span className="truncate pr-4">{option.label}</span>
                                            {value === option.value && <Check className="w-3 h-3" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 text-center">
                                    <p className="text-[10px] text-slate-400 font-bold italic">No results</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
