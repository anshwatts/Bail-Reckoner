import * as pdfModule from 'pdf-parse';

export function cleanText(rawText) {
  if (typeof rawText !== 'string') {
    return '';
  }

  let text = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  text = text.replace(/\bf\.i\.r\./gi, 'FIR');
  text = text.replace(/\bp\.s\./gi, 'PS');
  text = text.replace(/\b[uU]\s*[\/\.]\s*[sS]\b/g, 'under section');
  text = text.replace(/\bsec\.\s*/gi, 'section ');
  text = text.replace(/\b(dtd\.|dt\.)\s*/gi, 'dated ');
  text = text.replace(/\b[rR]\s*\/\s*[wW]\b/g, 'read with');

  text = text.replace(/[^\S\r\n]+/g, ' ');
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export async function extractTextFromBuffer(buffer, mimeType) {
  if (!buffer) {
    throw new Error('Invalid buffer input');
  }

  const normalizedMime = (mimeType || '').trim().toLowerCase();

  if (normalizedMime === 'application/pdf') {
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const result = await parser.getText();
      return cleanText(result.text || '');
    }
    if (typeof pdfModule.default === 'function') {
      const result = await pdfModule.default(buffer);
      return cleanText(result.text || '');
    }
    if (typeof pdfModule === 'function') {
      const result = await pdfModule(buffer);
      return cleanText(result.text || '');
    }
    throw new Error('Unsupported PDF parser configuration');
  }

  if (
    normalizedMime.startsWith('text/') ||
    normalizedMime === 'application/json' ||
    normalizedMime === ''
  ) {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : String(buffer);
    return cleanText(text);
  }

  throw new Error(`Unsupported document format: ${mimeType}`);
}
