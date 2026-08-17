import { BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt'] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

const EXTENSION_PATTERN = /\.(pdf|docx|txt)$/i;

export function getSupportedExtension(
  filename: string,
): SupportedExtension | null {
  const match = EXTENSION_PATTERN.exec(filename);
  return match ? (match[1].toLowerCase() as SupportedExtension) : null;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

// pdf-parse separates pages with a "-- 3 of 12 --" marker that would otherwise
// be embedded as content.
const PAGE_MARKER_PATTERN = /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm;

function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(PAGE_MARKER_PATTERN, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractText(
  buffer: Buffer,
  extension: SupportedExtension,
): Promise<string> {
  let raw: string;

  try {
    if (extension === 'pdf') {
      raw = await extractPdf(buffer);
    } else if (extension === 'docx') {
      raw = await extractDocx(buffer);
    } else {
      raw = buffer.toString('utf8');
    }
  } catch (error) {
    throw new BadRequestException(
      `Could not read the ${extension.toUpperCase()} file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const text = normalize(raw);
  if (!text) {
    // Scanned PDFs carry no text layer, so extraction succeeds but yields nothing.
    throw new BadRequestException(
      'No readable text found in this file. Scanned or image-only documents are not supported.',
    );
  }

  return text;
}
