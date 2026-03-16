/**
 * Settings page - configure extension options
 */
async function loadSettings() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings = response || {};
    document.getElementById('dwell-threshold').value = String(settings.dwellTimeThreshold ?? 10);
    document.getElementById('enable-screenshots').checked = settings.enableScreenshots ?? false;
    document.getElementById('max-posts').value = String(settings.maxStoredPosts ?? 500);
    document.getElementById('auto-export').checked = settings.autoExport ?? false;
    document.getElementById('export-format').value = settings.autoExportFormat ?? 'json';
    const formatSection = document.getElementById('auto-export-format');
    if (formatSection) {
        formatSection.classList.toggle('hidden', !settings.autoExport);
    }
}
async function saveSettings(e) {
    e.preventDefault();
    const updates = {
        dwellTimeThreshold: parseInt(document.getElementById('dwell-threshold').value, 10) || 10,
        enableScreenshots: document.getElementById('enable-screenshots').checked,
        maxStoredPosts: parseInt(document.getElementById('max-posts').value, 10) || 500,
        autoExport: document.getElementById('auto-export').checked,
        autoExportFormat: document.getElementById('export-format').value
    };
    await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', data: updates });
    showToast('Settings saved');
}
async function clearData() {
    if (!confirm('Are you sure you want to delete all saved posts? This cannot be undone.'))
        return;
    await chrome.runtime.sendMessage({ type: 'CLEAR_DATA' });
    showToast('All data cleared');
}
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast)
        return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
function init() {
    loadSettings();
    document.getElementById('settings-form')?.addEventListener('submit', saveSettings);
    document.getElementById('btn-clear')?.addEventListener('click', clearData);
    document.getElementById('auto-export')?.addEventListener('change', (e) => {
        const formatSection = document.getElementById('auto-export-format');
        if (formatSection) {
            formatSection.classList.toggle('hidden', !e.target.checked);
        }
    });
}
init();
export {};
//# sourceMappingURL=settings.js.map