/**
 * Post tracker - coordinates visibility tracking with dwell time threshold and saves posts
 */
import { extractPostId, extractAuthorName, extractAuthorProfile, extractPostContent, extractPostUrl } from '../utils/domHelpers.js';
import { logger } from '../utils/logger.js';
export class PostTracker {
    constructor(visibilityTracker, onPostSaved, getSettings) {
        this.trackedPosts = new Map();
        this.visibilityTracker = visibilityTracker;
        this.onPostSaved = onPostSaved;
        this.getSettings = getSettings;
        this.dwellThresholdSeconds = 10;
        this.visibilityTracker.onVisibilityChange((element, state) => this.handleVisibilityChange(element, state));
    }
    /**
     * Update settings from storage
     */
    async refreshSettings() {
        const settings = await this.getSettings();
        this.dwellThresholdSeconds = settings.dwellTimeThreshold;
    }
    /**
     * Register a new post element for tracking
     */
    trackPost(element) {
        if (this.trackedPosts.has(element))
            return;
        this.trackedPosts.set(element, {
            firstSeen: Date.now(),
            timerId: null
        });
        this.visibilityTracker.observe(element);
    }
    /**
     * Stop tracking a post
     */
    untrackPost(element) {
        const state = this.trackedPosts.get(element);
        if (state?.timerId)
            clearTimeout(state.timerId);
        this.trackedPosts.delete(element);
        this.visibilityTracker.unobserve(element);
    }
    handleVisibilityChange(element, state) {
        const tracked = this.trackedPosts.get(element);
        if (!tracked)
            return;
        if (state.isVisible && state.visibilityPercent > 10) {
            if (!tracked.timerId) {
                tracked.timerId = setTimeout(() => {
                    this.checkAndSavePost(element);
                }, this.dwellThresholdSeconds * 1000);
            }
        }
        else {
            if (tracked.timerId) {
                clearTimeout(tracked.timerId);
                tracked.timerId = null;
            }
        }
    }
    async checkAndSavePost(element) {
        const settings = await this.getSettings();
        if (settings.trackingPaused)
            return;
        const tracked = this.trackedPosts.get(element);
        if (!tracked)
            return;
        const visibilityState = this.visibilityTracker.getState(element);
        if (!visibilityState || !visibilityState.isVisible)
            return;
        const dwellTime = visibilityState.totalVisibleTime + (Date.now() - visibilityState.lastVisibilityChange) / 1000;
        if (dwellTime < this.dwellThresholdSeconds)
            return;
        const post = this.buildPostRecord(element, tracked.firstSeen, dwellTime, visibilityState);
        this.onPostSaved(post);
        this.untrackPost(element);
    }
    buildPostRecord(element, firstSeen, dwellTimeSeconds, visibilityState) {
        const scrollSpeed = Math.max(this.visibilityTracker.getScrollSpeed(), 1);
        const visibilityPercent = Math.min(visibilityState.visibilityPercent, 100);
        const attentionScore = (dwellTimeSeconds * visibilityPercent) / scrollSpeed;
        const post = {
            id: extractPostId(element),
            authorName: extractAuthorName(element),
            authorProfile: extractAuthorProfile(element),
            content: extractPostContent(element),
            seenAt: new Date(firstSeen).toISOString(),
            dwellTimeSeconds,
            visibilityPercent,
            scrollSpeed,
            postUrl: extractPostUrl(element),
            attentionScore
        };
        // Screenshot is captured by background script via chrome.tabs.captureVisibleTab
        // when enableScreenshots is true - see messageRouter SAVE_POST handler
        return post;
    }
    /**
     * Manually save a post (for keyboard shortcut)
     */
    async manualSave(element) {
        const tracked = this.trackedPosts.get(element);
        const firstSeen = tracked?.firstSeen ?? Date.now();
        const visibilityState = this.visibilityTracker.getState(element);
        const dwellTime = visibilityState
            ? visibilityState.totalVisibleTime + (Date.now() - visibilityState.lastVisibilityChange) / 1000
            : 1;
        const post = this.buildPostRecord(element, firstSeen, dwellTime, visibilityState || {
            isVisible: true,
            visibilityPercent: 100,
            firstSeenAt: firstSeen,
            totalVisibleTime: dwellTime,
            lastVisibilityChange: Date.now()
        });
        this.untrackPost(element);
        return post;
    }
    /**
     * Get count of currently tracked posts
     */
    getTrackedCount() {
        return this.trackedPosts.size;
    }
    /**
     * Cleanup
     */
    destroy() {
        for (const [, state] of this.trackedPosts) {
            if (state.timerId)
                clearTimeout(state.timerId);
        }
        this.trackedPosts.clear();
        logger.debug('PostTracker destroyed');
    }
}
//# sourceMappingURL=postTracker.js.map