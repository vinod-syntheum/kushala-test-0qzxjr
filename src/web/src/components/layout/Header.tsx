import React, { useState, useCallback, useEffect, useRef, memo } from 'react'; // v18.0.0
import { useRouter } from 'next/router'; // v14.0.0
import Image from 'next/image'; // v14.0.0
import { useMediaQuery } from '@mui/material'; // v5.0.0
import { Navigation, NavigationProps } from './Navigation';
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';

export interface HeaderProps {
  className?: string;
  variant?: 'light' | 'dark';
}

/**
 * Enhanced header component with security, accessibility, and responsive features
 * Implements role-based access control and session monitoring
 */
const Header: React.FC<HeaderProps> = memo(({
  className = '',
  variant = 'light'
}) => {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user, isAuthenticated, logout, sessionStatus } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const touchStartY = useRef<number>(0);

  // Enhanced mobile menu handler with touch and accessibility support
  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen(prev => {
      const newState = !prev;
      // Manage body scroll lock
      document.body.style.overflow = newState ? 'hidden' : '';
      // Update ARIA attributes
      headerRef.current?.setAttribute('aria-expanded', String(newState));
      return newState;
    });
  }, []);

  // Handle scroll behavior with intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle touch interactions for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMobileMenuOpen) {
        const touchY = e.touches[0].clientY;
        const diff = touchStartY.current - touchY;

        if (diff > 50) { // Swipe up threshold
          handleMobileMenuToggle();
        }
      }
    };

    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isMobile, isMobileMenuOpen, handleMobileMenuToggle]);

  // Enhanced secure logout handler
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, router]);

  // Render optimized header layout
  return (
    <header
      ref={headerRef}
      className={`
        fixed top-0 left-0 right-0 z-50
        ${isScrolled ? 'shadow-md backdrop-blur-sm' : ''}
        ${variant === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}
        ${className}
      `}
      style={{
        height: isMobile ? '56px' : '64px',
        transform: 'translate3d(0,0,0)',
        backfaceVisibility: 'hidden'
      }}
      role="banner"
      aria-label="Main header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo with next/image optimization */}
          <div className="flex-shrink-0 relative w-[140px] h-[32px]">
            <Image
              src="/logo.svg"
              alt="Restaurant Website Builder"
              fill
              priority
              sizes="140px"
              className="object-contain"
            />
          </div>

          {/* Enhanced Navigation with role-based access */}
          <Navigation
            className="hidden md:flex"
            onNavigate={(path) => {
              router.push(path);
              setIsMobileMenuOpen(false);
            }}
            analyticsEnabled={true}
          />

          {/* Mobile menu button with accessibility */}
          {isMobile && (
            <Button
              onClick={handleMobileMenuToggle}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden p-2"
              variant="text"
            >
              <span 
                className={`icon-${isMobileMenuOpen ? 'close' : 'menu'}`}
                aria-hidden="true"
              />
            </Button>
          )}
        </div>

        {/* Mobile menu with animation and focus trap */}
        {isMobile && (
          <div
            id="mobile-menu"
            className={`
              fixed inset-0 bg-white z-50
              transition-transform duration-300 ease-in-out
              ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
            `}
            aria-hidden={!isMobileMenuOpen}
          >
            <div className="pt-16 pb-3 space-y-1">
              <Navigation
                className="flex flex-col"
                onNavigate={(path) => {
                  router.push(path);
                  setIsMobileMenuOpen(false);
                }}
                analyticsEnabled={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Session warning dialog */}
      {sessionStatus === 'expiring' && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded"
        >
          Your session is about to expire. Please save your work.
          <Button
            onClick={handleLogout}
            variant="text"
            className="ml-2"
            aria-label="End session"
          >
            Logout
          </Button>
        </div>
      )}
    </header>
  );
});

Header.displayName = 'Header';

export default Header;