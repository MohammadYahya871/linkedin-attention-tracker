/**
 * Debounce utility - delays function execution until after wait time
 */
export function debounce(fn, wait) {
    let timeoutId = null;
    return function (...args) {
        if (timeoutId)
            clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
            timeoutId = null;
        }, wait);
    };
}
//# sourceMappingURL=debounce.js.map