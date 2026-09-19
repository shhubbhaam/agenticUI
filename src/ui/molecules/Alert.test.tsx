import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Alert } from './Alert';

describe('Alert', () => {
  it('renders the message text', () => {
    let tree: ReactTestRenderer.ReactTestInstance;
    act(() => {
      tree = ReactTestRenderer.create(
        <Alert tone="warning" message="We couldn't finish signing you in. Please try again." />
      );
    });
    const textNode = tree!.root.findByType(Text);
    expect(textNode.props.children).toBe("We couldn't finish signing you in. Please try again.");
  });
});
