import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, required, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <input
                    ref={ref}
                    required={required}
                    className={`w-full border rounded-lg p-2.5 text-sm outline-none transition-colors 
                        ${error ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'} 
                        ${className}`}
                    {...props}
                />
                {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export const Label = ({ className = '', children, required, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) => (
    <label className={`block text-xs font-bold text-gray-500 mb-1 ${className}`} {...props}>
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);
