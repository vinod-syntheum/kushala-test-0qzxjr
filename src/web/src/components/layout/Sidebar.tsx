import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames'; // v2.3.2
import Link from 'next/link'; // v14.0.0
import { useRouter } from 'next/router'; // v14.0.0
import { Button, ButtonProps } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';

// Navigation item type definition
interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  requiredPermission: string;
  analyticsId: string;
}

// Props interface with comprehensive options
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  defaultExpanded?: boolean;
  onNavigate?: (path: string) => void;
  errorBoundary?: boolean;
}

// Navigation items with role-based access control
const SIDEBAR_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    requiredPermission: 'view:dashboard',
    analyticsId: 'nav_dashboard'
  },
  {
    label: 'Website Builder',
    path: '/dashboard/website',
    icon: 'website',
    requiredPermission: 'edit:website',
    analyticsId: 'nav_website'
  },
  {
    label: 'Event Manager',
    path: '/dashboard/events',
    icon: 'events',
    requiredPermission: 'manage:events',
    analyticsId: 'nav_events'
  },
  {
    label: 'Location Manager',
    path: '/dashboard/locations',
    icon: 'locations',
    requiredPermission: 'manage:locations',
    analyticsId: 'nav_locations'
  }
];

/**
 * Enhanced sidebar component with role-based access control, responsive design,
 * and accessibility features for the dashboard layout.
 */
const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  className = '',
  defaultExpanded = true,
  onNavigate,
  errorBoundary = true
}) => {
  const router = useRouter();
  const { user, isAuthenticated, userPermissions } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Enhanced route matching with support for nested routes
   */
  const isActiveRoute = useCallback((path: string, exact = false): boolean => {
    const currentPath = router.asPath;
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  }, [router.asPath]);

  /**
   * Filter navigation items based on user permissions
   */
  const filteredItems = SIDEBAR_ITEMS.filter(item => {
    if (!isAuthenticated || !user) return false;
    return userPermissions?.includes(item.requiredPermission);
  });

  /**
   * Handle navigation with analytics tracking
   */
  const handleNavigate = useCallback((path: string, analyticsId: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
    // Track navigation event
    try {
      window.gtag?.('event', 'navigation', {
        event_category: 'sidebar',
        event_label: analyticsId
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }, [onNavigate]);

  // Base styles with GPU acceleration
  const sidebarClasses = classNames(
    'fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-40 transform will-change-transform',
    {
      'w-64': !isCollapsed,
      'w-20': isCollapsed,
      '-translate-x-full md:translate-x-0': !mounted
    },
    className
  );

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <aside
      className={sidebarClasses}
      aria-expanded={!isCollapsed}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <Link 
            href="/dashboard"
            className="flex items-center space-x-2"
            onClick={() => handleNavigate('/dashboard', 'nav_logo')}
          >
            {!isCollapsed && (
              <span className="font-semibold text-lg">Restaurant Dashboard</span>
            )}
          </Link>
          <Button
            variant="text"
            size="sm"
            onClick={onToggle}
            ariaLabel={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="focus:ring-accent-color"
          >
            <span className="sr-only">
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </span>
            <svg
              className={classNames('w-6 h-6 transition-transform', {
                'rotate-180': isCollapsed
              })}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
              />
            </svg>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 overscroll-contain">
          {filteredItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => handleNavigate(item.path, item.analyticsId)}
              className={classNames(
                'flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-color',
                {
                  'text-accent-color bg-accent-color/10 font-medium': isActiveRoute(item.path),
                  'justify-center': isCollapsed
                }
              )}
              aria-current={isActiveRoute(item.path) ? 'page' : undefined}
            >
              <span className={classNames('w-6 h-6 transition-transform', {
                'mr-3': !isCollapsed
              })}>
                {/* Icon component based on item.icon */}
                <i className={`icon-${item.icon}`} aria-hidden="true" />
              </span>
              {!isCollapsed && (
                <span className="text-sm font-medium truncate">
                  {item.label}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t mt-auto">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => handleNavigate('/settings', 'nav_settings')}
            className="justify-center"
          >
            <span className="w-6 h-6 mr-2">
              <i className="icon-settings" aria-hidden="true" />
            </span>
            {!isCollapsed && <span>Settings</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;