import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import { MessagePill, MESSAGE_PILL_TONES, type MessagePillTone } from './MessagePill';
import { Icon } from '../atoms/Icon';

function render(el: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(el);
  });
  return tree;
}

describe('MessagePill', () => {
  it('renders the message', () => {
    const tree = render(<MessagePill message="Your updated preference is saved." tone="success" />);
    expect(tree.root.findByType(Text).props.children).toBe('Your updated preference is saved.');
  });

  it.each(['info', 'success', 'warning', 'error'] as MessagePillTone[])('uses the %s palette', (tone) => {
    const tree = render(<MessagePill message="m" tone={tone} />);
    const style = StyleSheet.flatten(tree.root.findAllByType(View)[0].props.style);
    expect(style.backgroundColor).toBe(MESSAGE_PILL_TONES[tone].surface);
    expect(style.borderColor).toBe(MESSAGE_PILL_TONES[tone].border);
  });

  it('gives each tone a distinct surface', () => {
    const surfaces = Object.values(MESSAGE_PILL_TONES).map((t) => t.surface);
    expect(new Set(surfaces).size).toBe(4);
  });

  it('renders no icon by default and the given icon when set', () => {
    expect(render(<MessagePill message="m" />).root.findAllByType(Icon)).toHaveLength(0);
    const tree = render(<MessagePill message="m" tone="error" icon="warning" />);
    expect(tree.root.findByType(Icon).props.name).toBe('warning');
  });

  it('announces errors as alerts and everything else politely', () => {
    const err = render(<MessagePill message="m" tone="error" />).root.findAllByType(View)[0];
    expect(err.props.accessibilityRole).toBe('alert');
    expect(err.props.accessibilityLiveRegion).toBe('assertive');
    const ok = render(<MessagePill message="m" tone="success" />).root.findAllByType(View)[0];
    expect(ok.props.accessibilityRole).toBe('text');
    expect(ok.props.accessibilityLiveRegion).toBe('polite');
  });

  it('lets callers override role and live region', () => {
    const v = render(
      <MessagePill message="m" accessibilityRole="alert" accessibilityLiveRegion="none" />
    ).root.findAllByType(View)[0];
    expect(v.props.accessibilityRole).toBe('alert');
    expect(v.props.accessibilityLiveRegion).toBe('none');
  });
});
