/**
 * Bundle content script into a single file (Chrome content scripts don't support ES modules)
 */
import * as esbuild from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

await esbuild.build({
  entryPoints: [join(root, 'src/content/contentScript.ts')],
  bundle: true,
  format: 'iife',
  outfile: join(root, 'content/contentScript.js'),
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: false,
  define: { 'process.env.NODE_ENV': '"production"' }
});

console.log('Content script bundled.');
