// Slide decks (LearnHouse PDF "document" activities), straight from LearnHouse — same direct
// pattern as lessonApi.ts. Uses the signed-in user's own JWT from SecureStore, never the admin token.
//
// GET /api/v1/activities/{activity_uuid} gives the activity; a PDF activity is TYPE_DOCUMENT with
// content.filename. The file is served at
//   {origin}/content/orgs/{org_uuid}/courses/{course_uuid}/activities/{activity_uuid}/documentpdf/{file}
// It is downloaded once into the app cache (so reopening a deck, or toggling full screen, is
// instant and works offline afterwards) and handed to the viewer as base64.
import { Directory, File, Paths } from 'expo-file-system';
import { ApiError, request } from './client';
import { getStoredToken } from './secureToken';
import { fetchSession } from './authApi';
import { baseUrl, lessonActivitySchema, type LessonActivity } from './lessonApi';

export type SlideDeckProblem = 'not_slides' | 'no_file' | 'not_downloadable';

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

const PDF_MARK = /\.pdf($|[?#])/i;

/**
 * Find a PDF inside a rich-text article's content (any shape: a string ending in .pdf, or an editor
 * block with file_id + file_format "pdf"). Returns the first one, or null.
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
    // Children are pushed in reverse so the first PDF in reading order wins.
    const kids = Array.isArray(node) ? [...node] : Object.values(o);
    for (let i = kids.length - 1; i >= 0; i--) stack.push({ node: kids[i], block: here, depth: depth + 1 });
  }
  return null;
}

/** A short structural outline of an article's content, for the dev log when no PDF is found. */
export function outlineContent(node: unknown, depth = 0): unknown {
  if (typeof node === 'string') return node.length > 60 ? `${node.slice(0, 60)}…` : node;
  if (!node || typeof node !== 'object') return node;
  if (depth >= 6) return '…';
  if (Array.isArray(node)) return node.slice(0, 8).map((n) => outlineContent(n, depth + 1));
  return Object.fromEntries(Object.entries(node).slice(0, 12).map(([k, v]) => [k, outlineContent(v, depth + 1)]));
}

/** Thrown when the activity exists but is not a PDF the viewer can open. */
export class SlideDeckUnavailable extends Error {
  reason: SlideDeckProblem;
  constructor(reason: SlideDeckProblem) {
    super(reason === 'not_slides' ? 'Activity is not a slide deck' : reason === 'not_downloadable' ? 'File is not a downloadable PDF' : 'Slide deck has no PDF file');
    this.reason = reason;
    this.name = 'SlideDeckUnavailable';
  }
}

export interface SlideDeck {
  activityUuid: string;
  title: string;
  /** The whole PDF, base64-encoded, for the pdf.js viewer. */
  base64: string;
}

/** The deck's PDF file name, only if it is a plain file name ending in .pdf (no paths). */
export function slideDeckFile(a: LessonActivity): string | null {
  if (a.activity_type !== 'TYPE_DOCUMENT') return null;
  const f = a.content?.filename;
  if (typeof f !== 'string' || !/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$/.test(f)) return null;
  return f.toLowerCase().endsWith('.pdf') ? f : null;
}

/** Where an editor PDF block's file is served (unconfirmed against a live server; see getSlideDeck). */
export function articlePdfUrl(orgUuid: string, courseUuid: string, activityUuid: string, blockUuid: string, filename: string): string {
  const e = encodeURIComponent;
  return `${baseUrl()}/content/orgs/${e(orgUuid)}/courses/${e(courseUuid)}/activities/${e(activityUuid)}/dynamic/blocks/pdfBlock/${e(blockUuid)}/${e(filename)}`;
}

export function slideDeckUrl(orgUuid: string, courseUuid: string, activityUuid: string, filename: string): string {
  const e = encodeURIComponent;
  return `${baseUrl()}/content/orgs/${e(orgUuid)}/courses/${e(courseUuid)}/activities/${e(activityUuid)}/documentpdf/${e(filename)}`;
}

/** Cache file name: activity + LearnHouse file name, so a re-uploaded deck with a new name is fetched again. */
export function slideCacheName(activityUuid: string, filename: string): string {
  return `${activityUuid}-${filename}`.replace(/[^A-Za-z0-9._-]/g, '_');
}

/** Only the LearnHouse server itself ever gets the user's token. */
function sameOrigin(url: string): boolean {
  try { return new URL(url).origin === new URL(baseUrl()).origin; } catch { return false; }
}

async function cachedPdf(url: string, name: string, token: string): Promise<File> {
  const dir = new Directory(Paths.cache, 'slides');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, name);
  if (file.exists && file.size > 0) return file;
  // Android streams into the target as it downloads: download beside it, then move into place,
  // so a dropped connection never leaves a half-written deck in the cache.
  const part = new File(dir, `${name}.part`);
  try {
    await File.downloadFileAsync(url, part, { headers: sameOrigin(url) ? { Authorization: `Bearer ${token}` } : {}, idempotent: true });
    await part.move(file);
  } catch (e) {
    if (part.exists) part.delete();
    if (__DEV__) console.log('[slides] download failed:', url, String((e as Error)?.message ?? e).slice(0, 300));
    // A failed download from Google (private file, sign-in required, export refused) is "not downloadable".
    if (!sameOrigin(url)) throw new SlideDeckUnavailable('not_downloadable');
    throw e;
  }
  return file;
}

export async function getSlideDeck(courseUuid: string, activityUuid: string): Promise<SlideDeck> {
  const token = await getStoredToken();
  if (!token) throw new ApiError(401, 'Not signed in');

  const raw = await request(`/api/v1/activities/${encodeURIComponent(activityUuid)}`, { token });
  const activity = lessonActivitySchema.parse(raw);
  if (activity.activity_type !== 'TYPE_DOCUMENT' && activity.activity_type !== 'TYPE_DYNAMIC') throw new SlideDeckUnavailable('not_slides');

  // The media path needs the org's uuid, which only the session carries.
  const orgUuid = (await fetchSession(token)).roles[0]?.org.org_uuid;
  if (!orgUuid) throw new ApiError(403, 'No organisation on this session');

  let url: string;
  let cacheName: string;
  if (activity.activity_type === 'TYPE_DOCUMENT') {
    const filename = slideDeckFile(activity);
    if (!filename) throw new SlideDeckUnavailable('no_file');
    url = slideDeckUrl(orgUuid, courseUuid, activityUuid, filename);
    cacheName = slideCacheName(activityUuid, filename);
  } else {
    // An article: look for a PDF inside its content.
    if (__DEV__) {
      // Every link inside the article, so a failed lookup shows what the embed really points at.
      const links = (JSON.stringify(activity.content ?? null).match(/https?:[^"\s\\]+/g) ?? []).slice(0, 10);
      console.log('[slides] activity', activityUuid, activity.activity_type, 'links:', JSON.stringify(links));
    }
    const found = findPdfInContent(activity.content);
    if (!found) {
      if (__DEV__) console.log('[slides] no PDF found in article content:', JSON.stringify(outlineContent(activity.content)).slice(0, 1500));
      throw new SlideDeckUnavailable('no_file');
    }
    if (found.driveId) {
      // The article embeds a Google Drive viewer. Drive's direct-download form of the same file
      // works without a login only when the file is shared as "anyone with the link".
      url = `https://drive.google.com/uc?export=download&id=${found.driveId}`;
    } else if (found.exportUrl) {
      // A Google Doc / Slides / Sheet: Google converts it to PDF (needs "anyone with the link").
      url = found.exportUrl;
    } else if (/^https:\/\//i.test(found.ref)) {
      url = found.ref;
    } else {
      const filename = found.ref.split(/[\\/]/).pop() ?? '';
      if (!/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$/.test(filename)) throw new SlideDeckUnavailable('no_file');
      url = found.blockUuid ? articlePdfUrl(orgUuid, courseUuid, activityUuid, found.blockUuid, filename) : slideDeckUrl(orgUuid, courseUuid, activityUuid, filename);
    }
    if (__DEV__) console.log('[slides] article PDF url:', url);
    cacheName = slideCacheName(activityUuid, found.driveId ? `drive-${found.driveId}.pdf` : found.exportUrl ? `gdoc-${found.exportUrl.split('/d/')[1].split('/')[0]}.pdf` : url.split('/').slice(-2).join('-'));
  }

  const file = await cachedPdf(url, cacheName, token);
  const base64 = await file.base64();
  if (__DEV__) console.log('[slides] downloaded', file.size, 'bytes, starts with', JSON.stringify(base64.slice(0, 12)));
  // A real PDF starts "%PDF" (base64 "JVBER"). Anything else (a Drive sign-in or "can't scan this file"
  // page, an error page) is not a deck: drop it from the cache so the next try fetches again.
  if (!base64.startsWith('JVBER')) {
    file.delete();
    throw new SlideDeckUnavailable('not_downloadable');
  }
  return { activityUuid, title: activity.name?.trim().slice(0, 200) || 'Slides', base64 };
}
