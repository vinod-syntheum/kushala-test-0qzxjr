import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import type { TabProps } from '../../types/common';

/**
 * Enhanced tab component with accessibility, mobile support, and animations
 * @version 1.0.0
 */
export const Tabs: React.FC<TabProps> = ({
  tabs,
  activeTab: controlledActiveTab,
  defaultActiveTab = 0,
  onChange,
  onBeforeChange,
  className = '',
  transitionDuration = 200,
  lazy = false,
}) => {
  // Refs for DOM elements
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Touch interaction state
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  
  // State management
  const [activeTab, setActiveTab] = useState<number>(
    typeof controlledActiveTab !== 'undefined' ? controlledActiveTab : defaultActiveTab
  );
  const [loadedTabs, setLoadedTabs] = useState<Set<number>>(
    new Set(lazy ? [activeTab] : tabs.map((_, i) => i))
  );

  // Update active tab when controlled value changes
  useEffect(() => {
    if (typeof controlledActiveTab !== 'undefined') {
      setActiveTab(controlledActiveTab);
    }
  }, [controlledActiveTab]);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!lazy) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-tab-index'));
            setLoadedTabs((prev) => new Set([...prev, index]));
          }
        });
      },
      { rootMargin: '50px' }
    );

    panelRefs.current.forEach((panel, index) => {
      if (panel && !loadedTabs.has(index)) {
        observer.observe(panel);
      }
    });

    return () => observer.disconnect();
  }, [lazy, loadedTabs]);

  // Handle tab change
  const handleTabChange = useCallback((index: number) => {
    if (tabs[index]?.disabled) return;

    const canChange = onBeforeChange?.(activeTab, index) ?? true;
    if (!canChange) return;

    if (typeof controlledActiveTab === 'undefined') {
      setActiveTab(index);
    }
    onChange?.(index);
  }, [activeTab, controlledActiveTab, onChange, onBeforeChange, tabs]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key } = event;
    let nextIndex = activeTab;

    switch (key) {
      case 'ArrowLeft':
        nextIndex = activeTab - 1;
        if (nextIndex < 0) nextIndex = tabs.length - 1;
        break;
      case 'ArrowRight':
        nextIndex = activeTab + 1;
        if (nextIndex >= tabs.length) nextIndex = 0;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    // Skip disabled tabs
    while (tabs[nextIndex]?.disabled) {
      nextIndex = key === 'ArrowLeft' ? nextIndex - 1 : nextIndex + 1;
      if (nextIndex < 0) nextIndex = tabs.length - 1;
      if (nextIndex >= tabs.length) nextIndex = 0;
    }

    event.preventDefault();
    handleTabChange(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }, [activeTab, handleTabChange, tabs]);

  // Touch event handlers
  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    touchEndX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeDistance = touchEndX.current - touchStartX.current;
    const threshold = 50;

    if (Math.abs(swipeDistance) > threshold) {
      const nextIndex = swipeDistance > 0 
        ? Math.max(0, activeTab - 1)
        : Math.min(tabs.length - 1, activeTab + 1);
      handleTabChange(nextIndex);
    }
  };

  return (
    <div 
      className={`tabs-container ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={tabListRef}
        role="tablist"
        className="tabs-list"
        aria-label="Content Tabs"
      >
        {tabs.map((tab, index) => (
          <button
            key={`tab-${index}`}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`panel-${index}`}
            id={`tab-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            className={`tab-button ${activeTab === index ? 'active' : ''} ${
              tab.disabled ? 'disabled' : ''
            }`}
            onClick={() => handleTabChange(index)}
            onKeyDown={handleKeyDown}
            disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={`panel-${index}`}
          ref={(el) => (panelRefs.current[index] = el)}
          role="tabpanel"
          id={`panel-${index}`}
          aria-labelledby={`tab-${index}`}
          hidden={activeTab !== index}
          className="tab-panel"
          data-tab-index={index}
          style={{
            transition: `opacity ${transitionDuration}ms ease-in-out`,
            opacity: activeTab === index ? 1 : 0,
          }}
        >
          <ErrorBoundary
            fallback={
              <div className="tab-error">
                Error loading tab content. Please try again.
              </div>
            }
          >
            {(!lazy || loadedTabs.has(index)) && tab.content}
          </ErrorBoundary>
        </div>
      ))}
    </div>
  );
};

export default Tabs;