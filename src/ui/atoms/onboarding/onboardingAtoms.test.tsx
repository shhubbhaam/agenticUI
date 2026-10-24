import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Radio } from './Radio';
import { StepProgress } from './StepProgress';
import { BackHeader } from './BackHeader';
import { Badge } from '../roadmap/Badge';

function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(node); });
  return tree;
}

describe('Radio', () => {
  it('reports its selected state for accessibility', () => {
    const tree = render(<Radio selected />);
    expect(tree.root.findByProps({ testID: 'radio' }).props.accessibilityState).toEqual({ selected: true });
    const off = render(<Radio selected={false} />);
    expect(off.root.findByProps({ testID: 'radio' }).props.accessibilityState).toEqual({ selected: false });
  });
});

describe('StepProgress', () => {
  it('marks earlier segments done, the current one active, the rest idle', () => {
    const tree = render(<StepProgress count={4} current={2} />);
    expect(tree.root.findAllByProps({ testID: 'step-0-done' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'step-1-done' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'step-2-active' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'step-3-idle' }).length).toBeGreaterThan(0);
  });
  it('renders exactly `count` segments', () => {
    const tree = render(<StepProgress count={3} current={0} />);
    expect(tree.root.findAll((n) => typeof n.props.testID === 'string' && /^step-\d-/.test(n.props.testID) && typeof n.type === 'string').length).toBe(3);
  });
});

describe('BackHeader', () => {
  it('shows the eyebrow and a back button only when onBack is provided', () => {
    const onBack = jest.fn();
    const withBack = render(<BackHeader eyebrow="YOUR START · 2 OF 4" onBack={onBack} />);
    expect(withBack.root.findAllByType(Text).map((t) => t.props.children)).toContain('YOUR START · 2 OF 4');
    act(() => { withBack.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress(); });
    expect(onBack).toHaveBeenCalledTimes(1);

    const noBack = render(<BackHeader eyebrow="YOUR START · 1 OF 4" />);
    expect(noBack.root.findAllByProps({ accessibilityLabel: 'Go back' })).toHaveLength(0);
  });
});

describe('Badge', () => {
  it('keeps the green check badge by default and supports a neutral sparkles badge', () => {
    const good = render(<Badge label="Done" />);
    expect(good.root.findAllByType(Text).map((t) => t.props.children)).toContain('Done');
    const neutral = render(<Badge label="A QUICK STARTING POINT" tone="neutral" icon="sparkles" />);
    expect(neutral.root.findAllByType(Text).map((t) => t.props.children)).toContain('A QUICK STARTING POINT');
  });
});
