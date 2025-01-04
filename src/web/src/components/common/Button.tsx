import React from 'react'; // v18.x
import classNames from 'classnames'; // v2.x
import Loading from './Loading';

export interface ButtonProps {
  /** Button content supporting text, icons, and complex layouts */
  children: React.ReactNode;
  /** Visual style variant with consistent hover and active states */
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  /** Size variant meeting WCAG touch target guidelines */
  size?: 'sm' | 'md' | 'lg';
  /** Controls full-width layout with consistent padding */
  fullWidth?: boolean;
  /** Disabled state with ARIA attributes and visual feedback */
  disabled?: boolean;
  /** Loading state with size-matched spinner and ARIA updates */
  loading?: boolean;
  /** HTML button type for form integration */
  type?: 'button' | 'submit' | 'reset';
  /** Click handler with event type safety */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Additional CSS classes with proper merging */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** ID reference for extended descriptions */
  ariaDescribedBy?: string;
}

/**
 * A fully featured button component with GPU-accelerated transitions,
 * ARIA support, and comprehensive state handling
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  className = '',
  ariaLabel,
  ariaDescribedBy,
}) => {
  // Base styles with GPU acceleration
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded focus:outline-none focus:ring-2 transition-colors transform-gpu';

  // Variant-specific styles
  const variantStyles = {
    primary: 'bg-accent-color text-white hover:bg-accent-color-dark active:bg-accent-color-darker',
    secondary: 'bg-secondary-color text-white hover:bg-secondary-color-dark active:bg-secondary-color-darker',
    outline: 'border-2 border-accent-color text-accent-color hover:bg-accent-color/10 active:bg-accent-color/20',
    text: 'text-accent-color hover:bg-accent-color/10 active:bg-accent-color/20'
  };

  // Size-specific styles meeting WCAG touch target guidelines
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px] min-w-[32px]',
    md: 'px-4 py-2 text-base min-h-[40px] min-w-[40px]',
    lg: 'px-6 py-3 text-lg min-h-[48px] min-w-[48px]'
  };

  // Loading spinner size mapping
  const spinnerSizeMap = {
    sm: 'small',
    md: 'medium',
    lg: 'large'
  } as const;

  // Compute final className with proper precedence
  const buttonClasses = classNames(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    {
      'w-full': fullWidth,
      'opacity-50 cursor-not-allowed pointer-events-none': disabled,
      'cursor-wait pointer-events-none': loading
    },
    className
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      style={{ willChange: 'transform' }}
    >
      {loading ? (
        <>
          <Loading 
            size={spinnerSizeMap[size]} 
            className="mr-2"
          />
          <span className="sr-only">Loading</span>
        </>
      ) : children}
    </button>
  );
};

export default Button;