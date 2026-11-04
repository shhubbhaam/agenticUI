import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('expo-file-system', () => ({ File: class {}, Directory: class {}, Paths: {} }));

import { buildPdfViewerHtml, parseViewerMessage, PDFJS_VERSION } from './engines/pdfViewerHtml';
import { clampPage, useSlidePager } from './useSlidePager';
import { slideDeckErrorMessage } from './useSlideDeck';
import { clampAspect } from './SlidesScreen';
import { slideDeckFile, slideDeckUrl, slideCacheName, SlideDeckUnavailable, findPdfInContent, articlePdfUrl, outlineContent, driveFileId } from '../../data/learnhouse/slidesApi';
import { routeForActivity } from '../../navigation/activityRoute';
import { SlidePager, pagerLabel } from '../../ui/molecules/slides/SlidePager';
import { SlideStage } from '../../ui/organisms/slides/SlideStage';

function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(node); });
  return tree;
}
const touchable = (t: ReactTestRenderer.ReactTestRenderer, id: string) =>
  t.root.findAll((n) => n.type === TouchableOpacity && n.props.testID === id)[0];

describe('routing by content', () => {
  it('opens documents in the slide viewer and everything else in the lesson player', () => {
    expect(routeForActivity('document')).toBe('Slides');
    expect(routeForActivity('article')).toBe('Slides');
    expect(routeForActivity('video')).toBe('Lesson');
    expect(routeForActivity('assignment')).toBe('Assignment');
  });
});

describe('slidesApi helpers', () => {
  const act_ = (o: object) => ({ activity_uuid: 'activity_1', activity_type: 'TYPE_DOCUMENT', ...o }) as any;
  it('accepts a plain .pdf file name on a document activity only', () => {
    expect(slideDeckFile(act_({ content: { filename: 'documentpdf_x.pdf' } }))).toBe('documentpdf_x.pdf');
    expect(slideDeckFile(act_({ content: { filename: 'deck.PDF' } }))).toBe('deck.PDF');
    expect(slideDeckFile(act_({ content: { filename: '../etc/passwd.pdf' } }))).toBeNull();
    expect(slideDeckFile(act_({ content: { filename: 'notes.docx' } }))).toBeNull();
    expect(slideDeckFile(act_({ content: {} }))).toBeNull();
    expect(slideDeckFile(act_({ activity_type: 'TYPE_VIDEO', content: { filename: 'a.pdf' } }))).toBeNull();
  });
  it('builds the LearnHouse documentpdf media path', () => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_BASE_URL = 'https://lh.example.org/';
    expect(slideDeckUrl('org_1', 'course_1', 'activity_1', 'deck.pdf'))
      .toBe('https://lh.example.org/content/orgs/org_1/courses/course_1/activities/activity_1/documentpdf/deck.pdf');
  });
  it('makes a safe cache name per activity and file', () => {
    expect(slideCacheName('activity_1', 'deck.pdf')).toBe('activity_1-deck.pdf');
  });
  it('finds a PDF inside an article, whichever way the editor stored it', () => {
    expect(findPdfInContent({ type: 'doc', content: [{ type: 'paragraph' }] })).toBeNull();
    expect(findPdfInContent({ content: [{ attrs: { src: 'https://cdn.example.org/a/deck.pdf?x=1' } }] })?.ref).toBe('https://cdn.example.org/a/deck.pdf?x=1');
    expect(findPdfInContent({ content: [{ attrs: { blockObject: { block_uuid: 'block_9', content: { file_id: 'file_1', file_format: 'PDF' } } } }] }))
      .toEqual({ ref: 'file_1.pdf', blockUuid: 'block_9' });
    expect(findPdfInContent({ a: ['x.png', 'first.pdf', 'second.pdf'] })?.ref).toBe('first.pdf');
    expect(findPdfInContent('not.pdf.exe')).toBeNull();
  });
  it('recognises Google Drive links to a PDF', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
    expect(driveFileId(`https://drive.google.com/file/d/${id}/preview`)).toBe(id);
    expect(driveFileId(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toBe(id);
    expect(driveFileId(`https://drive.google.com/open?id=${id}`)).toBe(id);
    expect(driveFileId(`https://drive.google.com/uc?export=download&id=${id}`)).toBe(id);
    expect(driveFileId('https://example.com/file/d/abc')).toBeNull();
    expect(driveFileId('http://drive.google.com/file/d/' + id)).toBeNull();
    expect(findPdfInContent({ content: [{ type: 'embed', attrs: { embedUrl: `https://drive.google.com/file/d/${id}/preview` } }] }))
      .toEqual({ ref: `https://drive.google.com/file/d/${id}/preview`, driveId: id });
  });
  it('builds the article block file path and shortens long outlines', () => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_BASE_URL = 'https://lh.example.org';
    expect(articlePdfUrl('org_1', 'course_1', 'activity_1', 'block_9', 'file_1.pdf'))
      .toBe('https://lh.example.org/content/orgs/org_1/courses/course_1/activities/activity_1/dynamic/blocks/pdfBlock/block_9/file_1.pdf');
    expect(JSON.stringify(outlineContent({ t: 'x'.repeat(200) }))).toContain('…');
  });
  it('maps load failures to readable messages', () => {
    expect(slideDeckErrorMessage(new SlideDeckUnavailable('not_slides'))).toMatch(/not a slide deck/);
    expect(slideDeckErrorMessage(new SlideDeckUnavailable('not_downloadable'))).toMatch(/Anyone with the link/);
    expect(slideDeckErrorMessage({ status: 403 })).toMatch(/not available/);
    expect(slideDeckErrorMessage(new Error('x'))).toMatch(/couldn't load/);
  });
});

