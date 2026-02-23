import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface MedievalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'gold';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export const MedievalButton: React.FC<MedievalButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    type = 'button',
    disabled = false,
    ...props
}) => {
    const reduceMotion = useReducedMotion();
    const nativeButtonProps = props as any;

    // Base styles for the "physical" button feel
    const baseStyles = "relative group font-medieval uppercase tracking-wider transition-all duration-200 ease-out select-none overflow-hidden isolate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medieval-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:saturate-75";

    const variants = {
        primary: "bg-[#d4c5a0] text-[#2a2018] border-[#8a6a35] shadow-[0px_4px_0px_0px_#5c4033] hover:bg-[#e6d5b0] hover:-translate-y-0.5 hover:shadow-[0px_6px_0px_0px_#5c4033]",
        secondary: "bg-[#2a2018] text-[#d4c5a0] border-[#8a6a35] shadow-[0px_4px_0px_0px_#1a1412] hover:bg-[#3a2c22] hover:-translate-y-0.5 hover:shadow-[0px_6px_0px_0px_#1a1412]",
        danger: "bg-[#8a2c2c] text-[#f0e6cc] border-[#4a1515] shadow-[0px_4px_0px_0px_#4a1515] hover:bg-[#a03535] hover:-translate-y-0.5 hover:shadow-[0px_6px_0px_0px_#4a1515]",
        gold: "bg-gradient-to-b from-[#ffd700] to-[#daa520] text-[#2a2018] border-[#b8860b] shadow-[0px_4px_0px_0px_#8b4513] hover:from-[#ffe44d] hover:to-[#ffd700] hover:-translate-y-0.5 hover:shadow-[0px_6px_0px_0px_#8b4513]",
    };

    const sizes = {
        sm: "text-xs py-2 px-4 border-2 min-w-[100px]",
        md: "text-sm py-3 px-8 border-2 min-w-[140px]",
        lg: "text-base py-4 px-10 border-2 min-w-[180px]",
    };

    const width = fullWidth ? "w-full" : "";

    // SVG Flourish Component
    const Flourish = ({ className }: { className?: string }) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className={`absolute w-6 h-6 opacity-40 pointer-events-none transition-opacity duration-300 group-hover:opacity-80 ${className}`}
        >
            <path
                d="M12 2C12 2 11 6 7 8C3 10 2 12 2 12C2 12 6 11 8 15C10 19 12 22 12 22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M12 2C12 2 13 6 17 8C21 10 22 12 22 12C22 12 18 11 16 15C14 19 12 22 12 22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );

    // Corner Ornaments
    const Corner = ({ className }: { className?: string }) => (
        <svg
            viewBox="0 0 10 10"
            className={`absolute w-3 h-3 text-current opacity-60 ${className}`}
        >
            <path d="M1 1H9V9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="3" y="3" width="2" height="2" fill="currentColor" />
        </svg>
    );

    return (
        <motion.button
            type={type}
            disabled={disabled}
            whileHover={!disabled && !reduceMotion ? { y: -2, scale: 1.01 } : undefined}
            whileTap={!disabled && !reduceMotion ? { y: 2, scale: 0.985 } : undefined}
            transition={
                reduceMotion
                    ? { duration: 0.01 }
                    : { type: "spring", stiffness: 380, damping: 24, mass: 0.75 }
            }
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
            {...nativeButtonProps}
        >
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-10 bg-[url('/assets/arena-texture.png')] mix-blend-overlay pointer-events-none" />

            {/* Inner Border/Highlight */}
            <div className="absolute inset-[2px] border border-white/10 pointer-events-none" />

            {/* Corner Ornaments */}
            <Corner className="top-1 left-1" />
            <Corner className="top-1 right-1 rotate-90" />
            <Corner className="bottom-1 left-1 -rotate-90" />
            <Corner className="bottom-1 right-1 rotate-180" />

            {/* Decorative Flourishes - Only visible on larger buttons or specific variants if needed, 
                currently added to all for the requested style */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 group-focus-visible:opacity-10 transition-opacity duration-500 pointer-events-none">
                <Flourish className="text-current scale-150" />
            </div>

            {/* Content */}
            <span className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </span>
        </motion.button>
    );
};
