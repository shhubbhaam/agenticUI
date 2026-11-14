// Slide decks (PDF activities, or a PDF inside an article), through the BFF.
// The BFF finds the PDF (LearnHouse document, article PDF block, or a shared Google Drive / Docs file)
// and streams it from one fixed route; the app never gets a LearnHouse or Google address, and its
// session token goes only to the BFF.
// The PDF is downloaded once into the app cache, keyed by the deck's version (so reopening a deck, or
// toggling full screen, is instant and works offline afterwards), and handed to the viewer as base64.
import { Directory, File, Paths } from 'expo-file-system';
import { getSlideDeckInfo, slideDeckFileSource, LearnHouseError } from '../../core/api/learnhouse/client';
import type { SlideDeckInfo } from '../../contracts/slides';

export type SlideDeckProblem = Extract<SlideDeckInfo, { kind: 'unavailable' }>['reason'];

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

/** Cache file name: activity + the BFF's deck version, so a changed deck is fetched again. */
export function slideCacheName(activityUuid: string, version: string): string {
  return `${activityUuid}-${version}.pdf`.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function download(courseUuid: string, activityUuid: string, file: File): Promise<void> {
  const source = slideDeckFileSource(courseUuid, activityUuid);
  if (!source) throw new LearnHouseError(401, 'slides/file', 'Not signed in');
  let res: Response;
  try {
    res = await fetch(source.uri, { headers: source.headers });
  } catch {
    throw new LearnHouseError(0, 'slides/file', 'Network request failed');
  }
  // 422: the BFF fetched it but it is not a PDF (e.g. a Drive file that is not shared publicly).
  if (res.status === 422) throw new SlideDeckUnavailable('not_downloadable');
  if (res.status === 404) throw new SlideDeckUnavailable('no_file');
  if (!res.ok) throw new LearnHouseError(res.status, 'slides/file', `BFF returned ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  // Write beside the target, then move into place, so a failure never leaves a half-written deck.
  const part = new File(file.parentDirectory, `${file.name}.part`);
  try {
    if (part.exists) part.delete();
    part.create();
    await part.write(bytes);
    await part.move(file);
  } catch (e) {
    if (part.exists) part.delete();
    throw e;
  }
}

/**
 * True when the BFF could not be reached at all (fetch threw: no network, server down). A reply from
 * the BFF (LearnHouseError), a bad deck or a contract failure is not "offline".
 */
export function isOfflineError(e: unknown): boolean {
  return e instanceof TypeError;
}

/** Beside the cached PDFs: each deck's last known version and title, so it opens offline (M5). */
function metaFileOf(dir: Directory, activityUuid: string): File {
  return new File(dir, `${activityUuid}.meta.json`.replace(/[^A-Za-z0-9._-]/g, '_'));
}

/** The deck saved on an earlier visit, or null if this activity was never opened online. */
async function openSavedDeck(dir: Directory, activityUuid: string): Promise<SlideDeck | null> {
  try {
    const meta = metaFileOf(dir, activityUuid);
    if (!meta.exists) return null;
    const { version, title } = JSON.parse(await meta.text()) as { version: string; title: string };
    const file = new File(dir, slideCacheName(activityUuid, version));
    if (!(file.exists && file.size > 0)) return null;
    const base64 = await file.base64();
    return base64.startsWith('JVBER') ? { activityUuid, title, base64 } : null;
  } catch {
    return null;
  }
}

export async function getSlideDeck(courseUuid: string, activityUuid: string): Promise<SlideDeck> {
  const dir = new Directory(Paths.cache, 'slides');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

  let info: Awaited<ReturnType<typeof getSlideDeckInfo>>;
  try {
    info = await getSlideDeckInfo(courseUuid, activityUuid);
  } catch (e) {
    // Offline: open the copy saved when the learner last viewed it online.
    const saved = isOfflineError(e) ? await openSavedDeck(dir, activityUuid) : null;
    if (saved) return saved;
    throw e;
  }
  if (info.deck.kind === 'unavailable') throw new SlideDeckUnavailable(info.deck.reason);

  const file = new File(dir, slideCacheName(activityUuid, info.deck.version));
  if (!(file.exists && file.size > 0)) await download(courseUuid, activityUuid, file);

  const base64 = await file.base64();
  // A real PDF starts "%PDF" (base64 "JVBER"); the BFF checks this too. Anything else is dropped from
  // the cache so the next try fetches again.
  if (!base64.startsWith('JVBER')) {
    file.delete();
    throw new SlideDeckUnavailable('not_downloadable');
  }
  // Remember which version and title this is, for opening it offline. Best effort.
  try {
    const meta = metaFileOf(dir, activityUuid);
    if (!meta.exists) meta.create();
    await meta.write(JSON.stringify({ version: info.deck.version, title: info.title }));
  } catch {
    // The deck still opens; it just won't open offline until the next successful visit.
  }
  return { activityUuid, title: info.title, base64 };
}
