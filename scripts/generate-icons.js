/**
 * PWAアイコン生成スクリプト
 * 
 * 使用方法:
 * 1. npm install canvas
 * 2. node scripts/generate-icons.js
 * 
 * または、オンラインツールを使用:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// アイコンサイズ一覧
const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

// 出力ディレクトリ
const outputDir = path.join(__dirname, '../public/icons');

// ディレクトリがなければ作成
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// アイコン生成関数
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 背景グラデーション
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#0ea5e9'); // primary-500
  gradient.addColorStop(1, '#0284c7'); // primary-600

  // 角丸四角形を描画
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // テキスト「M」を描画
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.5}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', size / 2, size / 2 + size * 0.02);

  // ファイルに保存
  const buffer = canvas.toBuffer('image/png');
  const filename = path.join(outputDir, `icon-${size}.png`);
  fs.writeFileSync(filename, buffer);
  console.log(`Generated: ${filename}`);
}

// 全サイズのアイコンを生成
console.log('Generating PWA icons...');
sizes.forEach(generateIcon);
console.log('Done!');

// スプラッシュスクリーン生成（オプション）
const splashSizes = [
  { width: 640, height: 1136 },   // iPhone SE
  { width: 750, height: 1334 },   // iPhone 8
  { width: 1242, height: 2208 },  // iPhone 8 Plus
  { width: 1125, height: 2436 },  // iPhone X
  { width: 1170, height: 2532 },  // iPhone 12/13
  { width: 1179, height: 2556 },  // iPhone 14
  { width: 1284, height: 2778 },  // iPhone 12/13 Pro Max
  { width: 1290, height: 2796 },  // iPhone 14 Pro Max
];

const splashDir = path.join(__dirname, '../public/splash');
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

function generateSplash(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 中央にアイコン
  const iconSize = Math.min(width, height) * 0.25;
  const gradient = ctx.createLinearGradient(
    width / 2 - iconSize / 2, 
    height / 2 - iconSize / 2, 
    width / 2 + iconSize / 2, 
    height / 2 + iconSize / 2
  );
  gradient.addColorStop(0, '#0ea5e9');
  gradient.addColorStop(1, '#0284c7');

  const radius = iconSize * 0.2;
  const x = width / 2 - iconSize / 2;
  const y = height / 2 - iconSize / 2;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + iconSize - radius, y);
  ctx.quadraticCurveTo(x + iconSize, y, x + iconSize, y + radius);
  ctx.lineTo(x + iconSize, y + iconSize - radius);
  ctx.quadraticCurveTo(x + iconSize, y + iconSize, x + iconSize - radius, y + iconSize);
  ctx.lineTo(x + radius, y + iconSize);
  ctx.quadraticCurveTo(x, y + iconSize, x, y + iconSize - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // テキスト
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${iconSize * 0.5}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', width / 2, height / 2 + iconSize * 0.02);

  // アプリ名
  ctx.fillStyle = '#0ea5e9';
  ctx.font = `bold ${iconSize * 0.2}px Arial, sans-serif`;
  ctx.fillText('MemoHub', width / 2, height / 2 + iconSize * 0.8);

  // ファイルに保存
  const buffer = canvas.toBuffer('image/png');
  const filename = path.join(splashDir, `splash-${width}x${height}.png`);
  fs.writeFileSync(filename, buffer);
  console.log(`Generated: ${filename}`);
}

console.log('\nGenerating splash screens...');
splashSizes.forEach(({ width, height }) => generateSplash(width, height));
console.log('Done!');
