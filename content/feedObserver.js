/**
 * Feed observer - detects new posts in LinkedIn feed via MutationObserver
 */
import { findPostCard } from '../utils/domHelpers.js';
import { logger } from '../utils/logger.js';
/** Selectors for LinkedIn feed containers */
const FEED_SELECTORS = [
    '.main-feed-activity-card',
    '.feed-shared-update-v2',
    '[data-urn]',
    '.scaffold-layout__main'
];
/** Debounce delay for batch processing */
const DEBOUNCE_MS = 300;
export class FeedObserver {
    constructor(callback) {
        this.processedIds = new Set();
        this.observer = null;
        this.debounceTimer = null;
        this.pendingElements = new Set();
        this.callback = callback;
    }
    /**
     * Start observing the feed
     */
    start() {
        if (this.observer)
            return;
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
        // Find feed container
        const feedRoot = this.findFeedRoot();
        if (feedRoot) {
            this.observer.observe(feedRoot, {
                childList: true,
                subtree: true
            });
            this.scanExistingPosts(feedRoot);
            logger.debug('FeedObserver started');
        }
        else {
            // Retry when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.start());
            }
            else {
                setTimeout(() => this.start(), 2000);
            }
        }
    }
    findFeedRoot() {
        for (const selector of FEED_SELECTORS) {
            const el = document.querySelector(selector);
            if (el)
                return el;
        }
        return document.body;
    }
    processNode(node) {
        const postCard = findPostCard(node) || (this.isPostCard(node) ? node : null);
        if (postCard) {
            this.pendingElements.add(postCard);
            this.scheduleProcess();
        }
        // Also check children
        for (const child of node.querySelectorAll?.(FEED_SELECTORS.join(', ')) || []) {
            if (child instanceof Element) {
                const card = findPostCard(child) || (this.isPostCard(child) ? child : null);
                if (card) {
                    this.pendingElements.add(card);
                }
            }
        }
        if (this.pendingElements.size)
            this.scheduleProcess();
    }
    isPostCard(element) {
        return (element.hasAttribute('data-urn') ||
            element.classList.contains('feed-shared-update-v2') ||
            (element.querySelector('[data-urn]') !== null && element.closest('.feed-shared-update-v2') !== null));
    }
    scheduleProcess() {
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.processPending();
            this.debounceTimer = null;
        }, DEBOUNCE_MS);
    }
    processPending() {
        for (const element of this.pendingElements) {
            if (!element.isConnected)
                continue;
            const id = element.getAttribute('data-urn') || element.getAttribute('data-id') || `post-${element.innerHTML.length}`;
            if (this.processedIds.has(id))
                continue;
            this.processedIds.add(id);
            this.callback(element);
        }
        this.pendingElements.clear();
    }
    scanExistingPosts(root) {
        const posts = root.querySelectorAll('[data-urn], .feed-shared-update-v2');
        for (const post of posts) {
            const card = findPostCard(post) || post;
            const id = card.getAttribute('data-urn') || `post-${post.innerHTML.length}`;
            if (!this.processedIds.has(id)) {
                this.processedIds.add(id);
                this.callback(card);
            }
        }
    }
    /**
     * Stop observing
     */
    stop() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.observer?.disconnect();
        this.observer = null;
        this.pendingElements.clear();
        logger.debug('FeedObserver stopped');
    }
}
//# sourceMappingURL=feedObserver.js.map