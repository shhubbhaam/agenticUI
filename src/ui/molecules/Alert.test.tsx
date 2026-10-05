import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Alert } from './Alert';
import { Icon } from '../atoms/Icon';

describe('Alert', () => {
  it('renders the message text', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <Alert tone="warning" message="We couldn't finish signing you in. Please try again." />
      );
    });
    const textNode = tree.root.findByType(Text);
    expect(textNode.props.children).toBe("We couldn't finish signing you in. Please try again.");
  });

  it('renders a warning icon alongside the message so the error state is not color-only', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <Alert tone="warning" message="We couldn't finish signing you in. Please try again." />
      );
    });
    const iconNode = tree.root.findByType(Icon);
    expect(iconNode.props.name).toBe('warning');
  });

  it('renders the info tone with its message and no warning icon', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<Alert tone="info" message="Welcome back. Your earlier answers are saved." />);
    });
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Welcome back. Your earlier answers are saved.');
  });
});
