import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', fullWidth = false, children, ...props }, ref) => {
    
    let variantStyles = '';
    switch (variant) {
      case 'primary':
        variantStyles = 'bg-on-surface text-surface-container-lowest hover:opacity-90';
        break;
      case 'secondary':
        variantStyles = 'bg-surface-container text-on-surface hover:bg-surface-container-high';
        break;
      case 'outline':
        variantStyles = 'border-outline-variant border text-on-surface hover:bg-surface-container-low';
        break;
    }

    return (
      <button
        ref={ref}
        className={`px-6 py-3 rounded-sm flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest uppercase transition-all ${variantStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
