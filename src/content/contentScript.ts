/**
 * Content script - main entry point for LinkedIn page
 * Coordinates feed observation, post tracking, and messaging
 */

import { FeedObserver } from './feedObserver.js';
import { VisibilityTracker } from './visibilityTracker.js';
import { PostTracker } from './postTracker.js';
import { logger } from '../utils/logger.js';

let feedObserver: FeedObserver | null = null;
let visibilityTracker: VisibilityTracker | null = null;
let postTracker: PostTracker | null = null;

async function getSettings() {
  return new Promise<{
    dwellTimeThreshold: number;
    enableScreenshots: boolean;
    trackingPaused: boolean;
  }>((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
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

function savePost(post: import('../models/PostRecord.js').PostRecord) {
  chrome.runtime.sendMessage({ type: 'SAVE_POST', data: post });
}

function init() {
  if (!window.location.hostname.includes('linkedin.com')) return;

  visibilityTracker = new VisibilityTracker();
  postTracker = new PostTracker(visibilityTracker, savePost, getSettings);

  feedObserver = new FeedObserver((element) => {
    postTracker?.trackPost(element);
  });

  feedObserver.start();
  postTracker.refreshSettings();

  // Listen for commands from background
  chrome.runtime.onMessage.addListener(
    (
      message: { type: string; command?: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void
    ) => {
      if (message.type === 'COMMAND') {
        handleCommand(message.command);
        sendResponse({ ok: true });
      }
      return true;
    }
  );

  logger.info('LinkedIn Attention Tracker content script initialized');
}

async function handleCommand(command?: string) {
  if (!postTracker || !visibilityTracker) return;

  switch (command) {
    case 'pause-tracking':
      chrome.runtime.sendMessage({ type: 'PAUSE_TRACKING' });
      break;
    case 'resume-tracking':
      chrome.runtime.sendMessage({ type: 'RESUME_TRACKING' });
      break;
    case 'save-current-post': {
      const element = getPostInViewport();
      if (element) {
        const post = await postTracker.manualSave(element);
        if (post) savePost(post);
      }
      break;
    }
    case 'capture-screenshot': {
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

function getPostInViewport(): Element | null {
  const posts = document.querySelectorAll('[data-urn], .feed-shared-update-v2');
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Cleanup on page unload (optional - for SPA navigation)
window.addEventListener('beforeunload', () => {
  feedObserver?.stop();
  postTracker?.destroy();
  visibilityTracker?.destroy();
});
