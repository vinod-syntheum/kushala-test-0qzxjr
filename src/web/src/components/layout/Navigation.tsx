import React, { useState, useCallback, useEffect, memo } from 'react'; // v18.0.0
import Link from 'next/link'; // v14.0.0
import { useRouter } from 'next/router'; // v14.0.0
import classNames from 'classnames'; // v2.3.2
import { Button, ButtonProps } from '../common/Button';
import { Dropdown, DropdownProps } from '../common/Dropdown';
import { useAuth } from '../../hooks/useAuth';
import { DeviceType } from '../../utils/responsive';

export interface NavigationProps {
  className?: string;
  onNavigate?: (path: string) => void;
  analyticsEnabled?: boolean;
}

// Navigation items with role-based access control
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    requiredPermission: 'view:dashboard'
  },
  {
    label: 'Website',
    path: '/dashboard/website',
    icon: 'website',
    requiredPermission: 'edit:website'
  },
  {
    label: 'Events',
    path: '/dashboard/events',
    icon: 'events',
    requiredPermission: 'manage:events'
  },
  {
    label: 'Locations',
    path: '/dashboard/locations',
    icon: 'locations',
    requiredPermission: 'manage:locations'
  }
] as const;

// User menu items with role-based access
const USER_MENU_ITEMS = [
  {
    label: 'Profile',
    path: '/dashboard/profile',
    icon: 'profile',
    requiredPermission: 'edit:profile'
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: 'settings',
    requiredPermission: 'edit:settings'
  },
  {
    label: 'Help',
    path: '/help',
    icon: 'help'
  },
  {
    label: 'Logout',
    action: 'handleLogout',
    icon: 'logout'
  }
] as const;

const Navigation: React.FC<NavigationProps> = memo(({
  className = '',
  onNavigate,
  analyticsEnabled = false
}) => {
  const router = useRouter();
  const { user, isAuthenticated, logout, hasPermission } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Enhanced logout handler with error handling
  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await logout();
      if (analyticsEnabled) {
        // Track logout event
        window.gtag?.('event', 'logout', {
          event_category: 'authentication',
          event_label: user?.email
        });
      }
      await router.push('/login');
      setIsMobileMenuOpen(false);
    } catch (err) {
      setError(err as Error);
      console.error('Logout failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [logout, router, user, analyticsEnabled]);

  // Enhanced mobile menu toggle with analytics
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
    if (analyticsEnabled) {
      window.gtag?.('event', 'toggle_mobile_menu', {
        event_category: 'navigation',
        event_label: !isMobileMenuOpen ? 'open' : 'close'
      });
    }
  }, [isMobileMenuOpen, analyticsEnabled]);

  // Handle navigation with analytics
  const handleNavigation = useCallback((path: string) => {
    onNavigate?.(path);
    if (analyticsEnabled) {
      window.gtag?.('event', 'navigation', {
        event_category: 'navigation',
        event_label: path
      });
    }
  }, [onNavigate, analyticsEnabled]);

  // Close mobile menu on route change
  useEffect(() => {
    const handleRouteChange = () => setIsMobileMenuOpen(false);
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  // Render navigation items based on permissions
  const renderNavItems = useCallback((items: typeof NAV_ITEMS) => {
    return items.map(item => {
      if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
        return null;
      }

      const isActive = router.pathname === item.path;
      return (
        <Link
          key={item.path}
          href={item.path}
          onClick={() => handleNavigation(item.path)}
          className={classNames(
            'text-gray-700 hover:text-accent-color px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
            {
              'text-accent-color': isActive
            }
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          <span className={`icon-${item.icon} mr-2`} aria-hidden="true" />
          {item.label}
        </Link>
      );
    });
  }, [router.pathname, hasPermission, handleNavigation]);

  if (!isAuthenticated) return null;

  return (
    <nav
      className={classNames(
        'fixed top-0 left-0 right-0 bg-white shadow-sm z-50',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/dashboard" className="text-2xl font-bold text-accent-color">
              Logo
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {renderNavItems(NAV_ITEMS)}
            
            <Dropdown
              options={USER_MENU_ITEMS.map(item => ({
                value: item.path || item.action,
                label: item.label,
                disabled: item.requiredPermission ? !hasPermission(item.requiredPermission) : false
              }))}
              value=""
              onChange={(value) => {
                if (value === 'handleLogout') {
                  handleLogout();
                } else {
                  router.push(value);
                  handleNavigation(value);
                }
              }}
              className="relative ml-3"
              aria-label="User menu"
            />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="text-xl font-bold text-accent-color">
              Logo
            </Link>

            <Button
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              variant="text"
              className="p-2"
            >
              <span className={`icon-${isMobileMenuOpen ? 'close' : 'menu'}`} aria-hidden="true" />
            </Button>
          </div>

          {/* Mobile Menu */}
          <div
            id="mobile-menu"
            className={classNames(
              'fixed inset-0 bg-white z-50 transition-transform duration-200 ease-in-out transform',
              {
                'translate-x-0': isMobileMenuOpen,
                'translate-x-full': !isMobileMenuOpen
              }
            )}
          >
            <div className="pt-16 pb-3 space-y-1">
              {renderNavItems(NAV_ITEMS)}
              {USER_MENU_ITEMS.map(item => {
                if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
                  return null;
                }

                return (
                  <Button
                    key={item.label}
                    onClick={() => {
                      if (item.action === 'handleLogout') {
                        handleLogout();
                      } else {
                        router.push(item.path);
                        handleNavigation(item.path);
                      }
                    }}
                    variant="text"
                    fullWidth
                    className="justify-start px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
                    loading={item.action === 'handleLogout' && isLoading}
                  >
                    <span className={`icon-${item.icon} mr-2`} aria-hidden="true" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
        >
          {error.message}
          <Button
            onClick={() => setError(null)}
            variant="text"
            className="ml-2"
            aria-label="Dismiss error"
          >
            <span className="icon-close" aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;