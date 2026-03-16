/**
 * Shortcut manager - handles chrome.commands and provides UI for customization
 * Note: Actual shortcut customization is done via Chrome's Extensions → Keyboard shortcuts
 */

export const DEFAULT_SHORTCUTS = {
  'save-current-post': 'Alt+Shift+S',
  'open-dashboard': 'Alt+Shift+D',
  'pause-tracking': 'Alt+Shift+P',
  'capture-screenshot': 'Alt+Shift+C',
  'open-settings': 'Alt+Shift+O'
} as const;

export async function getAllCommands(): Promise<chrome.commands.Command[]> {
  return new Promise((resolve) => {
    chrome.commands.getAll((commands) => {
      resolve(commands || []);
    });
  });
}
