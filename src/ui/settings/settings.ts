/**
 * Settings page - configure extension options
 */

import type { ExtensionSettings } from '../../models/PostRecord.js';

async function loadSettings(): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  const settings: ExtensionSettings = response || {};

  (document.getElementById('dwell-threshold') as HTMLInputElement).value = String(settings.dwellTimeThreshold ?? 10);
  (document.getElementById('enable-screenshots') as HTMLInputElement).checked = settings.enableScreenshots ?? false;
  (document.getElementById('max-posts') as HTMLInputElement).value = String(settings.maxStoredPosts ?? 500);
  (document.getElementById('auto-export') as HTMLInputElement).checked = settings.autoExport ?? false;
  (document.getElementById('export-format') as HTMLSelectElement).value = settings.autoExportFormat ?? 'json';

  const formatSection = document.getElementById('auto-export-format');
  if (formatSection) {
    formatSection.classList.toggle('hidden', !settings.autoExport);
  }
}

async function saveSettings(e: Event): Promise<void> {
  e.preventDefault();

  const updates: Partial<ExtensionSettings> = {
    dwellTimeThreshold: parseInt((document.getElementById('dwell-threshold') as HTMLInputElement).value, 10) || 10,
    enableScreenshots: (document.getElementById('enable-screenshots') as HTMLInputElement).checked,
    maxStoredPosts: parseInt((document.getElementById('max-posts') as HTMLInputElement).value, 10) || 500,
    autoExport: (document.getElementById('auto-export') as HTMLInputElement).checked,
    autoExportFormat: (document.getElementById('export-format') as HTMLSelectElement).value as 'json' | 'csv' | 'markdown'
  };

  await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', data: updates });
  showToast('Settings saved');
}

async function clearData(): Promise<void> {
  if (!confirm('Are you sure you want to delete all saved posts? This cannot be undone.')) return;
  await chrome.runtime.sendMessage({ type: 'CLEAR_DATA' });
  showToast('All data cleared');
}

function showToast(message: string): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function init(): void {
  loadSettings();

  document.getElementById('settings-form')?.addEventListener('submit', saveSettings);
  document.getElementById('btn-clear')?.addEventListener('click', clearData);

  document.getElementById('auto-export')?.addEventListener('change', (e) => {
    const formatSection = document.getElementById('auto-export-format');
    if (formatSection) {
      formatSection.classList.toggle('hidden', !(e.target as HTMLInputElement).checked);
    }
  });
}

init();
