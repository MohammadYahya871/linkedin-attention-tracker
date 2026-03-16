/**
 * Service Worker - background script for LinkedIn Attention Tracker
 */
import { setupMessageListener } from './messageRouter.js';
import { storageManager } from './storageManager.js';
import { logger } from '../utils/logger.js';
// Initialize message routing
setupMessageListener();
// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    logger.debug('Command received:', command);
    switch (command) {
        case 'open-dashboard':
            chrome.tabs.create({ url: chrome.runtime.getURL('ui/dashboard/dashboard.html') });
            break;
        case 'save-current-post':
        case 'capture-screenshot':
            // Forward to content script on active LinkedIn tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (tab?.id && tab.url?.includes('linkedin.com')) {
                    chrome.tabs.sendMessage(tab.id, { type: 'COMMAND', command });
                }
            });
            break;
        case 'pause-tracking':
            // Toggle pause state
            storageManager.getSettings().then((s) => {
                storageManager.updateSettings({ trackingPaused: !s.trackingPaused });
            });
            break;
        default:
            logger.warn('Unknown command:', command);
    }
});
logger.info('LinkedIn Attention Tracker service worker initialized');
//# sourceMappingURL=serviceWorker.js.map