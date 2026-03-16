/**
 * Copy static assets for Chrome extension build
 * Outputs to project root so extension loads from linkedin-attention-tracker/
 */
import { copyFileSync, mkdirSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const copyRecursive = (src, dest) => {
  if (!existsSync(src)) return;
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
};

// Icons - ensure they exist at root/icons/
const iconsDir = join(root, 'icons');
mkdirSync(iconsDir, { recursive: true });
if (!existsSync(join(iconsDir, 'icon16.png'))) {
  const minimalPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  for (const size of [16, 32, 48]) {
    writeFileSync(join(iconsDir, `icon${size}.png`), minimalPng);
  }
}

// Copy HTML files to root ui/
const htmlFiles = [
  { src: 'src/ui/popup/popup.html', dest: 'ui/popup/popup.html' },
  { src: 'src/ui/dashboard/dashboard.html', dest: 'ui/dashboard/dashboard.html' },
  { src: 'src/ui/settings/settings.html', dest: 'ui/settings/settings.html' }
];

for (const { src, dest } of htmlFiles) {
  const srcPath = join(root, src);
  const destPath = join(root, dest);
  if (existsSync(srcPath)) {
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(srcPath, destPath);
  }
}

// Content styles (contentScript.js is bundled by build-content.js)
const contentStylesSrc = join(root, 'src/content/contentStyles.css');
const contentStylesDest = join(root, 'content/contentStyles.css');
if (existsSync(contentStylesSrc)) {
  mkdirSync(dirname(contentStylesDest), { recursive: true });
  copyFileSync(contentStylesSrc, contentStylesDest);
}

// Tailwind output to each page
const tailwindOutput = join(root, 'ui/styles/output.css');
if (existsSync(tailwindOutput)) {
  for (const page of ['popup', 'dashboard', 'settings']) {
    const dest = join(root, 'ui', page, 'styles.css');
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(tailwindOutput, dest);
  }
}

console.log('Assets copied successfully.');
