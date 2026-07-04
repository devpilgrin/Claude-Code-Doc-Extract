import { readFileSync } from 'fs';
import XLSX from 'xlsx';

export async function extractXLSX(filePath, { base }) {
  const wb = XLSX.readFile(filePath);
  const parts = [];
  let totalRows = 0;

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (data.length === 0) continue;

    // Filter fully-empty rows
    const rows = data.filter(row => row.some(cell => String(cell).trim() !== ''));
    if (rows.length === 0) continue;

    totalRows += rows.length;
    const md = sheetToMarkdown(name, rows);
    parts.push(md);
  }

  if (parts.length === 0) {
    return { markdown: `# ${base}\n\n_No data found in spreadsheet._`, sheets: 0, rows: 0 };
  }

  const markdown = `# ${base}\n\n${parts.join('\n\n')}`;
  return { markdown, sheets: parts.length, rows: totalRows };
}

function sheetToMarkdown(name, rows) {
  if (rows.length === 0) return `## ${name}\n\n_Empty sheet_`;

  const maxCols = Math.max(...rows.map(r => r.length));
  const padded = rows.map(r => [...r, ...Array(maxCols - r.length).fill('')]);

  const header = padded[0];
  const body = padded.slice(1);

  let md = `## ${name}\n\n`;
  md += '| ' + header.map(c => escapePipe(String(c))).join(' | ') + ' |\n';
  md += '| ' + header.map(() => '---').join(' | ') + ' |\n';

  for (const row of body) {
    md += '| ' + row.map(c => escapePipe(String(c))).join(' | ') + ' |\n';
  }

  return md;
}

function escapePipe(s) {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
