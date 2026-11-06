// bff/src/slides.ts — slide decks: find the PDF behind an activity and decide where the BFF fetches it.
// Moved here from the app (src/data/learnhouse/slidesApi.ts): the app now gets only a title, a
// version and the BFF's file route, never a LearnHouse or Google address.
//
// A deck is either
//  - a TYPE_DOCUMENT activity: content.filename, served by LearnHouse at
//      {origin}/content/orgs/{org}/courses/{course}/activities/{activity}/documentpdf/{file}
//  - a TYPE_DYNAMIC article with a PDF inside its content: an editor PDF block (file_id + file_format),
//    served at …/activities/{activity}/dynamic/blocks/pdfBlock/{block}/{file}, or a link to a PDF on
//    LearnHouse, or an embedded Google Drive file / Google Doc (fetched as Google's PDF export, which
//    works only for files shared as "anyone with the link").
// Any other host is refused: the BFF never fetches an arbitrary URL taken from course content.
import { createHash } from 'node:crypto';
import type { LhActivityFull } from './learnhouse.ts';

export type DeckProblem = 'not_slides' | 'no_file' | 'not_downloadable';
export type DeckLocator =
  | { kind: 'lh'; filename: string; blockUuid?: string }
  | { kind: 'public'; url: string };

const FILE_RE = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$/;
const BLOCK_RE = /^[A-Za-z0-9_-]{1,100}$/;
const PDF_MARK = /\.pdf($|[?#])/i;

/** Hosts the BFF may fetch a public PDF from (no credentials are ever sent there). */
export const PUBLIC_PDF_HOSTS = new Set(['drive.google.com', 'docs.google.com']);

/** A PDF reference found inside an article's content. */
export interface PdfRef {
  /** An absolute https URL, or a file name. */
  ref: string;
  /** The editor block that holds the file, when the content says so. */
  blockUuid?: string;
  /** Set when the PDF is a Google Drive file (the article embeds the Drive viewer). */
  driveId?: string;
  /** Set when the article embeds a Google Doc / Slides / Sheet: Google's own PDF export of it. */
  exportUrl?: string;
}

/** The file id in a Google Drive link: /file/d/<id>/view|preview, open?id=<id>, uc?id=<id>. */
const DRIVE_LINK = /^https:\/\/drive\.google\.com\/(?:file\/d\/|open\?(?:[^#]*&)?id=|uc\?(?:[^#]*&)?id=)([A-Za-z0-9_-]{10,})/i;
export function driveFileId(url: string): string | null {
  return url.length <= 500 ? DRIVE_LINK.exec(url)?.[1] ?? null : null;
}

/** A Google Docs / Slides / Sheets link. Google exports any of these as a PDF itself. */
const GOOGLE_DOC_LINK = /^https:\/\/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]{10,})/i;
export function googleExportUrl(url: string): string | null {
  const m = url.length <= 500 ? GOOGLE_DOC_LINK.exec(url) : null;
  if (!m) return null;
  const kind = m[1].toLowerCase();
  const tail = kind === 'presentation' ? 'export/pdf' : 'export?format=pdf';
  return `https://docs.google.com/${kind}/d/${m[2]}/${tail}`;
}

/**
 * Find a PDF inside a rich-text article's content (any shape: a string ending in .pdf, or an editor
 * block with file_id + file_format "pdf"). Returns the first one in reading order, or null.
 */
export function findPdfInContent(content: unknown): PdfRef | null {
  const stack: { node: unknown; block?: string; depth: number }[] = [{ node: content, depth: 0 }];
  let visited = 0;
  while (stack.length && visited++ < 20000) {
    const { node, block, depth } = stack.pop()!;
    if (typeof node === 'string') {
      const driveId = driveFileId(node);
      if (driveId) return { ref: node, driveId };
      const exportUrl = googleExportUrl(node);
      if (exportUrl) return { ref: node, exportUrl };
      if (node.length <= 500 && PDF_MARK.test(node)) return { ref: node, ...(block ? { blockUuid: block } : {}) };
      continue;
    }
    if (!node || typeof node !== 'object' || depth > 20) continue;
    const o = node as Record<string, unknown>;
    const here = typeof o.block_uuid === 'string' ? o.block_uuid : block;
    if (typeof o.file_id === 'string' && typeof o.file_format === 'string' && o.file_format.toLowerCase() === 'pdf') {
      return { ref: `${o.file_id}.pdf`, ...(here ? { blockUuid: here } : {}) };
    }
    const kids = Array.isArray(node) ? [...node] : Object.values(o);
    for (let i = kids.length - 1; i >= 0; i--) stack.push({ node: kids[i], block: here, depth: depth + 1 });
  }
  return null;
}

/** The deck's PDF file name on a document activity, only if it is a plain file name ending in .pdf. */
export function slideDeckFile(a: LhActivityFull): string | null {
  if (a.activity_type !== 'TYPE_DOCUMENT') return null;
  const f = (a.content as { filename?: unknown } | null | undefined)?.filename;
  if (typeof f !== 'string' || !FILE_RE.test(f)) return null;
  return f.toLowerCase().endsWith('.pdf') ? f : null;
}

/** Where this activity's deck lives, or why it has none. `lhOrigin` = LearnHouse's origin. */
export function resolveDeck(a: LhActivityFull, lhOrigin: string): DeckLocator | { problem: DeckProblem } {
  if (a.activity_type === 'TYPE_DOCUMENT') {
    const filename = slideDeckFile(a);
    return filename ? { kind: 'lh', filename } : { problem: 'no_file' };
  }
  if (a.activity_type !== 'TYPE_DYNAMIC') return { problem: 'not_slides' };
  const found = findPdfInContent(a.content);
  if (!found) return { problem: 'no_file' };
  if (found.driveId) return { kind: 'public', url: `https://drive.google.com/uc?export=download&id=${found.driveId}` };
  if (found.exportUrl) return { kind: 'public', url: found.exportUrl };
  let filename = found.ref;
  if (/^https?:\/\//i.test(found.ref)) {
    // A link to a PDF: only one served by this LearnHouse is used (as this activity's file).
    let url: URL;
    try { url = new URL(found.ref); } catch { return { problem: 'not_downloadable' }; }
    if (url.origin !== lhOrigin) return { problem: 'not_downloadable' };
    const block = /\/pdfBlock\/([^/]+)\//.exec(url.pathname)?.[1];
    filename = decodeURIComponent(url.pathname.split('/').pop() ?? '');
    if (block && BLOCK_RE.test(block)) return FILE_RE.test(filename) ? { kind: 'lh', filename, blockUuid: block } : { problem: 'no_file' };
  } else {
    filename = found.ref.split(/[\\/]/).pop() ?? '';
  }
  if (!FILE_RE.test(filename)) return { problem: 'no_file' };
  if (found.blockUuid && !BLOCK_RE.test(found.blockUuid)) return { problem: 'no_file' };
  return { kind: 'lh', filename, ...(found.blockUuid ? { blockUuid: found.blockUuid } : {}) };
}

/** A short, stable id for a locator: the app keys its cached PDF on it. */
export function deckVersion(activityUuid: string, loc: DeckLocator): string {
  return createHash('sha256').update(`${activityUuid}\n${JSON.stringify(loc)}`).digest('base64url').slice(0, 22);
}
