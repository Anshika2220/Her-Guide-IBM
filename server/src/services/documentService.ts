import path from 'path';
import mammoth from 'mammoth';
import { AppError } from '../utils/AppError';

// pdf-parse's index.js runs a debug routine in some bundlers; import the library file directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (b: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js');

export const ALLOWED_EXT = ['.pdf', '.txt', '.docx'];
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_CHARS = 30_000;

const startsWith = (buf: Buffer, bytes: number[]) => bytes.every((b, i) => buf[i] === b);

/** Validate by extension AND magic bytes (never trust the client-supplied mimetype alone). */
function assertSignature(buf: Buffer, ext: string) {
  const ok =
    (ext === '.pdf' && startsWith(buf, [0x25, 0x50, 0x44, 0x46])) || // %PDF
    (ext === '.docx' && startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) || // PK zip
    (ext === '.txt' && !buf.subarray(0, 4096).includes(0));          // no NUL bytes
  if (!ok) throw new AppError(400, "That file doesn't look like a valid " + ext.slice(1).toUpperCase() + ' document.');
}

export async function extractText(buf: Buffer, originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) throw new AppError(400, 'Please upload a PDF, DOCX or TXT file.');
  assertSignature(buf, ext);

  let text = '';
  try {
    if (ext === '.pdf') text = (await pdfParse(buf)).text;
    else if (ext === '.docx') text = (await mammoth.extractRawText({ buffer: buf })).value;
    else text = buf.toString('utf8');
  } catch {
    throw new AppError(422, "We couldn't read that file. It may be damaged or password-protected.");
  }
  text = text.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 50) {
    throw new AppError(422, 'We could not find readable text in that file. Scanned documents (images) are not supported yet.');
  }
  return { text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS, charCount: text.length };
}
