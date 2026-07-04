#!/usr/bin/env node
// PreToolUse hook: intercepts Read on PDF/DOCX/XLSX, auto-extracts to .temp/
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const MANIFEST = '.temp/.doc-extract.json';
const DOC_EXT = /\.(pdf|docx|xlsx|xlsm|csv|tsv)$/i;

async function main() {
  // Read hook context from stdin
  const input = JSON.parse(readFileSync(0, 'utf-8'));
  const { tool_name, tool_input } = input;

  // Only intercept Read calls
  if (tool_name !== 'Read') {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const filePath = tool_input?.file_path;
  if (!filePath || !DOC_EXT.test(filePath)) {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT
    || join(dirname(fileURLToPath(import.meta.url)), '..');
  const cli = join(pluginRoot, 'cli.mjs');

  try {
    // Run extraction
    const result = execSync(`node "${cli}" "${absPath}"`, {
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    const mdPath = result.trim().split('\n').pop().trim(); // last line is the md path

    // Update manifest
    updateManifest(absPath, mdPath);

    // Block the original Read, redirect to extracted content
    const msg = [
      `📄 Auto-extracted: ${absPath}`,
      `   → Markdown: ${mdPath}`,
      `   → Use Read on "${mdPath}" or the images directory.`,
    ].join('\n');

    process.stderr.write(msg + '\n');
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: msg,
      extractedPath: mdPath,
    }));
  } catch (e) {
    // Extraction failed — let the original Read proceed
    process.stderr.write(`⚠ doc-extract failed: ${e.stderr || e.message}\n`);
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
}

function updateManifest(originalPath, extractedMd) {
  const dir = dirname(MANIFEST);
  mkdirSync(dir, { recursive: true });

  let manifest = {};
  if (existsSync(MANIFEST)) {
    try { manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8')); } catch {}
  }

  manifest[resolve(originalPath)] = {
    md: extractedMd,
    dir: dirname(extractedMd),
    extractedAt: new Date().toISOString(),
  };

  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf-8');
}

main().catch((e) => {
  process.stderr.write(`doc-extract hook error: ${e.message}\n`);
  process.stdout.write(JSON.stringify({ decision: 'allow' }));
});
