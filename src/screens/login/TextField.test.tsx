import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TextInput, Text } from 'react-native';
import { TextField } from './TextField';

describe('TextField', () => {
  it('renders the label and calls onChangeText as the user types', () => {
    const onChangeText = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <TextField label="Email address" value="" onChangeText={onChangeText} />
      );
    });
    act(() => {
      tree.root.findByType(TextInput).props.onChangeText('a@b.com');
    });
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });

  it('shows the error message when provided', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <TextField label="Email address" value="" onChangeText={jest.fn()} error="Please enter a valid email address" />
      );
    });
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Please enter a valid email address');
  });

  it('hides text by default and reveals it when the eye icon is pressed, in secure mode', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <TextField label="Password" value="hunter2" onChangeText={jest.fn()} secureTextEntry testID="password-field" />
      );
    });
    const input = tree.root.findByType(TextInput);
    expect(input.props.secureTextEntry).toBe(true);

    const toggle = tree.root.findByProps({ accessibilityLabel: 'Show password' });
    act(() => {
      toggle.props.onPress();
    });
    const inputAfter = tree.root.findByType(TextInput);
    expect(inputAfter.props.secureTextEntry).toBe(false);
  });
});
