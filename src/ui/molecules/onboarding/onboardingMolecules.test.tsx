import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ChoiceCard } from './ChoiceCard';
import { BudgetPicker } from './BudgetPicker';
import { PrimaryCta } from './PrimaryCta';
import { GhostCta } from './GhostCta';

function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(node); });
  return tree;
}
const texts = (t: ReactTestRenderer.ReactTestRenderer) => t.root.findAllByType(Text).map((n) => n.props.children);

describe('ChoiceCard', () => {
  it('renders title and caption and fires onPress (grid)', () => {
    const onPress = jest.fn();
    const tree = render(
      <ChoiceCard variant="grid" title="Marketing" caption="Campaigns & content" icon="sparkles" selected={false} onPress={onPress} testID="card" />
    );
    expect(texts(tree)).toEqual(expect.arrayContaining(['Marketing', 'Campaigns & content']));
    act(() => { tree.root.findByProps({ testID: 'card' }).props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes selected state and shows a radio only for the row variant', () => {
    const grid = render(<ChoiceCard variant="grid" title="A" selected onPress={() => {}} testID="g" />);
    // Verify grid doesn't show radio (selected state is controlled by parent component)
    expect(grid.root.findAllByProps({ testID: 'radio' })).toHaveLength(0);

    const row = render(<ChoiceCard variant="row" title="B" selected={false} onPress={() => {}} testID="r" />);
    // Verify row shows a radio and it exposes the selected state correctly
    const radios = row.root.findAllByProps({ testID: 'radio' });
    expect(radios.length).toBeGreaterThan(0);
    expect(radios[0].props.accessibilityState).toEqual({ selected: false });
  });

  it('works without a caption or icon (diagnostic rows)', () => {
    const tree = render(<ChoiceCard variant="row" title="Ask it to try again" selected={false} onPress={() => {}} />);
    expect(texts(tree)).toEqual(['Ask it to try again']);
  });
});

describe('BudgetPicker', () => {
  it('renders each option and reports the chosen minutes', () => {
    const onChange = jest.fn();
    const tree = render(<BudgetPicker options={[5, 10, 15, 30]} value={10} onChange={onChange} />);
    expect(texts(tree)).toEqual(expect.arrayContaining(['5', '10', '15', '30']));
    act(() => { tree.root.findByProps({ testID: 'budget-15' }).props.onPress(); });
    expect(onChange).toHaveBeenCalledWith(15);
    expect(tree.root.findByProps({ testID: 'budget-10' }).props.accessibilityState).toEqual({ selected: true });
    expect(tree.root.findByProps({ testID: 'budget-5' }).props.accessibilityState).toEqual({ selected: false });
  });
});

describe('PrimaryCta / GhostCta', () => {
  it('does not fire when disabled, fires when enabled', () => {
    const onPress = jest.fn();
    const off = render(<PrimaryCta label="Continue" onPress={onPress} disabled />);
    const offBtn = off.root.findByProps({ children: 'Continue' }).parent!;
    let node: ReactTestRenderer.ReactTestInstance | null = offBtn;
    while (node && typeof node.props.onPress !== 'function' && node.props.disabled !== true) node = node.parent;
    // disabled ActiveButton passes onPress={undefined}
    expect(node?.props.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();

    const on = render(<PrimaryCta label="Go" onPress={onPress} showArrow={false} />);
    let n: ReactTestRenderer.ReactTestInstance | null = on.root.findByProps({ children: 'Go' }).parent;
    while (n && typeof n.props.onPress !== 'function') n = n.parent;
    act(() => { n!.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('GhostCta renders its label and fires onPress', () => {
    const onPress = jest.fn();
    const tree = render(<GhostCta label="Skip for now" onPress={onPress} />);
    let n: ReactTestRenderer.ReactTestInstance | null = tree.root.findByProps({ children: 'Skip for now' }).parent;
    while (n && typeof n.props.onPress !== 'function') n = n.parent;
    act(() => { n!.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
