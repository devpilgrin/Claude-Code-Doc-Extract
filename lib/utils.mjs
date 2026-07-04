import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';

const EXT_MAP = {
  '.pdf':  'pdf',
  '.docx': 'docx',
  '.xlsx': 'xlsx',
  '.xlsm': 'xlsx',
  '.csv':  'xlsx',
  '.tsv':  'xlsx',
};

export function detectType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return EXT_MAP[ext] || null;
}

export function setupOutput(filePath) {
  const base = basename(filePath, extname(filePath));
  const outDir = join('.temp', base);
  const imgDir = join(outDir, 'images');
  mkdirSync(imgDir, { recursive: true });
  return { outDir, imgDir, base };
}

export function writeMarkdown(outDir, content, images = []) {
  const mdPath = join(outDir, 'index.md');
  writeFileSync(mdPath, content, 'utf-8');
  return { mdPath, imageCount: images.length };
}

let _imgCounter = 0;
export function saveImage(imgDir, data, ext = 'png') {
  _imgCounter++;
  const name = `img_${String(_imgCounter).padStart(3, '0')}.${ext}`;
  const path = join(imgDir, name);
  writeFileSync(path, data);
  return { path, name, relPath: `images/${name}` };
}

export function resetCounter() { _imgCounter = 0; }
