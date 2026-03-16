/**
 * DOM helper utilities for LinkedIn post extraction
 */
/** Maximum content length to capture */
export const MAX_CONTENT_LENGTH = 1000;
/** LinkedIn feed selectors - resilient to minor DOM changes */
export const SELECTORS = {
    authorName: '.feed-shared-actor__name, .update-components-actor__name, .update-components-actor__name span, [data-urn] .feed-shared-actor__name, a[href*="/in/"] span',
    authorLink: 'a[href*="/in/"]',
    postContent: '.feed-shared-update-v2__description, .feed-shared-text, .update-components-text, .break-words, [data-urn] .feed-shared-inline-show-more-text',
    postLink: 'a[href*="/posts/"], a[href*="/feed/update/"], a[href*="/feed/"]'
};
/**
 * Extract post ID from element (data-urn or data-id)
 */
export function extractPostId(element) {
    const urnEl = element.querySelector('[data-urn*="activity"], [data-urn*="share"]') || element.closest('[data-urn*="activity"], [data-urn*="share"]') || element;
    const urn = urnEl?.getAttribute('data-urn') || element.getAttribute('data-id');
    if (urn)
        return urn;
    const postLink = element.querySelector('a[href*="/feed/update/"], a[href*="/posts/"]');
    if (postLink?.href) {
        const match = postLink.href.match(/\/(?:posts|feed\/update)\/([^\/\?]+)/);
        return match ? match[1] : `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    return `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
 * Extract author name from post element
 * Tries multiple strategies: actor container, link text, aria-label
 */
export function extractAuthorName(element) {
    // 1. Actor container - name is often in .feed-shared-actor__name or .update-components-actor__name
    const actorContainer = element.querySelector('.feed-shared-actor, .update-components-actor');
    if (actorContainer) {
        const nameEl = actorContainer.querySelector('.feed-shared-actor__name, .update-components-actor__name, [class*="actor__name"]');
        const name = nameEl?.textContent?.trim();
        if (name)
            return name;
        // 2. Author link text (name is often the link content)
        const authorLink = actorContainer.querySelector('a[href*="/in/"]');
        const linkText = authorLink?.textContent?.trim() || authorLink?.innerText?.trim();
        if (linkText)
            return linkText;
    }
    // 3. First profile link in post (author is usually first)
    const links = element.querySelectorAll('a[href*="/in/"]');
    for (const link of links) {
        if (link.href.includes('/in/company/'))
            continue;
        const text = (link.textContent?.trim() || link.getAttribute('aria-label') || '').trim();
        if (text && text.length < 80 && !/^(follow|message|connect|see all|more)$/i.test(text)) {
            return text;
        }
    }
    return 'Unknown';
}
/**
 * Extract author profile URL
 */
export function extractAuthorProfile(element) {
    const actorContainer = element.querySelector('.feed-shared-actor, .update-components-actor');
    const searchRoot = actorContainer || element;
    const link = searchRoot.querySelector('a[href*="/in/"]');
    if (link?.href && link.href.includes('/in/') && !link.href.includes('/in/company/')) {
        return link.href.split('?')[0];
    }
    return '';
}
/**
 * Extract post content text
 */
export function extractPostContent(element) {
    const contentEl = element.querySelector(SELECTORS.postContent);
    const text = contentEl?.textContent?.trim() || '';
    return text.slice(0, MAX_CONTENT_LENGTH);
}
/**
 * Extract post URL - link to the specific post (not the feed)
 */
export function extractPostUrl(element) {
    // 1. Build from data-urn (most reliable) - check element and descendants
    const urnEl = element.querySelector('[data-urn*="activity"], [data-urn*="share"]') || element.closest('[data-urn*="activity"], [data-urn*="share"]') || element;
    const urn = urnEl?.getAttribute('data-urn');
    if (urn && (urn.includes('activity') || urn.includes('share'))) {
        return `https://www.linkedin.com/feed/update/${urn}/`;
    }
    // 2. Find link with activity/share URN in href
    const links = element.querySelectorAll('a[href*="/feed/update/"], a[href*="/posts/"]');
    for (const link of links) {
        if (link.href.includes('urn:li:activity') || link.href.includes('urn:li:share') || link.href.match(/\/posts\/[^\/]+/)) {
            return link.href.split('?')[0];
        }
    }
    return window.location.href;
}
/**
 * Find the closest post card element (prefer feed-shared-update-v2 for visibility tracking)
 */
export function findPostCard(element) {
    let current = element;
    let urnMatch = null;
    while (current) {
        const urn = current.getAttribute('data-urn') || '';
        if (urn.includes('activity') || urn.includes('share')) {
            urnMatch = current;
        }
        if (current.classList.contains('feed-shared-update-v2')) {
            return current; // Full card - best for visibility
        }
        if (current.tagName === 'ARTICLE' && current.hasAttribute('data-id')) {
            return current;
        }
        current = current.parentElement;
    }
    return urnMatch;
}
//# sourceMappingURL=domHelpers.js.map