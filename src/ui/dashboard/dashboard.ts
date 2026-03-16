/**
 * Dashboard - view, search, filter, and export saved posts
 */

import type { PostRecord } from '../../models/PostRecord.js';
import { formatDate, formatDuration } from '../../utils/timeUtils.js';

let allPosts: PostRecord[] = [];

async function loadPosts(): Promise<PostRecord[]> {
  const response = await chrome.runtime.sendMessage({ type: 'GET_POSTS' });
  if (response?.error) throw new Error(response.error);
  return Array.isArray(response) ? response : [];
}

function filterAndSortPosts(
  posts: PostRecord[],
  search: string,
  author: string,
  dateFilter: string,
  sortBy: string
): PostRecord[] {
  let filtered = [...posts];

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q)
    );
  }

  if (author) {
    filtered = filtered.filter((p) => p.authorName === author);
  }

  if (dateFilter) {
    const now = new Date();
    const start = new Date();
    if (dateFilter === 'today') start.setHours(0, 0, 0, 0);
    else if (dateFilter === 'week') start.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') start.setMonth(now.getMonth() - 1);
    const startISO = start.toISOString();
    filtered = filtered.filter((p) => p.seenAt >= startISO);
  }

  filtered.sort((a, b) => {
    const aVal = a[sortBy as keyof PostRecord];
    const bVal = b[sortBy as keyof PostRecord];
    if (typeof aVal === 'string' && typeof bVal === 'string') return bVal.localeCompare(aVal);
    if (typeof aVal === 'number' && typeof bVal === 'number') return bVal - aVal;
    return 0;
  });

  return filtered;
}

function renderPost(post: PostRecord): string {
  const screenshotHtml = post.screenshot
    ? `<img src="${post.screenshot}" alt="Screenshot" class="w-full rounded-lg mt-2 max-h-48 object-cover cursor-pointer" onclick="window.open(this.src)">`
    : '';

  return `
    <article class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow animate-slide-up">
      <div class="flex justify-between items-start mb-3">
        <div>
          <a href="${post.authorProfile || '#'}" target="_blank" class="font-semibold text-linkedin-blue hover:underline">${escapeHtml(post.authorName)}</a>
          <p class="text-xs text-gray-500 mt-1">${formatDate(post.seenAt)} · ${formatDuration(post.dwellTimeSeconds)} read</p>
        </div>
        <div class="flex gap-2">
          <a href="${post.postUrl}" target="_blank" class="text-sm text-linkedin-blue hover:underline">View on LinkedIn</a>
          <button data-delete="${post.id}" class="text-red-500 hover:text-red-700 text-sm">Delete</button>
        </div>
      </div>
      <p class="text-gray-700 whitespace-pre-wrap">${escapeHtml(post.content)}</p>
      ${screenshotHtml}
      <div class="flex gap-4 mt-3 text-xs text-gray-500">
        <span>Visibility: ${post.visibilityPercent}%</span>
        <span>Scroll speed: ${Math.round(post.scrollSpeed)} px/s</span>
        <span>Score: ${post.attentionScore.toFixed(1)}</span>
      </div>
    </article>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderPosts(posts: PostRecord[]) {
  const container = document.getElementById('posts-container');
  const emptyState = document.getElementById('empty-state');
  const loading = document.getElementById('loading');

  if (!container) return;

  loading?.classList.add('hidden');

  if (posts.length === 0) {
    container.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  container.innerHTML = posts.map(renderPost).join('');

  // Attach delete handlers
  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.delete;
      if (id) {
        await chrome.runtime.sendMessage({ type: 'DELETE_POST', data: id });
        allPosts = allPosts.filter((p) => p.id !== id);
        applyFilters();
      }
    });
  });
}

function applyFilters() {
  const search = (document.getElementById('search-input') as HTMLInputElement)?.value || '';
  const author = (document.getElementById('filter-author') as HTMLSelectElement)?.value || '';
  const dateFilter = (document.getElementById('filter-date') as HTMLSelectElement)?.value || '';
  const sortBy = (document.getElementById('sort-by') as HTMLSelectElement)?.value || 'seenAt';

  const filtered = filterAndSortPosts(allPosts, search, author, dateFilter, sortBy);
  renderPosts(filtered);
}

function populateAuthorFilter() {
  const authors = [...new Set(allPosts.map((p) => p.authorName))].sort();
  const select = document.getElementById('filter-author') as HTMLSelectElement;
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '<option value="">All authors</option>' + authors.map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  select.value = currentValue;
}

function exportAsJson() {
  const blob = new Blob([JSON.stringify(allPosts, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'linkedin-posts.json');
}

function exportAsCsv() {
  const headers = ['id', 'authorName', 'authorProfile', 'content', 'seenAt', 'dwellTimeSeconds', 'visibilityPercent', 'scrollSpeed', 'postUrl', 'attentionScore'];
  const rows = allPosts.map((p) =>
    headers.map((h) => {
      const val = p[h as keyof PostRecord];
      const str = String(val ?? '');
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, 'linkedin-posts.csv');
}

function exportAsMarkdown() {
  const md = allPosts
    .map(
      (p) => `## ${p.authorName}
- **Date:** ${p.seenAt}
- **Dwell time:** ${formatDuration(p.dwellTimeSeconds)}
- **Profile:** ${p.authorProfile}
- **Post:** ${p.postUrl}

${p.content}

---
`
    )
    .join('\n');
  const blob = new Blob([md], { type: 'text/markdown' });
  downloadBlob(blob, 'linkedin-posts.md');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function init() {
  allPosts = await loadPosts();
  populateAuthorFilter();
  applyFilters();

  document.getElementById('search-input')?.addEventListener('input', debounce(applyFilters, 300));
  document.getElementById('filter-author')?.addEventListener('change', applyFilters);
  document.getElementById('filter-date')?.addEventListener('change', applyFilters);
  document.getElementById('sort-by')?.addEventListener('change', applyFilters);
  document.getElementById('btn-export-json')?.addEventListener('click', exportAsJson);
  document.getElementById('btn-export-csv')?.addEventListener('click', exportAsCsv);
  document.getElementById('btn-export-md')?.addEventListener('click', exportAsMarkdown);
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

init();
