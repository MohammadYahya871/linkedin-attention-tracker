/**
 * Data model for a saved LinkedIn post
 */

export interface PostRecord {
  /** Unique identifier for the post */
  id: string;
  /** Author display name */
  authorName: string;
  /** LinkedIn profile URL of the author */
  authorProfile: string;
  /** Post text content (first 500-1000 chars) */
  content: string;
  /** ISO date string when post was first seen */
  seenAt: string;
  /** Total time spent viewing in seconds */
  dwellTimeSeconds: number;
  /** Average visibility percentage while in viewport (0-100) */
  visibilityPercent: number;
  /** Scroll speed at time of viewing (pixels per second) */
  scrollSpeed: number;
  /** LinkedIn page URL where post was viewed */
  postUrl: string;
  /** Optional base64 screenshot of the post */
  screenshot?: string;
  /** Computed attention score: dwellTime * visibilityPercent / scrollSpeed */
  attentionScore: number;
}

/** Settings stored in chrome.storage */
export interface ExtensionSettings {
  dwellTimeThreshold: number;
  enableScreenshots: boolean;
  maxStoredPosts: number;
  autoExport: boolean;
  autoExportFormat: 'json' | 'csv' | 'markdown';
  shortcuts: Record<string, string>;
  trackingPaused: boolean;
}

/** Default extension settings */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  dwellTimeThreshold: 10,
  enableScreenshots: false,
  maxStoredPosts: 500,
  autoExport: false,
  autoExportFormat: 'json',
  shortcuts: {},
  trackingPaused: false
};

/** Message types for extension communication */
export type MessageType =
  | 'SAVE_POST'
  | 'GET_POSTS'
  | 'GET_STATS'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'PAUSE_TRACKING'
  | 'RESUME_TRACKING'
  | 'CAPTURE_SCREENSHOT'
  | 'MANUAL_SAVE'
  | 'DELETE_POST'
  | 'EXPORT_DATA'
  | 'CLEAR_DATA';

export interface MessagePayload {
  type: MessageType;
  data?: unknown;
}
