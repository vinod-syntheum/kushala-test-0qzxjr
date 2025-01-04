'use client';

import React from 'react'; // v18.0.0
import Loading from '../components/common/Loading';

/**
 * Next.js 14 loading component for route segments that provides a full-page loading state
 * during data fetching and page transitions. Implements performance optimizations and
 * accessibility best practices.
 * 
 * @returns {JSX.Element} Full-page loading component with centered content
 */
const RouteLoading: React.FC = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-white/30
        backdrop-blur-sm
        transition-all
        duration-300
        fixed
        inset-0
        z-50
      "
    >
      <div 
        className="
          transform-gpu
          will-change-transform
          animate-fade-in
          duration-300
        "
      >
        <Loading 
          size="large"
          text="Loading..."
        />
      </div>
    </div>
  );
};

export default RouteLoading;