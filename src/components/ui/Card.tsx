import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', children, hoverEffect = false, ...props }, ref) => {
        const baseStyle = "bg-white border border-gray-100 rounded-2xl shadow-sm";
        const hoverStyle = hoverEffect ? "hover:shadow-md transition-shadow duration-200 cursor-pointer" : "";

        return (
            <div ref={ref} className={`${baseStyle} ${hoverStyle} ${className}`} {...props}>
                {children}
            </div>
        );
    }
);
Card.displayName = 'Card';

export const CardHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`p-6 border-b border-gray-50 flex justify-between items-center ${className}`} {...props}>
        {children}
    </div>
);

export const CardTitle = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={`font-bold text-gray-900 ${className}`} {...props}>
        {children}
    </h3>
);

export const CardContent = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`p-6 ${className}`} {...props}>
        {children}
    </div>
);
