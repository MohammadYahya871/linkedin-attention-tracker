/**
 * Generate placeholder icons for the extension
 * Creates simple blue square PNGs using Canvas (requires canvas package)
 * Run: npm install canvas (optional) or use placeholder
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'icons');
mkdirSync(iconsDir, { recursive: true });

// Minimal valid 48x48 blue PNG (LinkedIn blue #0A66C2)
// Using a simple approach: create via node canvas if available
try {
  const { createCanvas } = await import('canvas');
  const sizes = [16, 32, 48];
  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0A66C2';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', size / 2, size / 2);
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(join(iconsDir, `icon${size}.png`), buffer);
  }
  console.log('Icons generated successfully.');
} catch {
  // Fallback: create minimal 1x1 PNG (Chrome will scale it)
  const minimalPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  for (const size of [16, 32, 48]) {
    writeFileSync(join(iconsDir, `icon${size}.png`), minimalPng);
  }
  console.log('Placeholder icons created (install "canvas" for better icons).');
}
