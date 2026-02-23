import React from 'react';

interface MedievalPanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    variant?: 'default' | 'dark';
}

export const MedievalPanel: React.FC<MedievalPanelProps> = ({
    children,
    className = '',
    title,
    variant = 'default',
}) => {
    const baseStyles = "relative p-6 rounded-lg border border-medieval-border shadow-medieval transition-all duration-300";

    const variants = {
        default: "bg-medieval-panel bg-medieval-paper",
        dark: "bg-medieval-metal text-medieval-bg border-medieval-gold",
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`}>
            {/* Decorative Corner SVGs */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-medieval-border rounded-tl-lg opacity-50" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-medieval-border rounded-tr-lg opacity-50" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-medieval-border rounded-bl-lg opacity-50" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-medieval-border rounded-br-lg opacity-50" />

            {title && (
                <div className="mb-4 pb-2 border-b border-medieval-border/30 flex items-center justify-between">
                    <h3 className="font-medieval text-lg uppercase tracking-widest text-medieval-text opacity-80">
                        {title}
                    </h3>
                    <div className="h-1 w-1 rounded-full bg-medieval-accent opacity-50" />
                </div>
            )}

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
