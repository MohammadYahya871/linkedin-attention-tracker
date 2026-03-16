/**
 * Time utility functions
 */
/**
 * Get current ISO date string
 */
export function nowISO() {
    return new Date().toISOString();
}
/**
 * Format seconds to human readable string
 */
export function formatDuration(seconds) {
    if (seconds < 60)
        return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
/**
 * Format date for display
 */
export function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
/**
 * Get start of today in ISO string
 */
export function startOfTodayISO() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
}
//# sourceMappingURL=timeUtils.js.map