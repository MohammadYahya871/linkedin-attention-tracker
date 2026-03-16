# LinkedIn Attention Tracker

A production-quality Chrome Extension that tracks your attention while browsing LinkedIn and automatically saves posts you spend time reading.

## Features

- **Automatic post saving** — Saves posts visible for longer than a configurable dwell time (default: 10 seconds)
- **Dwell time tracking** — Accurate reading time per post
- **Scroll velocity tracking** — Estimates attention based on scroll speed
- **Optional screenshots** — Capture post screenshots when saving (toggle in settings)
- **Attention score** — `dwellTime × visibilityPercent / scrollSpeed`
- **Feed dashboard** — View, search, filter, and export saved posts
- **Keyboard shortcuts** — Save manually, open dashboard, pause tracking, and more

## Architecture

```
/extension
  manifest.json

/src
  /background          # Service worker, storage, messaging
  /content             # Feed observer, visibility tracker, post tracker
  /models              # PostRecord, settings types
  /utils               # Debounce, logger, DOM helpers, time utils
  /ui                  # Popup, dashboard, settings
  /shortcuts           # Keyboard shortcut definitions
```

### Module Overview

| Module | Responsibility |
|--------|----------------|
| **serviceWorker.ts** | Background entry point, command routing |
| **storageManager.ts** | chrome.storage abstraction, CRUD for posts/settings |
| **messageRouter.ts** | Handles messages between content, popup, background |
| **contentScript.ts** | Main content entry, coordinates feed observer and post tracker |
| **feedObserver.ts** | MutationObserver for dynamically loaded LinkedIn posts |
| **visibilityTracker.ts** | IntersectionObserver for visibility and dwell time |
| **postTracker.ts** | Coordinates visibility with threshold, builds PostRecord, saves |
| **domHelpers.ts** | LinkedIn DOM selectors, post extraction |
| **PostRecord.ts** | Data model and settings types |

## Building & Loading

### Prerequisites

- Node.js 18+
- npm

### Build

```bash
npm install
npm run build
```

Output is in the `dist/` folder.

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the **linkedin-attention-tracker** project folder (the one containing manifest.json)

### Development

```bash
npm run watch
```

Then reload the extension in Chrome after changes.

## Keyboard Shortcuts

Chrome allows a maximum of 4 commands per extension.

| Shortcut | Action |
|----------|--------|
| Alt+Shift+S | Save current post manually |
| Alt+Shift+D | Open dashboard |
| Alt+Shift+P | Pause/resume tracking |
| Alt+Shift+C | Capture screenshot of current post |

Settings: open via the extension popup. Customize shortcuts in Chrome: **Extensions** → **Keyboard shortcuts**

## Data Model

```typescript
interface PostRecord {
  id: string;
  authorName: string;
  authorProfile: string;
  content: string;
  seenAt: string;        // ISO date
  dwellTimeSeconds: number;
  visibilityPercent: number;
  scrollSpeed: number;
  postUrl: string;
  screenshot?: string;   // Base64 PNG
  attentionScore: number;
}
```

## Export Formats

- **JSON** — Full structured data
- **CSV** — Spreadsheet-friendly
- **Markdown** — Human-readable with links

## Permissions

- `storage` — Save posts and settings
- `activeTab` — Screenshot capture
- `scripting` — Content script injection
- `tabs` — Tab management, commands
- `https://www.linkedin.com/*` — Run only on LinkedIn

## LinkedIn DOM Resilience

The extension uses multiple selectors to handle LinkedIn's dynamic feed:

- `[data-urn]` — Post URN attribute
- `.feed-shared-update-v2` — Feed card class
- `.feed-shared-actor__name` — Author name
- `.feed-shared-text` — Post content

If LinkedIn changes their DOM, update selectors in `src/utils/domHelpers.ts` and `src/content/feedObserver.ts`.

## Icons

Icons are generated from `assets/icon-source.jpg`. To regenerate:

```bash
npm run icons
```

Or pass a custom source path: `node scripts/resize-icon.js /path/to/image.jpg`

Place custom PNGs (16x16, 32x32, 48x48) directly in `icons/` to override.

## License

MIT
