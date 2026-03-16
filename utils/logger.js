/**
 * Logger utility - configurable logging for extension
 */
const DEBUG = false; // Set to true for development
export const logger = {
    debug: (...args) => {
        if (DEBUG)
            console.log('[LAT]', ...args);
    },
    info: (...args) => {
        console.log('[LAT]', ...args);
    },
    warn: (...args) => {
        console.warn('[LAT]', ...args);
    },
    error: (...args) => {
        console.error('[LAT]', ...args);
    }
};
//# sourceMappingURL=logger.js.map