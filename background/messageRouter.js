/**
 * Message router - handles extension messaging between content script, popup, and background
 */
import { storageManager } from './storageManager.js';
import { logger } from '../utils/logger.js';
const handlers = {
    SAVE_POST: async (data, sender) => {
        const post = data;
        const settings = await storageManager.getSettings();
        if (settings.enableScreenshots && sender?.tab?.id) {
            try {
                const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.id, { format: 'png' });
                post.screenshot = dataUrl;
            }
            catch {
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
        await storageManager.updateSettings(data);
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
        await storageManager.deletePost(data);
        return { success: true };
    },
    MANUAL_SAVE: async (data, sender) => {
        const post = data;
        const settings = await storageManager.getSettings();
        if (settings.enableScreenshots && sender?.tab?.id) {
            try {
                const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.id, { format: 'png' });
                post.screenshot = dataUrl;
            }
            catch {
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
export function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
    });
}
//# sourceMappingURL=messageRouter.js.map