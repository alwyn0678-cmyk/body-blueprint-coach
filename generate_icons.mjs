import sharp from 'sharp';
import fs from 'fs';

const size = 512;
const bgHex = '#E07A5F'; // Claude-style standard terracotta/orange

// Geometric B inside a rounded rect
const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${bgHex}" rx="112" ry="112" />
  <g transform="translate(160, 120)" fill="white">
    <!-- Stylized B icon composed of simple premium geometric shapes -->
    <path d="M 0 0 L 80 0 C 140 0 160 30 160 70 C 160 100 140 120 110 130 C 150 140 180 170 180 210 C 180 260 140 280 80 280 L 0 280 Z" fill="none" stroke="white" stroke-width="40" stroke-linejoin="round" />
    <path d="M 0 0 L 0 280" stroke="white" stroke-width="40" stroke-linecap="round" />
    <path d="M 0 135 L 100 135" stroke="white" stroke-width="40" stroke-linecap="round" />
  </g>
</svg>
`;

async function buildIcons() {
  try {
    const buffer = Buffer.from(svg);
    
    await sharp(buffer)
      .resize(512, 512)
      .png()
      .toFile('./public/pwa-512x512.png');
      
    await sharp(buffer)
      .resize(192, 192)
      .png()
      .toFile('./public/pwa-192x192.png');
      
    await sharp(buffer)
      .resize(180, 180)
      .png()
      .toFile('./public/apple-touch-icon.png');
      
    console.log("Successfully generated all PWA icons in Claude orange.");
  } catch (err) {
    console.error("Error generating icons:", err);
  }
}

buildIcons();
