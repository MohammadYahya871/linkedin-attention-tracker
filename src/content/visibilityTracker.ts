/**
 * Visibility tracker - uses IntersectionObserver to track post visibility and dwell time
 */

import { debounce } from '../utils/debounce.js';
import { logger } from '../utils/logger.js';

export interface VisibilityState {
  isVisible: boolean;
  visibilityPercent: number;
  firstSeenAt: number;
  totalVisibleTime: number;
  lastVisibilityChange: number;
}

export type VisibilityCallback = (
  element: Element,
  state: VisibilityState,
  entry: IntersectionObserverEntry
) => void;

/** Throttle interval for scroll speed calculation (ms) */
const SCROLL_THROTTLE = 100;

/** Minimum scroll delta to count as movement */
const MIN_SCROLL_DELTA = 5;

export class VisibilityTracker {
  private observer: IntersectionObserver | null = null;
  private elementStates = new Map<Element, VisibilityState>();
  private callbacks = new Set<VisibilityCallback>();
  private scrollLastY = 0;
  private scrollLastTime = 0;
  private scrollSpeed = 0;
  private scrollThrottled: () => void;

  constructor() {
    this.scrollThrottled = debounce(() => this.updateScrollSpeed(), SCROLL_THROTTLE);
  }

  /**
   * Start tracking scroll for velocity calculation
   */
  startScrollTracking(): void {
    this.scrollLastY = window.scrollY;
    this.scrollLastTime = Date.now();
    window.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  private handleScroll = (): void => {
    this.scrollThrottled();
  };

  private updateScrollSpeed(): void {
    const now = Date.now();
    const y = window.scrollY;
    const deltaY = Math.abs(y - this.scrollLastY);
    const deltaT = (now - this.scrollLastTime) / 1000;

    if (deltaY > MIN_SCROLL_DELTA && deltaT > 0) {
      this.scrollSpeed = deltaY / deltaT;
    } else if (deltaT > 1) {
      this.scrollSpeed *= 0.5; // Decay when idle
    }

    this.scrollLastY = y;
    this.scrollLastTime = now;
  }

  getScrollSpeed(): number {
    return this.scrollSpeed;
  }

  /**
   * Register callback for visibility changes
   */
  onVisibilityChange(cb: VisibilityCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  /**
   * Start observing an element
   */
  observe(element: Element): void {
    if (this.elementStates.has(element)) return;

    const state: VisibilityState = {
      isVisible: false,
      visibilityPercent: 0,
      firstSeenAt: Date.now(),
      totalVisibleTime: 0,
      lastVisibilityChange: Date.now()
    };
    this.elementStates.set(element, state);

    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => this.handleIntersection(entries),
        {
          root: null,
          rootMargin: '0px',
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
        }
      );
      this.startScrollTracking();
    }

    this.observer.observe(element);
  }

  /**
   * Stop observing an element
   */
  unobserve(element: Element): void {
    const state = this.elementStates.get(element);
    if (state) {
      this.elementStates.delete(element);
      this.observer?.unobserve(element);
    }
  }

  /**
   * Get current state for an element
   */
  getState(element: Element): VisibilityState | undefined {
    return this.elementStates.get(element);
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    const now = Date.now();

    for (const entry of entries) {
      const element = entry.target;
      const state = this.elementStates.get(element);
      if (!state) continue;

      const visibilityPercent = Math.round((entry.intersectionRatio || 0) * 100);

      // Accumulate visible time if was visible
      if (state.isVisible) {
        state.totalVisibleTime += (now - state.lastVisibilityChange) / 1000;
      }

      state.isVisible = visibilityPercent > 5;
      state.visibilityPercent = visibilityPercent;
      state.lastVisibilityChange = now;

      this.callbacks.forEach((cb) => cb(element, state, entry));
    }
  }

  /**
   * Cleanup - disconnect observer and remove listeners
   */
  destroy(): void {
    window.removeEventListener('scroll', this.handleScroll);
    this.observer?.disconnect();
    this.observer = null;
    this.elementStates.clear();
    this.callbacks.clear();
    logger.debug('VisibilityTracker destroyed');
  }
}
