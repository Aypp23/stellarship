import React from 'react';
import { useSound } from '@/hooks/useSound';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  active?: boolean;
}

const PixelButton: React.FC<PixelButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  active = false,
  onClick,
  onMouseEnter,
  ...props
}) => {
  const { playButtonSound, playHoverSound } = useSound();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      playButtonSound();
    }
    onClick?.(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      playHoverSound();
    }
    onMouseEnter?.(e);
  };
  const baseClasses = 'font-bold uppercase border-2 transition-all duration-100 focus:outline-none select-none';
  
  const variantClasses = {
    primary: 'bg-purple-600 text-white border-gray-400 hover:border-yellow-500',
    secondary: 'bg-gray-700 text-white border-gray-400 hover:border-yellow-500',
    tertiary: 'bg-green-600 text-white border-green-400 hover:border-green-300',
    danger: 'bg-red-600 text-white border-gray-400 hover:border-yellow-500',
    ghost: 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400',
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${active ? 'ring-2 ring-yellow-500' : ''}
        ${className}
      `}
      disabled={disabled}
      aria-pressed={active}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </button>
  );
};

export default PixelButton;