describe('pdf viewer page', () => {
  it('pins pdf.js, disables eval, and sets the background', () => {
    const html = buildPdfViewerHtml('#25365A');
    expect(html).toContain(`pdf.js/${PDFJS_VERSION}/pdf.min.js`);
    expect(html).toContain('isEvalSupported:false');
    expect(html).toContain('"#25365A"');
  });
  it('parses page messages and ignores junk', () => {
    expect(parseViewerMessage('{"t":"loaded","total":9,"aspect":1.77}')).toEqual({ t: 'loaded', total: 9, aspect: 1.77 });
    expect(parseViewerMessage('{"t":"loaded","total":0}')).toBeNull();
    expect(parseViewerMessage('{"t":"swipe","dir":"next"}')).toEqual({ t: 'swipe', dir: 'next' });
    expect(parseViewerMessage('{"t":"swipe","dir":"up"}')).toBeNull();
    expect(parseViewerMessage('not json')).toBeNull();
  });
  it('clamps odd page shapes', () => {
    expect(clampAspect(16 / 9)).toBeCloseTo(1.778, 2);
    expect(clampAspect(0.2)).toBe(0.6);
    expect(clampAspect(NaN)).toBeCloseTo(16 / 9);
  });
});

describe('useSlidePager', () => {
  function harness() {
    const ref: { current: ReturnType<typeof useSlidePager> } = { current: null as any };
    const H = () => { ref.current = useSlidePager(); return null; };
    render(<H />);
    return ref;
  }
  it('clamps pages to the deck', () => {
    expect(clampPage(0, 9)).toBe(1);
    expect(clampPage(12, 9)).toBe(9);
    expect(clampPage(4, 0)).toBe(1);
  });
  it('moves between slides without running past either end', () => {
    const p = harness();
    act(() => p.current.next());
    expect(p.current.page).toBe(1); // deck not loaded yet
    act(() => p.current.setTotal(3));
    act(() => { p.current.next(); });
    act(() => { p.current.next(); });
    act(() => { p.current.next(); });
    expect(p.current.page).toBe(3);
    act(() => p.current.goTo(1));
    act(() => p.current.prev());
    expect(p.current.page).toBe(1);
  });
});

describe('slide components', () => {
  it('pager label and disabled ends', () => {
    expect(pagerLabel(3, 9)).toBe('3 of 9 slides');
    expect(pagerLabel(1, 1)).toBe('1 of 1 slide');
    const onPrev = jest.fn();
    const onNext = jest.fn();
    const t = render(<SlidePager page={1} total={9} onPrev={onPrev} onNext={onNext} />);
    expect(touchable(t, 'slide-prev').props.disabled).toBe(true);
    act(() => touchable(t, 'slide-next').props.onPress());
    expect(onNext).toHaveBeenCalled();
  });
  it('stage shows the counter and label, and the full-screen button once ready', () => {
    const onFs = jest.fn();
    const t = render(<SlideStage status="ready" page={3} total={9} label="AI Launchpad / Working with context" onToggleFullscreen={onFs} />);
    const texts = t.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('3 / 9');
    expect(texts).toContain('AI Launchpad / Working with context');
    act(() => touchable(t, 'slide-fullscreen').props.onPress());
    expect(onFs).toHaveBeenCalled();
    const loading = render(<SlideStage status="loading" page={1} total={0} onToggleFullscreen={onFs} />);
    expect(loading.root.findAll((n) => n.props.testID === 'slide-fullscreen')).toHaveLength(0);
  });
});

describe('googleExportUrl', () => {
  const { googleExportUrl, findPdfInContent: find } = require('../../data/learnhouse/slidesApi');
  const id = '1AbCdEfGhIjKlMnOp';
  it('maps Docs, Slides and Sheets links to their PDF export', () => {
    expect(googleExportUrl(`https://docs.google.com/document/d/${id}/edit?usp=sharing`)).toBe(`https://docs.google.com/document/d/${id}/export?format=pdf`);
    expect(googleExportUrl(`https://docs.google.com/presentation/d/${id}/preview`)).toBe(`https://docs.google.com/presentation/d/${id}/export/pdf`);
    expect(googleExportUrl(`https://docs.google.com/spreadsheets/d/${id}/htmlview`)).toBe(`https://docs.google.com/spreadsheets/d/${id}/export?format=pdf`);
  });
  it('ignores other links', () => {
    expect(googleExportUrl('https://example.com/document/d/abc')).toBeNull();
    expect(googleExportUrl('https://docs.google.com/forms/d/1AbCdEfGhIjKlMnOp/view')).toBeNull();
  });
  it('is found inside an article embed', () => {
    const content = { type: 'doc', content: [{ type: 'embed', attrs: { embed_url: `https://docs.google.com/document/d/${id}/preview` } }] };
    expect(find(content)).toEqual({ ref: `https://docs.google.com/document/d/${id}/preview`, exportUrl: `https://docs.google.com/document/d/${id}/export?format=pdf` });
  });
});
