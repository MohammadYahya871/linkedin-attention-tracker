/**
 * Storage abstraction layer - manages persistent storage for post records and settings
 */

import type { PostRecord, ExtensionSettings } from '../models/PostRecord.js';
import { DEFAULT_SETTINGS } from '../models/PostRecord.js';
import { logger } from '../utils/logger.js';

const STORAGE_KEYS = {
  POSTS: 'lat_posts',
  SETTINGS: 'lat_settings'
} as const;

export class StorageManager {
  /**
   * Get all saved posts
   */
  async getPosts(): Promise<PostRecord[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.POSTS);
      const posts = result[STORAGE_KEYS.POSTS] as PostRecord[] | undefined;
      return Array.isArray(posts) ? posts : [];
    } catch (err) {
      logger.error('Failed to get posts:', err);
      return [];
    }
  }

  /**
   * Save a new post record
   */
  async savePost(post: PostRecord): Promise<void> {
    try {
      const settings = await this.getSettings();
      const posts = await this.getPosts();

      // Check for duplicate by ID
      const existingIndex = posts.findIndex((p) => p.id === post.id);
      const updatedPosts =
        existingIndex >= 0
          ? [...posts.slice(0, existingIndex), post, ...posts.slice(existingIndex + 1)]
          : [post, ...posts];

      // Enforce max stored posts
      const trimmed = updatedPosts.slice(0, settings.maxStoredPosts);
      await chrome.storage.local.set({ [STORAGE_KEYS.POSTS]: trimmed });
      logger.info('Post saved:', post.id, '-', post.authorName);
    } catch (err) {
      logger.error('Failed to save post:', err);
      throw err;
    }
  }

  /**
   * Get extension settings
   */
  async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const stored = result[STORAGE_KEYS.SETTINGS] as Partial<ExtensionSettings> | undefined;
      return { ...DEFAULT_SETTINGS, ...stored };
    } catch (err) {
      logger.error('Failed to get settings:', err);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Update extension settings
   */
  async updateSettings(updates: Partial<ExtensionSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...updates };
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    } catch (err) {
      logger.error('Failed to update settings:', err);
      throw err;
    }
  }

  /**
   * Get stats for popup
   */
  async getStats(): Promise<{
    postsToday: number;
    totalPosts: number;
    totalAttentionTime: number;
  }> {
    const posts = await this.getPosts();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const postsToday = posts.filter((p) => p.seenAt >= todayISO).length;
    const totalAttentionTime = posts.reduce((sum, p) => sum + p.dwellTimeSeconds, 0);

    return {
      postsToday,
      totalPosts: posts.length,
      totalAttentionTime
    };
  }

  /**
   * Clear all posts
   */
  async clearPosts(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.POSTS]: [] });
    logger.info('Posts cleared');
  }

  /**
   * Delete a single post by ID
   */
  async deletePost(id: string): Promise<void> {
    const posts = await this.getPosts();
    const filtered = posts.filter((p) => p.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.POSTS]: filtered });
  }
}

export const storageManager = new StorageManager();
