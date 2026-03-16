/**
 * Logger utility - configurable logging for extension
 */

const DEBUG = false; // Set to true for development

export const logger = {
  debug: (...args: unknown[]) => {
    if (DEBUG) console.log('[LAT]', ...args);
  },
  info: (...args: unknown[]) => {
    console.log('[LAT]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[LAT]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[LAT]', ...args);
  }
};
