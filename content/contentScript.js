"use strict";
(() => {
  // src/utils/domHelpers.ts
  var MAX_CONTENT_LENGTH = 1e3;
  var SELECTORS = {
    authorName: '.feed-shared-actor__name, .update-components-actor__name, .update-components-actor__name span, [data-urn] .feed-shared-actor__name, a[href*="/in/"] span',
    authorLink: 'a[href*="/in/"]',
    postContent: ".feed-shared-update-v2__description, .feed-shared-text, .update-components-text, .break-words, [data-urn] .feed-shared-inline-show-more-text",
    postLink: 'a[href*="/posts/"], a[href*="/feed/update/"], a[href*="/feed/"]'
  };
  function extractPostId(element) {
    const urnEl = element.querySelector('[data-urn*="activity"], [data-urn*="share"]') || element.closest('[data-urn*="activity"], [data-urn*="share"]') || element;
    const urn = urnEl?.getAttribute("data-urn") || element.getAttribute("data-id");
    if (urn) return urn;
    const postLink = element.querySelector('a[href*="/feed/update/"], a[href*="/posts/"]');
    if (postLink?.href) {
      const match = postLink.href.match(/\/(?:posts|feed\/update)\/([^\/\?]+)/);
      return match ? match[1] : `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    return `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  function extractAuthorName(element) {
    const actorContainer = element.querySelector(".feed-shared-actor, .update-components-actor");
    if (actorContainer) {
      const nameEl = actorContainer.querySelector('.feed-shared-actor__name, .update-components-actor__name, [class*="actor__name"]');
      const name = nameEl?.textContent?.trim();
      if (name) return name;
      const authorLink = actorContainer.querySelector('a[href*="/in/"]');
      const linkText = authorLink?.textContent?.trim() || authorLink?.innerText?.trim();
      if (linkText) return linkText;
    }
    const links = element.querySelectorAll('a[href*="/in/"]');
    for (const link of links) {
      if (link.href.includes("/in/company/")) continue;
      const text = (link.textContent?.trim() || link.getAttribute("aria-label") || "").trim();
      if (text && text.length < 80 && !/^(follow|message|connect|see all|more)$/i.test(text)) {
        return text;
      }
    }
    return "Unknown";
  }
  function extractAuthorProfile(element) {
    const actorContainer = element.querySelector(".feed-shared-actor, .update-components-actor");
    const searchRoot = actorContainer || element;
    const link = searchRoot.querySelector('a[href*="/in/"]');
    if (link?.href && link.href.includes("/in/") && !link.href.includes("/in/company/")) {
      return link.href.split("?")[0];
    }
    return "";
  }
  function extractPostContent(element) {
    const contentEl = element.querySelector(SELECTORS.postContent);
    const text = contentEl?.textContent?.trim() || "";
    return text.slice(0, MAX_CONTENT_LENGTH);
  }
  function extractPostUrl(element) {
    const urnEl = element.querySelector('[data-urn*="activity"], [data-urn*="share"]') || element.closest('[data-urn*="activity"], [data-urn*="share"]') || element;
    const urn = urnEl?.getAttribute("data-urn");
    if (urn && (urn.includes("activity") || urn.includes("share"))) {
      return `https://www.linkedin.com/feed/update/${urn}/`;
    }
    const links = element.querySelectorAll('a[href*="/feed/update/"], a[href*="/posts/"]');
    for (const link of links) {
      if (link.href.includes("urn:li:activity") || link.href.includes("urn:li:share") || link.href.match(/\/posts\/[^\/]+/)) {
        return link.href.split("?")[0];
      }
    }
    return window.location.href;
  }
  function findPostCard(element) {
    let current = element;
    let urnMatch = null;
    while (current) {
      const urn = current.getAttribute("data-urn") || "";
      if (urn.includes("activity") || urn.includes("share")) {
        urnMatch = current;
      }
      if (current.classList.contains("feed-shared-update-v2")) {
        return current;
      }
      if (current.tagName === "ARTICLE" && current.hasAttribute("data-id")) {
        return current;
      }
      current = current.parentElement;
    }
    return urnMatch;
  }

  // src/utils/logger.ts
  var DEBUG = false;
  var logger = {
    debug: (...args) => {
      if (DEBUG) console.log("[LAT]", ...args);
    },
    info: (...args) => {
      console.log("[LAT]", ...args);
    },
    warn: (...args) => {
      console.warn("[LAT]", ...args);
    },
    error: (...args) => {
      console.error("[LAT]", ...args);
    }
  };

  // src/content/feedObserver.ts
  var FEED_CONTAINER_SELECTORS = [
    "main",
    ".scaffold-layout__main",
    '[data-id="main"]',
    '[data-view-name="feed"]',
    ".feed-shared-update-v2",
    // fallback: observe from first post's parent
    "body"
  ];
  var POST_SELECTORS = '[data-urn*="activity"], [data-urn*="share"], .feed-shared-update-v2, .feed-shared-update-v2__content, article[data-id]';
  var DEBOUNCE_MS = 300;
  var PERIODIC_SCAN_MS = 4e3;
  var FeedObserver = class {
    constructor(callback) {
      this.processedIds = /* @__PURE__ */ new Set();
      this.observer = null;
      this.debounceTimer = null;
      this.periodicScanTimer = null;
      this.pendingElements = /* @__PURE__ */ new Set();
      this.callback = callback;
    }
    /**
     * Start observing the feed
     */
    start() {
      if (this.observer) return;
      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList" && mutation.addedNodes.length) {
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
        logger.info("FeedObserver started, found", this.processedIds.size, "posts");
      } else {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => this.start());
        } else {
          setTimeout(() => this.start(), 2e3);
        }
      }
    }
    findFeedRoot() {
      for (const selector of FEED_CONTAINER_SELECTORS) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      return document.body;
    }
    processNode(node) {
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
    isPostCard(element) {
      const urn = element.getAttribute("data-urn") || "";
      return urn.includes("activity") || urn.includes("share") || element.classList.contains("feed-shared-update-v2") || element.querySelector("[data-urn]") !== null && element.closest(".feed-shared-update-v2") !== null;
    }
    startPeriodicScan() {
      this.periodicScanTimer = setInterval(() => {
        const root = this.findFeedRoot();
        if (root) this.scanExistingPosts(root);
      }, PERIODIC_SCAN_MS);
    }
    scheduleProcess() {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.processPending();
        this.debounceTimer = null;
      }, DEBOUNCE_MS);
    }
    processPending() {
      for (const element of this.pendingElements) {
        if (!element.isConnected) continue;
        const id = element.getAttribute("data-urn") || element.getAttribute("data-id") || `post-${element.innerHTML.length}`;
        if (this.processedIds.has(id)) continue;
        this.processedIds.add(id);
        this.callback(element);
      }
      this.pendingElements.clear();
    }
    scanExistingPosts(root) {
      const posts = root.querySelectorAll(POST_SELECTORS);
      for (const post of posts) {
        const card = findPostCard(post) || post;
        const urn = card.getAttribute("data-urn");
        const id = urn || card.getAttribute("data-id") || `post-${card.innerHTML.length}-${card.getBoundingClientRect().top}`;
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
      if (this.periodicScanTimer) {
        clearInterval(this.periodicScanTimer);
        this.periodicScanTimer = null;
      }
      this.observer?.disconnect();
      this.observer = null;
      this.pendingElements.clear();
      logger.debug("FeedObserver stopped");
    }
  };

  // src/utils/debounce.ts
  function debounce(fn, wait) {
    let timeoutId = null;
    return function(...args) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        timeoutId = null;
      }, wait);
    };
  }

  // src/content/visibilityTracker.ts
  var SCROLL_THROTTLE = 100;
  var MIN_SCROLL_DELTA = 5;
  var VisibilityTracker = class {
    constructor() {
      this.observer = null;
      this.elementStates = /* @__PURE__ */ new Map();
      this.callbacks = /* @__PURE__ */ new Set();
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
      window.addEventListener("scroll", this.handleScroll, { passive: true });
    }
    updateScrollSpeed() {
      const now = Date.now();
      const y = window.scrollY;
      const deltaY = Math.abs(y - this.scrollLastY);
      const deltaT = (now - this.scrollLastTime) / 1e3;
      if (deltaY > MIN_SCROLL_DELTA && deltaT > 0) {
        this.scrollSpeed = deltaY / deltaT;
      } else if (deltaT > 1) {
        this.scrollSpeed *= 0.5;
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
      if (this.elementStates.has(element)) return;
      const state = {
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
            rootMargin: "0px",
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
        if (!state) continue;
        const visibilityPercent = Math.round((entry.intersectionRatio || 0) * 100);
        if (state.isVisible) {
          state.totalVisibleTime += (now - state.lastVisibilityChange) / 1e3;
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
    destroy() {
      window.removeEventListener("scroll", this.handleScroll);
      this.observer?.disconnect();
      this.observer = null;
      this.elementStates.clear();
      this.callbacks.clear();
      logger.debug("VisibilityTracker destroyed");
    }
  };

  // src/content/postTracker.ts
  var PostTracker = class {
    constructor(visibilityTracker2, onPostSaved, getSettings2) {
      this.trackedPosts = /* @__PURE__ */ new Map();
      this.visibilityTracker = visibilityTracker2;
      this.onPostSaved = onPostSaved;
      this.getSettings = getSettings2;
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
    untrackPost(element) {
      const state = this.trackedPosts.get(element);
      if (state?.timerId) clearTimeout(state.timerId);
      this.trackedPosts.delete(element);
      this.visibilityTracker.unobserve(element);
    }
    handleVisibilityChange(element, state) {
      const tracked = this.trackedPosts.get(element);
      if (!tracked) return;
      if (state.isVisible && state.visibilityPercent > 5) {
        if (!tracked.timerId) {
          tracked.timerId = setTimeout(() => {
            this.checkAndSavePost(element);
          }, this.dwellThresholdSeconds * 1e3);
        }
      } else {
        if (tracked.timerId) {
          clearTimeout(tracked.timerId);
          tracked.timerId = null;
        }
      }
    }
    async checkAndSavePost(element) {
      const settings = await this.getSettings();
      if (settings.trackingPaused) return;
      const tracked = this.trackedPosts.get(element);
      if (!tracked) return;
      const visibilityState = this.visibilityTracker.getState(element);
      if (!visibilityState || !visibilityState.isVisible) return;
      const dwellTime = visibilityState.totalVisibleTime + (Date.now() - visibilityState.lastVisibilityChange) / 1e3;
      if (dwellTime < this.dwellThresholdSeconds) return;
      const post = this.buildPostRecord(element, tracked.firstSeen, dwellTime, visibilityState);
      this.onPostSaved(post);
      this.untrackPost(element);
    }
    buildPostRecord(element, firstSeen, dwellTimeSeconds, visibilityState) {
      const scrollSpeed = Math.max(this.visibilityTracker.getScrollSpeed(), 1);
      const visibilityPercent = Math.min(visibilityState.visibilityPercent, 100);
      const attentionScore = dwellTimeSeconds * visibilityPercent / scrollSpeed;
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
      return post;
    }
    /**
     * Manually save a post (for keyboard shortcut)
     */
    async manualSave(element) {
      const tracked = this.trackedPosts.get(element);
      const firstSeen = tracked?.firstSeen ?? Date.now();
      const visibilityState = this.visibilityTracker.getState(element);
      const dwellTime = visibilityState ? visibilityState.totalVisibleTime + (Date.now() - visibilityState.lastVisibilityChange) / 1e3 : 1;
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
        if (state.timerId) clearTimeout(state.timerId);
      }
      this.trackedPosts.clear();
      logger.debug("PostTracker destroyed");
    }
  };

  // src/content/contentScript.ts
  var feedObserver = null;
  var visibilityTracker = null;
  var postTracker = null;
  async function getSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            dwellTimeThreshold: 10,
            enableScreenshots: false,
            trackingPaused: false
          });
        } else {
          resolve(response || { dwellTimeThreshold: 10, enableScreenshots: false, trackingPaused: false });
        }
      });
    });
  }
  function savePost(post) {
    chrome.runtime.sendMessage({ type: "SAVE_POST", data: post });
  }
  function init() {
    if (!window.location.hostname.includes("linkedin.com")) return;
    visibilityTracker = new VisibilityTracker();
    postTracker = new PostTracker(visibilityTracker, savePost, getSettings);
    feedObserver = new FeedObserver((element) => {
      postTracker?.trackPost(element);
    });
    feedObserver.start();
    postTracker.refreshSettings();
    chrome.runtime.onMessage.addListener(
      (message, _sender, sendResponse) => {
        if (message.type === "COMMAND") {
          handleCommand(message.command);
          sendResponse({ ok: true });
        }
        return true;
      }
    );
    logger.info("LinkedIn Attention Tracker content script initialized");
  }
  async function handleCommand(command) {
    if (!postTracker || !visibilityTracker) return;
    switch (command) {
      case "pause-tracking":
        chrome.runtime.sendMessage({ type: "PAUSE_TRACKING" });
        break;
      case "resume-tracking":
        chrome.runtime.sendMessage({ type: "RESUME_TRACKING" });
        break;
      case "save-current-post": {
        const element = getPostInViewport();
        if (element) {
          const post = await postTracker.manualSave(element);
          if (post) savePost(post);
        }
        break;
      }
      case "capture-screenshot": {
        const element = getPostInViewport();
        if (element) {
          const post = await postTracker.manualSave(element);
          if (post) savePost(post);
        }
        break;
      }
      default:
        break;
    }
  }
  function getPostInViewport() {
    const posts = document.querySelectorAll("[data-urn], .feed-shared-update-v2");
    const viewportHeight = window.innerHeight;
    const viewportCenter = window.scrollY + viewportHeight / 2;
    for (const post of posts) {
      const rect = post.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + rect.height;
      if (viewportCenter >= top && viewportCenter <= bottom) {
        return post;
      }
    }
    return posts[0] || null;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("beforeunload", () => {
    feedObserver?.stop();
    postTracker?.destroy();
    visibilityTracker?.destroy();
  });
})();
//# sourceMappingURL=contentScript.js.map
