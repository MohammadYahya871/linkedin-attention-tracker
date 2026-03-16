/**
 * Message router - handles extension messaging between content script, popup, and background
 */

import type { MessagePayload, MessageType } from '../models/PostRecord.js';
import { storageManager } from './storageManager.js';
import { logger } from '../utils/logger.js';

type MessageHandler = (data: unknown, sender?: chrome.runtime.MessageSender) => Promise<unknown>;

const handlers: Partial<Record<MessageType, MessageHandler>> = {
  SAVE_POST: async (data, sender) => {
    const post = data as import('../models/PostRecord.js').PostRecord;
    const settings = await storageManager.getSettings();
    if (settings.enableScreenshots && sender?.tab?.id) {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.id, { format: 'png' });
        post.screenshot = dataUrl;
      } catch {
        // Screenshot failed - save without it
      }
    }
    await storageManager.savePost(post);
    return { success: true };
  },

  GET_POSTS: async () => {
    return storageManager.getPosts();
  },

  GET_STATS: async () => {
    return storageManager.getStats();
  },

  GET_SETTINGS: async () => {
    return storageManager.getSettings();
  },

  UPDATE_SETTINGS: async (data) => {
    await storageManager.updateSettings(data as Partial<import('../models/PostRecord.js').ExtensionSettings>);
    return { success: true };
  },

  PAUSE_TRACKING: async () => {
    await storageManager.updateSettings({ trackingPaused: true });
    return { success: true };
  },

  RESUME_TRACKING: async () => {
    await storageManager.updateSettings({ trackingPaused: false });
    return { success: true };
  },

  DELETE_POST: async (data) => {
    await storageManager.deletePost(data as string);
    return { success: true };
  },

  MANUAL_SAVE: async (data, sender) => {
    const post = data as import('../models/PostRecord.js').PostRecord;
    const settings = await storageManager.getSettings();
    if (settings.enableScreenshots && sender?.tab?.id) {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.id, { format: 'png' });
        post.screenshot = dataUrl;
      } catch {
        // Screenshot failed
      }
    }
    await storageManager.savePost(post);
    return { success: true };
  },

  CLEAR_DATA: async () => {
    await storageManager.clearPosts();
    return { success: true };
  }
};

export function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: MessagePayload,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void
    ) => {
      const handler = handlers[message.type];
      if (!handler) {
        logger.warn('Unknown message type:', message.type);
        sendResponse({ error: 'Unknown message type' });
        return true;
      }

      handler(message.data, _sender)
        .then(sendResponse)
        .catch((err) => {
          logger.error('Message handler error:', err);
          sendResponse({ error: String(err) });
        });

      return true; // Keep channel open for async response
    }
  );
}
