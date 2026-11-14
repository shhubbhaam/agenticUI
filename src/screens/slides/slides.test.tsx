import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

jest.mock('expo-file-system', () => ({ File: class {}, Directory: class {}, Paths: {} }));

import { buildPdfViewerHtml, parseViewerMessage, PDFJS_VERSION } from './engines/pdfViewerHtml';
import { clampPage, useSlidePager } from './useSlidePager';
import { slideDeckErrorMessage } from './useSlideDeck';
import { clampAspect } from './SlidesScreen';
import { slideCacheName, SlideDeckUnavailable, isOfflineError } from '../../data/learnhouse/slidesApi';
import { LearnHouseError } from '../../core/api/learnhouse/client';
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

// PDF discovery (document files, article blocks, Drive / Google Docs links) moved to the BFF:
// see bff/test/slidesAssignments.test.ts.
describe('slidesApi', () => {
  it('makes a safe cache name per activity and deck version', () => {
    expect(slideCacheName('activity_1', 'v1AbCdEfGh')).toBe('activity_1-v1AbCdEfGh.pdf');
    expect(slideCacheName('a/b', 'v')).toBe('a_b-v.pdf');
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

describe('slides offline (M5)', () => {
  it('only a failed fetch counts as offline; a BFF answer or a bad deck does not', () => {
    expect(isOfflineError(new TypeError('Network request failed'))).toBe(true);
    expect(isOfflineError(new LearnHouseError(404, '/slides', 'BFF returned 404'))).toBe(false);
    expect(isOfflineError(new SlideDeckUnavailable('no_file'))).toBe(false);
    expect(isOfflineError(new Error('contract'))).toBe(false);
  });
});
