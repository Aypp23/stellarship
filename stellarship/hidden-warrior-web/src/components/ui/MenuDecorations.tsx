import React from 'react';

export const MenuDecorations = () => {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Top Left Corner Ornament */}
            <svg className="absolute top-8 left-8 w-32 h-32 text-white/10" viewBox="0 0 100 100" fill="none">
                <path d="M2,2 L30,2" stroke="currentColor" strokeWidth="1" />
                <path d="M2,2 L2,30" stroke="currentColor" strokeWidth="1" />
                <rect x="2" y="2" width="4" height="4" fill="currentColor" />
                <path d="M8,8 L20,8 L8,20 Z" fill="currentColor" opacity="0.5" />
            </svg>

            {/* Top Right Corner Ornament */}
            <svg className="absolute top-8 right-8 w-32 h-32 text-white/10 rotate-90" viewBox="0 0 100 100" fill="none">
                <path d="M2,2 L30,2" stroke="currentColor" strokeWidth="1" />
                <path d="M2,2 L2,30" stroke="currentColor" strokeWidth="1" />
                <rect x="2" y="2" width="4" height="4" fill="currentColor" />
                <path d="M8,8 L20,8 L8,20 Z" fill="currentColor" opacity="0.5" />
            </svg>

            {/* Bottom Left Corner Ornament */}
            <svg className="absolute bottom-6 left-8 w-32 h-32 text-white/10 -rotate-90" viewBox="0 0 100 100" fill="none">
                <path d="M2,2 L30,2" stroke="currentColor" strokeWidth="1" />
                <path d="M2,2 L2,30" stroke="currentColor" strokeWidth="1" />
                <rect x="2" y="2" width="4" height="4" fill="currentColor" />
                <path d="M8,8 L20,8 L8,20 Z" fill="currentColor" opacity="0.5" />
            </svg>

            {/* Bottom Right Corner Ornament */}
            <svg className="absolute bottom-6 right-8 w-32 h-32 text-white/10 rotate-180" viewBox="0 0 100 100" fill="none">
                <path d="M2,2 L30,2" stroke="currentColor" strokeWidth="1" />
                <path d="M2,2 L2,30" stroke="currentColor" strokeWidth="1" />
                <rect x="2" y="2" width="4" height="4" fill="currentColor" />
                <path d="M8,8 L20,8 L8,20 Z" fill="currentColor" opacity="0.5" />
            </svg>

            {/* Subtle Vertical Lines */}
            <div className="absolute top-0 bottom-0 left-24 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent" />
            <div className="absolute top-0 bottom-0 right-24 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        </div>
    );
};
