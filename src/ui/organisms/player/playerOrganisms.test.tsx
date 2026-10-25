import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { VideoStage } from './VideoStage';
import { CheckpointQuizOverlay } from './CheckpointQuizOverlay';

function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(node); });
  return tree;
}
const texts = (t: ReactTestRenderer.ReactTestRenderer) => t.root.findAllByType(Text).map((n) => n.props.children);
const all = (t: ReactTestRenderer.ReactTestRenderer, id: string) => t.root.findAllByProps({ testID: id });
const byId = (t: ReactTestRenderer.ReactTestRenderer, id: string) => all(t, id).pop()!; // innermost: a11y props
const press = (t: ReactTestRenderer.ReactTestRenderer, id: string) => all(t, id)[0];   // outermost: handlers

describe('VideoStage', () => {
  it('shows the poster when no engine view is given, with the play button', () => {
    const t = render(<VideoStage status="ready" isPlaying={false} onPlayPause={() => {}} posterEyebrow="A field note" posterHeadline="Great demo." />);
    expect(texts(t)).toEqual(expect.arrayContaining(['A field note', 'Great demo.']));
    expect(byId(t, 'play-pause').props.accessibilityLabel).toBe('Play video');
  });

  it('renders the engine view as a slot and puts a tap layer over it', () => {
    const onPlayPause = jest.fn();
    const t = render(<VideoStage status="ready" isPlaying onPlayPause={onPlayPause}><Text>ENGINE</Text></VideoStage>);
    expect(texts(t)).toContain('ENGINE');
    act(() => { press(t, 'stage-tap-layer').props.onPress(); });
    expect(onPlayPause).toHaveBeenCalledTimes(1);
    expect(byId(t, 'play-pause').props.accessibilityLabel).toBe('Pause video');
  });

  it('ended -> replay; loading -> spinner and disabled button', () => {
    expect(byId(render(<VideoStage status="ended" isPlaying={false} onPlayPause={() => {}} />), 'play-pause').props.accessibilityLabel).toBe('Replay video');
    const loading = render(<VideoStage status="loading" isPlaying={false} onPlayPause={() => {}} />);
    expect(all(loading, 'stage-spinner').length).toBeGreaterThan(0);
    expect(byId(loading, 'play-pause').props.accessibilityState).toEqual({ disabled: true });
  });

  it('error shows a retry and no play control; offline-unavailable explains why', () => {
    const onRetry = jest.fn();
    const err = render(<VideoStage status="error" isPlaying={false} onPlayPause={() => {}} onRetry={onRetry} />);
    expect(all(err, 'play-pause')).toHaveLength(0);
    act(() => { press(err, 'stage-retry').props.onPress(); });
    expect(onRetry).toHaveBeenCalled();
    const off = render(<VideoStage status="offlineUnavailable" isPlaying={false} onPlayPause={() => {}} />);
    expect(texts(off).join(' ')).toMatch(/offline/i);
    expect(all(off, 'stage-tap-layer')).toHaveLength(0);
  });
});

describe('CheckpointQuizOverlay', () => {
  const props = {
    checkpointLabel: 'Checkpoint 1 of 2',
    question: 'Who owned the next step?',
    options: [{ id: 'a', label: 'The lead' }, { id: 'b', label: 'Nobody' }],
    selectedId: null as string | null,
    onSelect: jest.fn(),
    onSubmit: jest.fn(),
    onTryAgain: jest.fn(),
    onContinue: jest.fn(),
  };
  // PrimaryCta -> ActiveButton -> TouchableOpacity: find the pressable that renders `label`.
  const cta = (t: ReactTestRenderer.ReactTestRenderer, label: string) => {
    let n: ReactTestRenderer.ReactTestInstance | null = t.root.findByProps({ children: label }).parent;
    while (n && n.props.disabled === undefined) n = n.parent;
    return n!;
  };

  beforeEach(() => jest.clearAllMocks());

  it('answering: options are selectable; Check answer is disabled until one is chosen', () => {
    const t = render(<CheckpointQuizOverlay {...props} status="answering" />);
    expect(texts(t)).toEqual(expect.arrayContaining(['Checkpoint 1 of 2', 'Who owned the next step?', 'The lead', 'Nobody', 'Check answer']));
    expect(cta(t, 'Check answer').props.disabled).toBe(true);
    act(() => { press(t, 'option-b').props.onPress(); });
    expect(props.onSelect).toHaveBeenCalledWith('b');
    const chosen = render(<CheckpointQuizOverlay {...props} selectedId="b" status="answering" />);
    expect(cta(chosen, 'Check answer').props.disabled).toBe(false);
    act(() => { cta(chosen, 'Check answer').props.onPress(); });
    expect(props.onSubmit).toHaveBeenCalled();
  });

  it('submitting: options locked, button disabled', () => {
    const t = render(<CheckpointQuizOverlay {...props} selectedId="b" status="submitting" />);
    act(() => { press(t, 'option-a').props.onPress(); });
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(cta(t, 'Checking…').props.disabled).toBe(true);
  });

  it('incorrect: explains, shows the attempt, Try again', () => {
    const t = render(<CheckpointQuizOverlay {...props} selectedId="a" status="incorrect" attempt={2} feedback="Rewatch the last minute." />);
    expect(texts(t)).toEqual(expect.arrayContaining(['Not quite. Rewatch the last minute.']));
    expect(texts(t).join(' ')).toMatch(/attempt 2/);
    act(() => { cta(t, 'Try again').props.onPress(); });
    expect(props.onTryAgain).toHaveBeenCalled();
  });

  it('correct: explains and continues', () => {
    const t = render(<CheckpointQuizOverlay {...props} selectedId="b" status="correct" feedback="No one was named." />);
    expect(texts(t)).toEqual(expect.arrayContaining(['Correct. No one was named.']));
    act(() => { cta(t, 'Continue watching').props.onPress(); });
    expect(props.onContinue).toHaveBeenCalled();
  });

  it('is announced as a modal question group', () => {
    const t = render(<CheckpointQuizOverlay {...props} status="answering" />);
    expect(byId(t, 'checkpoint-quiz').props.accessibilityViewIsModal).toBe(true);
    expect(t.root.findAll((n) => n.props.accessibilityRole === 'radiogroup').length).toBeGreaterThan(0);
  });
});
