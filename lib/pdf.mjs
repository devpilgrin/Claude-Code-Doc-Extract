import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { saveImage } from './utils.mjs';
import { deflateSync } from 'zlib';

export async function extractPDF(filePath, { imgDir }) {
  const data = new Uint8Array(await readFileBytes(filePath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  const pages = [];
  let imageCount = 0;
  let skippedPages = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const ops = await page.getOperatorList();

    // Collect text items
    const textItems = textContent.items
      .map(it => it.str.trim())
      .filter(Boolean);

    // Extract images from page ops
    const images = [];
    const imgNames = new Map(); // ref → filename

    for (let j = 0; j < ops.fnArray.length; j++) {
      const fn = ops.fnArray[j];
      const args = ops.argsArray[j];

      // OPS.paintImageXObject and friends
      if (fn === 85 || fn === 86 || fn === 87 || fn === 88) {
        const imgKey = args[0];
        if (!imgNames.has(imgKey)) {
          try {
            const imgData = await extractImageData(page, imgKey);
            if (imgData) {
              const saved = saveImage(imgDir, imgData.data, imgData.ext);
              imgNames.set(imgKey, saved.relPath);
              images.push(saved.relPath);
              imageCount++;
            }
          } catch { /* skip broken images */ }
        }
      }
    }

    // Skip pages without text AND without images
    if (textItems.length === 0 && images.length === 0) {
      skippedPages++;
      continue;
    }

    // Build page markdown
    let md = textItems.join('\n\n');
    for (const img of images) {
      md += `\n\n![](${img})`;
    }

    if (md.trim()) {
      pages.push({ num: i, md, images });
    }
  }

  const markdown = pages
    .map(p => `## Page ${p.num}\n\n${p.md}`)
    .join('\n\n---\n\n');

  return { markdown, pages: pages.length, imageCount, skippedPages };
}

async function readFileBytes(path) {
  const fs = await import('fs');
  return fs.readFileSync(path);
}

async function extractImageData(page, imgKey) {
  try {
    const img = await new Promise((resolve) => {
      page.objs.get(imgKey, (img) => resolve(img));
    });
    if (!img || !img.data) return null;

    const { data, width, height, kind } = img;

    // JPEG: PDF.js may expose original bytes via .src or ._src
    const jpegBytes = _tryGetJpeg(img);
    if (jpegBytes) {
      return { data: jpegBytes, ext: 'jpg' };
    }

    // PNG: already encoded
    if (_looksLikePNG(data)) {
      return { data: Buffer.from(data), ext: 'png' };
    }

    // Raw pixels → encode to PNG
    const bpp = kind === 1 ? 1 : kind === 2 ? 3 : 4; // GRAY=1, RGB=3, RGBA=4
    const png = encodePNG(data, width, height, bpp);
    return { data: png, ext: 'png' };
  } catch {
    return null;
  }
}

// pony tail: probe for original JPEG bytes in pdf.js image internals
function _tryGetJpeg(img) {
  // v4.x may stash original jpeg on ._src or .src
  if (img._src && img._src.data && img._src.data.length > 2) {
    const d = img._src.data;
    if (d[0] === 0xFF && d[1] === 0xD8) return Buffer.from(d);
  }
  // Sometimes .src is a string with the original name, data elsewhere
  return null;
}

function _looksLikePNG(data) {
  return data.length > 4 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47;
}

// pony tail: minimal RGBA→PNG encoder, ~30 lines, zero deps beyond zlib
function encodePNG(pixels, w, h, bpp) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Build raw scanlines: filter byte (0=none) + pixel data
  const rawRows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * bpp);
    row[0] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * bpp;
      for (let c = 0; c < bpp; c++) row[1 + x * bpp + c] = pixels[si + c];
    }
    rawRows.push(row);
  }
  const raw = Buffer.concat(rawRows);

  const idat = deflateSync(raw, { level: 6 });

  const ihdr = _chunk('IHDR', _packIHDR(w, h, bpp));
  const idatChunk = _chunk('IDAT', idat);
  const iend = _chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idatChunk, iend]);
}

function _chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crc = _crc32(Buffer.concat([typeB, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeB, data, crcBuf]);
}

function _packIHDR(w, h, bpp) {
  const buf = Buffer.alloc(13);
  buf.writeUInt32BE(w, 0);
  buf.writeUInt32BE(h, 4);
  buf[8] = 8;  // bit depth
  buf[9] = bpp === 4 ? 6 : bpp === 3 ? 2 : 0; // color type: 0=gray, 2=RGB, 6=RGBA
  buf[10] = 0; buf[11] = 0; buf[12] = 0; // compression, filter, interlace
  return buf;
}

// pony tail: precomputed CRC table, ~256 ints, faster than computing on the fly
const _crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function _crc32(data) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) c = _crcTable[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
