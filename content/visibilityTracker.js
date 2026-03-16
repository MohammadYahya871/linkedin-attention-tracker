/**
 * Visibility tracker - uses IntersectionObserver to track post visibility and dwell time
 */
import { debounce } from '../utils/debounce.js';
import { logger } from '../utils/logger.js';
/** Throttle interval for scroll speed calculation (ms) */
const SCROLL_THROTTLE = 100;
/** Minimum scroll delta to count as movement */
const MIN_SCROLL_DELTA = 5;
export class VisibilityTracker {
    constructor() {
        this.observer = null;
        this.elementStates = new Map();
        this.callbacks = new Set();
        this.scrollLastY = 0;
        this.scrollLastTime = 0;
        this.scrollSpeed = 0;
        this.handleScroll = () => {
            this.scrollThrottled();
        };
        this.scrollThrottled = debounce(() => this.updateScrollSpeed(), SCROLL_THROTTLE);
    }
    /**
     * Start tracking scroll for velocity calculation
     */
    startScrollTracking() {
        this.scrollLastY = window.scrollY;
        this.scrollLastTime = Date.now();
        window.addEventListener('scroll', this.handleScroll, { passive: true });
    }
    updateScrollSpeed() {
        const now = Date.now();
        const y = window.scrollY;
        const deltaY = Math.abs(y - this.scrollLastY);
        const deltaT = (now - this.scrollLastTime) / 1000;
        if (deltaY > MIN_SCROLL_DELTA && deltaT > 0) {
            this.scrollSpeed = deltaY / deltaT;
        }
        else if (deltaT > 1) {
            this.scrollSpeed *= 0.5; // Decay when idle
        }
        this.scrollLastY = y;
        this.scrollLastTime = now;
    }
    getScrollSpeed() {
        return this.scrollSpeed;
    }
    /**
     * Register callback for visibility changes
     */
    onVisibilityChange(cb) {
        this.callbacks.add(cb);
        return () => this.callbacks.delete(cb);
    }
    /**
     * Start observing an element
     */
    observe(element) {
        if (this.elementStates.has(element))
            return;
        const state = {
            isVisible: false,
            visibilityPercent: 0,
            firstSeenAt: Date.now(),
            totalVisibleTime: 0,
            lastVisibilityChange: Date.now()
        };
        this.elementStates.set(element, state);
        if (!this.observer) {
            this.observer = new IntersectionObserver((entries) => this.handleIntersection(entries), {
                root: null,
                rootMargin: '0px',
                threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
            });
            this.startScrollTracking();
        }
        this.observer.observe(element);
    }
    /**
     * Stop observing an element
     */
    unobserve(element) {
        const state = this.elementStates.get(element);
        if (state) {
            this.elementStates.delete(element);
            this.observer?.unobserve(element);
        }
    }
    /**
     * Get current state for an element
     */
    getState(element) {
        return this.elementStates.get(element);
    }
    handleIntersection(entries) {
        const now = Date.now();
        for (const entry of entries) {
            const element = entry.target;
            const state = this.elementStates.get(element);
            if (!state)
                continue;
            const visibilityPercent = Math.round((entry.intersectionRatio || 0) * 100);
            // Accumulate visible time if was visible
            if (state.isVisible) {
                state.totalVisibleTime += (now - state.lastVisibilityChange) / 1000;
            }
            state.isVisible = visibilityPercent > 10;
            state.visibilityPercent = visibilityPercent;
            state.lastVisibilityChange = now;
            this.callbacks.forEach((cb) => cb(element, state, entry));
        }
    }
    /**
     * Cleanup - disconnect observer and remove listeners
     */
    destroy() {
        window.removeEventListener('scroll', this.handleScroll);
        this.observer?.disconnect();
        this.observer = null;
        this.elementStates.clear();
        this.callbacks.clear();
        logger.debug('VisibilityTracker destroyed');
    }
}
//# sourceMappingURL=visibilityTracker.js.map