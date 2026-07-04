// doc-extract plugin entry point
// - Auto-intercept: PreToolUse hook on Read → extracts PDF/DOCX/XLSX to .temp/
// - Commands: /extract-doc, /doc-extracted
import { existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const _dir = dirname(fileURLToPath(import.meta.url));

export function activate(api) {
  // Manual extraction command
  api.registerCommand('extract-doc', {
    description: 'Extract text and images from PDF, DOCX, XLSX into .temp/<filename>/',
    arguments: [
      { name: 'file', description: 'Path to the document', required: true }
    ],
    handler: async (ctx, args) => {
      const { execSync } = await import('child_process');
      const script = join(_dir, 'cli.mjs');
      try {
        const out = execSync(`node "${script}" "${args.file}"`, {
          encoding: 'utf-8',
          cwd: ctx.cwd || process.cwd(),
          stdio: ['inherit', 'pipe', 'pipe'],
          timeout: 120_000,
        });
        const lines = out.trim().split('\n');
        const mdPath = lines[lines.length - 1].trim();
        ctx.print(`✅ Extracted: ${mdPath}`);
      } catch (e) {
        ctx.print(`❌ Extraction failed: ${e.stderr || e.message}`);
      }
    }
  });

  // Lookup command: check if a file has been extracted
  api.registerCommand('doc-extracted', {
    description: 'Check if a document has been extracted. Without args — list all extracted docs.',
    arguments: [
      { name: 'file', description: 'Path to original document (optional)', required: false }
    ],
    handler: async (ctx, args) => {
      const manifestPath = join(ctx.cwd || process.cwd(), '.temp', '.doc-extract.json');
      const file = args.file;

      if (!existsSync(manifestPath)) {
        ctx.print('No documents have been extracted yet.');
        return;
      }

      try {
        const { readFileSync } = await import('fs');
        const m = JSON.parse(readFileSync(manifestPath, 'utf-8'));

        if (file) {
          const key = resolve(file);
          const entry = m[key];
          if (entry) {
            ctx.print(`📄 ${key}\n   → Markdown: ${entry.md}\n   → Extracted: ${entry.extractedAt}`);
          } else {
            ctx.print(`❌ Not extracted: ${file}`);
          }
        } else {
          const entries = Object.entries(m);
          if (entries.length === 0) {
            ctx.print('No documents extracted.');
          } else {
            ctx.print(`${entries.length} document(s) extracted:\n`);
            for (const [src, info] of entries) {
              ctx.print(`  ${src} → ${info.md}  (${info.extractedAt})`);
            }
          }
        }
      } catch (e) {
        ctx.print(`Error reading manifest: ${e.message}`);
      }
    }
  });
}
