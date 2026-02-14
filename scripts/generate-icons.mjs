/**
 * Generate simple SVG-based PNG icons for PWA.
 * Creates 192x192 and 512x512 icons.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, "..", "public", "icons");

// Create a simple SVG icon
function createIconSVG(size) {
  const fontSize = Math.round(size * 0.4);
  const subFontSize = Math.round(size * 0.12);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)"/>
  <text x="50%" y="42%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">脳</text>
  <text x="50%" y="75%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${subFontSize}" font-weight="bold" fill="rgba(255,255,255,0.9)">トレ！</text>
</svg>`;
}

if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

// Write SVG icons (browsers can use SVG for PWA icons, but we'll save as .svg and reference them)
// For maximum compatibility, we save as SVG and update manifest
for (const size of [192, 512]) {
  const svg = createIconSVG(size);
  writeFileSync(join(ICONS_DIR, `icon-${size}.svg`), svg);
  console.log(`Created icon-${size}.svg`);
}

console.log("Icons generated!");
