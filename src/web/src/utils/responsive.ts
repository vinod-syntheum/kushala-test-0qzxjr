/**
 * Advanced utility module providing responsive design capabilities, device detection,
 * viewport management, and preview scaling functionality.
 * @version 1.0.0
 */

import { debounce, memoize } from 'lodash'; // v4.17.21
import { EventEmitter } from 'events'; // v3.3.0
import { ApiResponse } from '../types/common';

/**
 * Standardized breakpoint values in pixels
 */
export enum BREAKPOINTS {
  MOBILE = 320,
  TABLET = 768,
  DESKTOP = 1024,
  WIDE = 1440
}

/**
 * Device type enumeration for type-safe device detection
 */
export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  WIDE = 'wide'
}

/**
 * Scale limits for responsive preview modes
 */
const SCALE_LIMITS = {
  MIN: 0.25,
  MAX: 2.0
} as const;

/**
 * Interface for viewport dimensions with pixel density
 */
interface ViewportDimensions {
  width: number;
  height: number;
  density: number;
}

/**
 * Type for viewport change event handlers
 */
type ViewportChangeHandler = (dimensions: ViewportDimensions) => void;

/**
 * Determines current device type based on viewport width
 * @param width - Current viewport width
 * @returns DeviceType enum value
 */
export const getDeviceType = (width: number): DeviceType => {
  if (!width || width < 0) {
    throw new Error('Invalid viewport width');
  }

  if (width < BREAKPOINTS.TABLET) return DeviceType.MOBILE;
  if (width < BREAKPOINTS.DESKTOP) return DeviceType.TABLET;
  if (width < BREAKPOINTS.WIDE) return DeviceType.DESKTOP;
  return DeviceType.WIDE;
};

/**
 * Retrieves current viewport dimensions with density ratio
 * @returns ViewportDimensions object
 */
export const getViewportDimensions = (): ViewportDimensions => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0, density: 1 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    density: window.devicePixelRatio || 1
  };
};

/**
 * Calculates scale factor for responsive preview modes
 * @param targetDevice - Target device type for preview
 * @param containerWidth - Width of preview container
 * @returns Validated scale factor
 */
export const calculateResponsiveScale = (
  targetDevice: DeviceType,
  containerWidth: number
): number => {
  if (!containerWidth || containerWidth <= 0) {
    throw new Error('Invalid container width');
  }

  const targetWidth = BREAKPOINTS[targetDevice.toUpperCase() as keyof typeof BREAKPOINTS];
  const scale = containerWidth / targetWidth;

  return Math.min(
    Math.max(scale, SCALE_LIMITS.MIN),
    SCALE_LIMITS.MAX
  );
};

/**
 * Memoized breakpoint matching function
 */
export const isBreakpoint = memoize(
  (breakpoint: keyof typeof BREAKPOINTS): boolean => {
    const { width } = getViewportDimensions();
    return width >= BREAKPOINTS[breakpoint];
  },
  (breakpoint: string) => `${breakpoint}-${getViewportDimensions().width}`
);

/**
 * Enhanced viewport management with event emission and memory optimization
 */
export class ViewportManager {
  private currentWidth: number;
  private currentHeight: number;
  private currentDeviceType: DeviceType;
  private pixelDensity: number;
  private readonly eventEmitter: EventEmitter;
  private resizeObserver: ResizeObserver | null = null;
  private readonly debouncedUpdate: () => void;

  constructor() {
    const dimensions = getViewportDimensions();
    this.currentWidth = dimensions.width;
    this.currentHeight = dimensions.height;
    this.pixelDensity = dimensions.density;
    this.currentDeviceType = getDeviceType(dimensions.width);
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(20); // Increase max listeners for larger applications

    // Debounced update function
    this.debouncedUpdate = debounce(
      () => this.updateViewport(),
      150,
      { leading: true, trailing: true }
    );

    // Setup resize handling
    if (typeof window !== 'undefined') {
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(this.debouncedUpdate);
        this.resizeObserver.observe(document.documentElement);
      } else {
        window.addEventListener('resize', this.debouncedUpdate);
      }
    }
  }

  /**
   * Updates viewport state with change detection
   */
  public updateViewport(): void {
    const dimensions = getViewportDimensions();
    const newDeviceType = getDeviceType(dimensions.width);

    const hasChanged = 
      this.currentWidth !== dimensions.width ||
      this.currentHeight !== dimensions.height ||
      this.pixelDensity !== dimensions.density ||
      this.currentDeviceType !== newDeviceType;

    if (hasChanged) {
      this.currentWidth = dimensions.width;
      this.currentHeight = dimensions.height;
      this.pixelDensity = dimensions.density;
      this.currentDeviceType = newDeviceType;

      this.eventEmitter.emit('viewportChange', {
        width: this.currentWidth,
        height: this.currentHeight,
        density: this.pixelDensity,
        deviceType: this.currentDeviceType
      });
    }
  }

  /**
   * Registers viewport change event handler
   * @param handler - Callback function for viewport changes
   */
  public on(handler: ViewportChangeHandler): void {
    this.eventEmitter.on('viewportChange', handler);
  }

  /**
   * Removes viewport change event handler
   * @param handler - Handler to remove
   */
  public off(handler: ViewportChangeHandler): void {
    this.eventEmitter.off('viewportChange', handler);
  }

  /**
   * Gets current viewport state
   */
  public getState(): ViewportDimensions & { deviceType: DeviceType } {
    return {
      width: this.currentWidth,
      height: this.currentHeight,
      density: this.pixelDensity,
      deviceType: this.currentDeviceType
    };
  }

  /**
   * Comprehensive cleanup of listeners and observers
   */
  public cleanup(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.debouncedUpdate);
    }

    this.debouncedUpdate.cancel();
    this.eventEmitter.removeAllListeners();
  }
}

// Export singleton instance for global viewport management
export const viewportManager = new ViewportManager();