import React from 'react';

interface LoadingProps {
  /**
   * Controls the size of the loading spinner and text
   * @default "medium"
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Loading message displayed below spinner and announced by screen readers
   * @default "Loading..."
   */
  text?: string;
  
  /**
   * Additional CSS classes for custom styling
   * @default ""
   */
  className?: string;
}

/**
 * A highly reusable loading spinner component with GPU-accelerated animations
 * and full accessibility support. Provides visual feedback during async operations.
 * 
 * @version React 18.0.0
 */
const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  text = 'Loading...',
  className = '',
}) => {
  // Size-based classes mapping for spinner
  const spinnerSizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4'
  };

  // Size-based classes mapping for text
  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  // Support for reduced motion preferences
  const reducedMotionClass = 
    '@media (prefers-reduced-motion: reduce) { animation-duration: 1.5s; }';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`flex flex-col items-center justify-center ${className}`}
    >
      <div
        className={`
          animate-spin 
          rounded-full 
          border-t-2 
          border-b-2 
          border-primary 
          transform-gpu
          ${spinnerSizeClasses[size]}
        `}
        style={{
          willChange: 'transform',
          animationDuration: '0.8s',
          animationTimingFunction: 'linear',
        }}
      >
        {/* Hidden text for screen readers */}
        <span className="sr-only">{text}</span>
      </div>
      
      {/* Visible loading text */}
      <span 
        className={`
          mt-2 
          text-gray-600 
          font-medium
          ${textSizeClasses[size]}
        `}
        aria-hidden="true"
      >
        {text}
      </span>

      {/* Inject reduced motion styles */}
      <style jsx>{reducedMotionClass}</style>
    </div>
  );
};

export default Loading;