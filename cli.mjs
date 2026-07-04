#!/usr/bin/env node
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { detectType, setupOutput, writeMarkdown, resetCounter } from './lib/utils.mjs';
import { extractPDF } from './lib/pdf.mjs';
import { extractDOCX } from './lib/docx.mjs';
import { extractXLSX } from './lib/xlsx.mjs';
import { addEntry, getExtracted } from './lib/manifest.mjs';

const file = process.argv[2];

if (!file) {
  console.error('Usage: doc-extract <file>');
  process.exit(1);
}

const absPath = resolve(file);
if (!existsSync(absPath)) {
  console.error(`File not found: ${absPath}`);
  process.exit(1);
}

// Check if already extracted
const existing = getExtracted(absPath);
if (existing) {
  console.error(`Already extracted: ${existing.md}`);
  console.log(existing.md);
  process.exit(0);
}

const type = detectType(absPath);
if (!type) {
  console.error(`Unsupported format. Use .pdf, .docx, .xlsx, .xlsm, .csv, or .tsv`);
  process.exit(1);
}

resetCounter();
const { outDir, imgDir, base } = setupOutput(absPath);

console.error(`Extracting ${type.toUpperCase()}: ${absPath}`);
console.error(`Output: ${outDir}`);

let result;
switch (type) {
  case 'pdf':
    result = await extractPDF(absPath, { imgDir });
    break;
  case 'docx':
    result = await extractDOCX(absPath, { imgDir });
    break;
  case 'xlsx':
    result = await extractXLSX(absPath, { base });
    break;
}

const { mdPath } = writeMarkdown(outDir, result.markdown);
addEntry(absPath, mdPath);

// Summary to stderr
console.error('');
console.error(`Done: ${mdPath}`);
if (type === 'pdf') {
  console.error(`  ${result.pages} pages, ${result.imageCount} images${result.skippedPages ? `, ${result.skippedPages} skipped (no text/images)` : ''}`);
} else if (type === 'docx') {
  console.error(`  ${result.imageCount} images`);
  if (result.warnings?.length) {
    for (const w of result.warnings) console.error(`  ⚠ ${w}`);
  }
} else {
  console.error(`  ${result.sheets} sheets, ${result.rows} rows`);
}

// Output the markdown path (stdout → consumed by hook)
console.log(mdPath);
