/**
 * Resize source image to Chrome extension icon sizes (16, 32, 48)
 * Source: project assets/icon-source.jpg or pass path as arg
 */
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'icons');

const defaultSource = join(root, 'assets', 'icon-source.jpg');
const altSource = 'C:/Users/hp/.cursor/projects/d-work-tools/assets/c__Users_hp_Downloads_performance-tracking-icon-can-be-600nw-2350304125.jpg';
const sourcePath = process.argv[2] || (existsSync(defaultSource) ? defaultSource : altSource);

const sizes = [16, 32, 48];

async function main() {
  if (!existsSync(sourcePath)) {
    console.error('Source image not found:', sourcePath);
    process.exit(1);
  }

  mkdirSync(iconsDir, { recursive: true });

  for (const size of sizes) {
    await sharp(sourcePath)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon${size}.png`));
    console.log(`Created icon${size}.png`);
  }
  console.log('Icons generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
