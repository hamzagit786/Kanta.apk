import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const RES_DIR = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'res');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// 1. High-resolution Master App Logo SVG (Square with rounded corners)
const masterLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>
  <!-- Background Rounded Rect -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  
  <!-- Subtle inner border highlight -->
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#60A5FA" stroke-width="4" stroke-opacity="0.3" />

  <!-- Scale Balance Icon (Exact Lucide Scale representation scaled to 512x512) -->
  <g transform="translate(96, 96) scale(13.333)" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#shadow)">
    <!-- Center vertical pillar -->
    <path d="M12 3v18" />
    <!-- Base stand -->
    <path d="M7 21h10" />
    <!-- Top balancing beam -->
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    <!-- Left pan with strings -->
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <!-- Right pan with strings -->
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
  </g>
</svg>`;

// 2. Round Logo for ic_launcher_round
const roundLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradRound" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <filter id="shadowRound" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>
  <!-- Circle Background -->
  <circle cx="256" cy="256" r="256" fill="url(#bgGradRound)" />
  <circle cx="256" cy="256" r="248" fill="none" stroke="#60A5FA" stroke-width="4" stroke-opacity="0.3" />

  <!-- Scale Balance Icon -->
  <g transform="translate(96, 96) scale(13.333)" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#shadowRound)">
    <path d="M12 3v18" />
    <path d="M7 21h10" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
  </g>
</svg>`;

// 3. Adaptive Icon Foreground (Transparent background, centered Scale icon)
const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" width="432" height="432">
  <defs>
    <filter id="fgShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>
  <!-- Scale Balance Icon centered in 432x432 (safe zone inner 288x288) -->
  <g transform="translate(108, 108) scale(9)" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#fgShadow)">
    <path d="M12 3v18" />
    <path d="M7 21h10" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
  </g>
</svg>`;

// 4. Splash Screen SVG (Vertical portrait with Scale logo and Kanta branding)
const createSplashSvg = (w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E40AF" />
      <stop offset="100%" stop-color="#172554" />
    </linearGradient>
    <filter id="splashShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>
  <!-- Dark Blue Gradient Background -->
  <rect width="${w}" height="${h}" fill="url(#splashBg)" />

  <!-- Centered Logo Card -->
  <g transform="translate(${w / 2 - 80}, ${h / 2 - 120})">
    <rect width="160" height="160" rx="36" fill="#2563EB" filter="url(#splashShadow)" />
    <rect x="2" y="2" width="156" height="156" rx="34" fill="none" stroke="#60A5FA" stroke-width="2" stroke-opacity="0.4" />
    <g transform="translate(32, 32) scale(4)" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    </g>
  </g>

  <!-- App Title and Subtitle -->
  <text x="${w / 2}" y="${h / 2 + 85}" text-anchor="middle" font-family="system-ui, -apple-system, Roboto, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" letter-spacing="4">
    KANTA
  </text>
  <text x="${w / 2}" y="${h / 2 + 115}" text-anchor="middle" font-family="system-ui, -apple-system, Roboto, sans-serif" font-weight="600" font-size="14" fill="#93C5FD" letter-spacing="1.5">
    COMPUTERIZED WEIGHBRIDGE &amp; KHATA
  </text>
</svg>`;

// Save Master SVG files in public/
fs.writeFileSync(path.join(PUBLIC_DIR, 'logo.svg'), masterLogoSvg);
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), masterLogoSvg);

// Save temporary SVG files for ImageMagick conversion
const tmpLogoSvgPath = path.join(ROOT_DIR, '_tmp_logo.svg');
const tmpRoundSvgPath = path.join(ROOT_DIR, '_tmp_round.svg');
const tmpFgSvgPath = path.join(ROOT_DIR, '_tmp_fg.svg');
fs.writeFileSync(tmpLogoSvgPath, masterLogoSvg);
fs.writeFileSync(tmpRoundSvgPath, roundLogoSvg);
fs.writeFileSync(tmpFgSvgPath, foregroundSvg);

console.log('Master SVG files created.');

// Generate 512x512 logo.png in public/
execSync(`convert -background none "${tmpLogoSvgPath}" -resize 512x512 "${path.join(PUBLIC_DIR, 'icon-512.png')}"`);
execSync(`convert -background none "${tmpLogoSvgPath}" -resize 192x192 "${path.join(PUBLIC_DIR, 'icon-192.png')}"`);
execSync(`convert -background none "${tmpLogoSvgPath}" -resize 64x64 "${path.join(PUBLIC_DIR, 'favicon.png')}"`);

// Android Launcher Mipmap configurations
const mipmapConfigs = [
  { folder: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
];

for (const conf of mipmapConfigs) {
  const dir = path.join(RES_DIR, conf.folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Standard launcher icon
  execSync(`convert -background none "${tmpLogoSvgPath}" -resize ${conf.iconSize}x${conf.iconSize} "${path.join(dir, 'ic_launcher.png')}"`);
  // Round launcher icon
  execSync(`convert -background none "${tmpRoundSvgPath}" -resize ${conf.iconSize}x${conf.iconSize} "${path.join(dir, 'ic_launcher_round.png')}"`);
  // Foreground icon
  execSync(`convert -background none "${tmpFgSvgPath}" -resize ${conf.fgSize}x${conf.fgSize} "${path.join(dir, 'ic_launcher_foreground.png')}"`);
  console.log(`Generated mipmaps for ${conf.folder}`);
}

// Android Splash Screen configurations
const splashConfigs = [
  { folder: 'drawable', w: 480, h: 800 },
  { folder: 'drawable-port-mdpi', w: 320, h: 480 },
  { folder: 'drawable-port-hdpi', w: 480, h: 800 },
  { folder: 'drawable-port-xhdpi', w: 720, h: 1280 },
  { folder: 'drawable-port-xxhdpi', w: 960, h: 1600 },
  { folder: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
  { folder: 'drawable-land-mdpi', w: 480, h: 320 },
  { folder: 'drawable-land-hdpi', w: 800, h: 480 },
  { folder: 'drawable-land-xhdpi', w: 1280, h: 720 },
  { folder: 'drawable-land-xxhdpi', w: 1600, h: 960 },
  { folder: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
];

for (const conf of splashConfigs) {
  const dir = path.join(RES_DIR, conf.folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tmpSplashSvg = path.join(ROOT_DIR, `_tmp_splash_${conf.folder}.svg`);
  fs.writeFileSync(tmpSplashSvg, createSplashSvg(conf.w, conf.h));
  execSync(`convert -background none "${tmpSplashSvg}" "${path.join(dir, 'splash.png')}"`);
  fs.unlinkSync(tmpSplashSvg);
  console.log(`Generated splash for ${conf.folder}`);
}

// Clean up temporary files
fs.unlinkSync(tmpLogoSvgPath);
fs.unlinkSync(tmpRoundSvgPath);
fs.unlinkSync(tmpFgSvgPath);

console.log('All Android launcher icons and splash screens successfully generated!');
