import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
        // Base styles
        const baseStyle = "inline-flex items-center justify-center font-bold transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed";

        // Variants
        const variants = {
            primary: "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-500/20 hover:shadow-lg hover:-translate-y-0.5",
            secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
            danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
            ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        };

        // Sizes
        const sizes = {
            sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
            md: "text-sm px-4 py-2 rounded-xl gap-2",
            lg: "text-base px-6 py-3 rounded-xl gap-2",
        };

        const combinedClassName = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`;

        return (
            <button
                ref={ref}
                className={combinedClassName}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} />}
                {!isLoading && leftIcon}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';
