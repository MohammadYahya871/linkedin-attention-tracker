/**
 * Feed observer - detects new posts in LinkedIn feed via MutationObserver
 */

import { findPostCard } from '../utils/domHelpers.js';
import { logger } from '../utils/logger.js';

export type PostDiscoveredCallback = (element: Element) => void;

/** Selectors for LinkedIn feed container (must be a parent of posts, not a post itself) */
const FEED_CONTAINER_SELECTORS = [
  'main',
  '.scaffold-layout__main',
  '[data-id="main"]',
  '[data-view-name="feed"]',
  '.feed-shared-update-v2', // fallback: observe from first post's parent
  'body'
];

/** Selectors for post cards */
const POST_SELECTORS = '[data-urn*="activity"], [data-urn*="share"], .feed-shared-update-v2, .feed-shared-update-v2__content, article[data-id]';

/** Debounce delay for batch processing */
const DEBOUNCE_MS = 300;

/** Interval for periodic scan (backup for MutationObserver) */
const PERIODIC_SCAN_MS = 4000;

export class FeedObserver {
  private processedIds = new Set<string>();
  private callback: PostDiscoveredCallback;
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private periodicScanTimer: ReturnType<typeof setInterval> | null = null;
  private pendingElements: Set<Element> = new Set();

  constructor(callback: PostDiscoveredCallback) {
    this.callback = callback;
  }

  /**
   * Start observing the feed
   */
  start(): void {
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element) {
              this.processNode(node);
            }
          }
        }
      }
    });

    const feedRoot = this.findFeedRoot();
    if (feedRoot) {
      this.observer.observe(feedRoot, {
        childList: true,
        subtree: true
      });
      this.scanExistingPosts(feedRoot);
      this.startPeriodicScan();
      logger.info('FeedObserver started, found', this.processedIds.size, 'posts');
    } else {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.start());
      } else {
        setTimeout(() => this.start(), 2000);
      }
    }
  }

  private findFeedRoot(): Element | null {
    for (const selector of FEED_CONTAINER_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return document.body;
  }

  private processNode(node: Element): void {
    const postCard = findPostCard(node) || (this.isPostCard(node) ? node : null);
    if (postCard) {
      this.pendingElements.add(postCard);
      this.scheduleProcess();
    }
    for (const child of node.querySelectorAll?.(POST_SELECTORS) || []) {
      if (child instanceof Element) {
        const card = findPostCard(child) || (this.isPostCard(child) ? child : null);
        if (card) this.pendingElements.add(card);
      }
    }
    if (this.pendingElements.size) this.scheduleProcess();
  }

  private isPostCard(element: Element): boolean {
    const urn = element.getAttribute('data-urn') || '';
    return (
      (urn.includes('activity') || urn.includes('share')) ||
      element.classList.contains('feed-shared-update-v2') ||
      (element.querySelector('[data-urn]') !== null && element.closest('.feed-shared-update-v2') !== null)
    );
  }

  private startPeriodicScan(): void {
    this.periodicScanTimer = setInterval(() => {
      const root = this.findFeedRoot();
      if (root) this.scanExistingPosts(root);
    }, PERIODIC_SCAN_MS);
  }

  private scheduleProcess(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processPending();
      this.debounceTimer = null;
    }, DEBOUNCE_MS);
  }

  private processPending(): void {
    for (const element of this.pendingElements) {
      if (!element.isConnected) continue;

      const id = element.getAttribute('data-urn') || element.getAttribute('data-id') || `post-${element.innerHTML.length}`;
      if (this.processedIds.has(id)) continue;

      this.processedIds.add(id);
      this.callback(element);
    }
    this.pendingElements.clear();
  }

  private scanExistingPosts(root: Element): void {
    const posts = root.querySelectorAll(POST_SELECTORS);
    for (const post of posts) {
      const card = findPostCard(post) || post;
      const urn = card.getAttribute('data-urn');
      const id = urn || card.getAttribute('data-id') || `post-${card.innerHTML.length}-${card.getBoundingClientRect().top}`;
      if (!this.processedIds.has(id)) {
        this.processedIds.add(id);
        this.callback(card);
      }
    }
  }

  /**
   * Stop observing
   */
  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.periodicScanTimer) {
      clearInterval(this.periodicScanTimer);
      this.periodicScanTimer = null;
    }
    this.observer?.disconnect();
    this.observer = null;
    this.pendingElements.clear();
    logger.debug('FeedObserver stopped');
  }
}
