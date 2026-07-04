// pony tail: simple JSON manifest, no DB needed
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

const MANIFEST_PATH = '.temp/.doc-extract.json';

export function getManifest() {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function getExtracted(filePath) {
  const m = getManifest();
  const key = resolve(filePath);
  return m[key] || null;
}

export function listExtracted() {
  return Object.entries(getManifest()).map(([src, info]) => ({
    source: src,
    markdown: info.md,
    directory: info.dir,
    extractedAt: info.extractedAt,
  }));
}

export function addEntry(originalPath, extractedMd) {
  const dir = dirname(MANIFEST_PATH);
  mkdirSync(dir, { recursive: true });
  const m = getManifest();
  m[resolve(originalPath)] = {
    md: extractedMd,
    dir: dirname(extractedMd),
    extractedAt: new Date().toISOString(),
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2), 'utf-8');
}
