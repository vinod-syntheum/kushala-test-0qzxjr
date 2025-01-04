'use client';

import React from 'react'; // v18.0.0
import Loading from '../../components/common/Loading';

/**
 * Dashboard loading component that provides visual feedback during page loading
 * and data fetching operations. Implements Next.js 14 loading state conventions
 * with a centered, large loading spinner and contextual feedback.
 * 
 * @returns {JSX.Element} A centered loading spinner with contextual text
 */
export default function Loading(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loading 
        size="large"
        text="Loading dashboard..."
      />
    </div>
  );
}