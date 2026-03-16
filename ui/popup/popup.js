/**
 * Popup script - quick stats and navigation
 */
import { formatDuration } from '../../utils/timeUtils.js';
async function loadStats() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
        if (response?.error)
            throw new Error(response.error);
        const { postsToday, totalPosts, totalAttentionTime } = response;
        const postsTodayEl = document.getElementById('posts-today');
        const totalPostsEl = document.getElementById('total-posts');
        const attentionTimeEl = document.getElementById('attention-time');
        if (postsTodayEl)
            postsTodayEl.textContent = String(postsToday);
        if (totalPostsEl)
            totalPostsEl.textContent = String(totalPosts);
        if (attentionTimeEl)
            attentionTimeEl.textContent = formatDuration(totalAttentionTime);
    }
    catch (err) {
        console.error('Failed to load stats:', err);
    }
}
function setupLinks() {
    const dashboardUrl = chrome.runtime.getURL('ui/dashboard/dashboard.html');
    const settingsUrl = chrome.runtime.getURL('ui/settings/settings.html');
    const btnDashboard = document.getElementById('btn-dashboard');
    const btnSettings = document.getElementById('btn-settings');
    if (btnDashboard) {
        btnDashboard.setAttribute('href', dashboardUrl);
        btnDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: dashboardUrl });
            window.close();
        });
    }
    if (btnSettings) {
        btnSettings.setAttribute('href', settingsUrl);
        btnSettings.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: settingsUrl });
            window.close();
        });
    }
}
loadStats();
setupLinks();
//# sourceMappingURL=popup.js.map