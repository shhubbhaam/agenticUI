import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { PlayPauseButton } from './PlayPauseButton';
import { CheckpointMarker } from './CheckpointMarker';

function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(node); });
  return tree;
}
const button = (t: ReactTestRenderer.ReactTestRenderer) => t.root.findAllByProps({ testID: 'play-pause' }).pop()!; // native view: a11y + style
const handler = (t: ReactTestRenderer.ReactTestRenderer) => t.root.findAllByProps({ testID: 'play-pause' })[0]; // component: onPress

describe('PlayPauseButton', () => {
  it.each([
    ['play', 'Play video'],
    ['pause', 'Pause video'],
    ['replay', 'Replay video'],
  ] as const)('%s state is announced as "%s"', (state, label) => {
    const t = render(<PlayPauseButton state={state} onPress={() => {}} />);
    expect(button(t).props.accessibilityLabel).toBe(label);
    expect(button(t).props.accessibilityRole).toBe('button');
  });

  it('fires onPress, and not when disabled', () => {
    const onPress = jest.fn();
    const on = render(<PlayPauseButton state="play" onPress={onPress} />);
    act(() => { handler(on).props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
    const offTree = render(<PlayPauseButton state="play" onPress={onPress} disabled />);
    expect(handler(offTree).props.onPress).toBeUndefined();
    expect(button(offTree).props.accessibilityState).toEqual({ disabled: true });
  });

  it('meets the 44pt minimum touch target', () => {
    const style = button(render(<PlayPauseButton state="play" onPress={() => {}} />)).props.style;
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });
});

describe('CheckpointMarker', () => {
  it.each(['upcoming', 'current', 'passed', 'locked'] as const)('renders the %s variant, hidden from screen readers', (state) => {
    const t = render(<CheckpointMarker state={state} />);
    const dot = t.root.findAllByProps({ testID: `checkpoint-${state}` }).pop()!;
    expect(dot.props.accessibilityElementsHidden).toBe(true);
  });
});
