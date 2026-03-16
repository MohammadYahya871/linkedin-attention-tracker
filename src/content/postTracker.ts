/**
 * Post tracker - coordinates visibility tracking with dwell time threshold and saves posts
 */

import type { PostRecord } from '../models/PostRecord.js';
import {
  extractPostId,
  extractAuthorName,
  extractAuthorProfile,
  extractPostContent,
  extractPostUrl
} from '../utils/domHelpers.js';
import { logger } from '../utils/logger.js';
import type { VisibilityState } from './visibilityTracker.js';

export type PostSavedCallback = (post: PostRecord) => void;

export class PostTracker {
  private visibilityTracker: import('./visibilityTracker.js').VisibilityTracker;
  private dwellThresholdSeconds: number;
  private trackedPosts = new Map<Element, { firstSeen: number; timerId: ReturnType<typeof setTimeout> | null }>();
  private onPostSaved: PostSavedCallback;
  private getSettings: () => Promise<{ dwellTimeThreshold: number; enableScreenshots: boolean; trackingPaused: boolean }>;

  constructor(
    visibilityTracker: import('./visibilityTracker.js').VisibilityTracker,
    onPostSaved: PostSavedCallback,
    getSettings: () => Promise<{ dwellTimeThreshold: number; enableScreenshots: boolean; trackingPaused: boolean }>
  ) {
    this.visibilityTracker = visibilityTracker;
    this.onPostSaved = onPostSaved;
    this.getSettings = getSettings;
    this.dwellThresholdSeconds = 10;

    this.visibilityTracker.onVisibilityChange((element, state) => this.handleVisibilityChange(element, state));
  }

  /**
   * Update settings from storage
   */
  async refreshSettings(): Promise<void> {
    const settings = await this.getSettings();
    this.dwellThresholdSeconds = settings.dwellTimeThreshold;
  }

  /**
   * Register a new post element for tracking
   */
  trackPost(element: Element): void {
    if (this.trackedPosts.has(element)) return;

    this.trackedPosts.set(element, {
      firstSeen: Date.now(),
      timerId: null
    });
    this.visibilityTracker.observe(element);
  }

  /**
   * Stop tracking a post
   */
  untrackPost(element: Element): void {
    const state = this.trackedPosts.get(element);
    if (state?.timerId) clearTimeout(state.timerId);
    this.trackedPosts.delete(element);
    this.visibilityTracker.unobserve(element);
  }

  private handleVisibilityChange(element: Element, state: VisibilityState): void {
    const tracked = this.trackedPosts.get(element);
    if (!tracked) return;

    if (state.isVisible && state.visibilityPercent > 5) {
      if (!tracked.timerId) {
        tracked.timerId = setTimeout(() => {
          this.checkAndSavePost(element);
        }, this.dwellThresholdSeconds * 1000);
      }
    } else {
      if (tracked.timerId) {
        clearTimeout(tracked.timerId);
        tracked.timerId = null;
      }
    }
  }

  private async checkAndSavePost(element: Element): Promise<void> {
    const settings = await this.getSettings();
    if (settings.trackingPaused) return;

    const tracked = this.trackedPosts.get(element);
    if (!tracked) return;

    const visibilityState = this.visibilityTracker.getState(element);
    if (!visibilityState || !visibilityState.isVisible) return;

    const dwellTime = visibilityState.totalVisibleTime + (Date.now() - visibilityState.lastVisibilityChange) / 1000;
    if (dwellTime < this.dwellThresholdSeconds) return;

    const post = this.buildPostRecord(element, tracked.firstSeen, dwellTime, visibilityState);
    this.onPostSaved(post);
    this.untrackPost(element);
  }

  private buildPostRecord(
    element: Element,
    firstSeen: number,
    dwellTimeSeconds: number,
    visibilityState: VisibilityState
  ): PostRecord {
    const scrollSpeed = Math.max(this.visibilityTracker.getScrollSpeed(), 1);
    const visibilityPercent = Math.min(visibilityState.visibilityPercent, 100);

    const attentionScore = (dwellTimeSeconds * visibilityPercent) / scrollSpeed;

    const post: PostRecord = {
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
  async manualSave(element: Element): Promise<PostRecord | null> {
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
  getTrackedCount(): number {
    return this.trackedPosts.size;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    for (const [, state] of this.trackedPosts) {
      if (state.timerId) clearTimeout(state.timerId);
    }
    this.trackedPosts.clear();
    logger.debug('PostTracker destroyed');
  }
}
