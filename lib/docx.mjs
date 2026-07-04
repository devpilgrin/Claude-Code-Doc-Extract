import mammoth from 'mammoth';
import { saveImage } from './utils.mjs';

export async function extractDOCX(filePath, { imgDir }) {
  const imageMap = new Map();

  const result = await mammoth.convertToMarkdown(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement((image) => {
        return image.read().then((img) => {
          const ext = image.contentType?.includes('png') ? 'png'
            : image.contentType?.includes('jpeg') ? 'jpg'
            : image.contentType?.includes('gif') ? 'gif'
            : 'png';
          const saved = saveImage(imgDir, img, ext);
          imageMap.set(image.altText || saved.name, saved.relPath);
          return { src: saved.relPath };
        });
      }),
    }
  );

  let markdown = result.value;
  const imageCount = imageMap.size;

  // Collect warnings
  const warnings = result.messages
    .filter(m => m.type === 'warning')
    .map(m => m.message);

  return { markdown, imageCount, warnings };
}
