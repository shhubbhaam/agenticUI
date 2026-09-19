import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders the eye icon without crashing', async () => {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Icon name="eye" color="#000" />);
    });
  });

  it('renders the eye-off icon without crashing', async () => {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Icon name="eye-off" color="#000" />);
    });
  });

  it('renders the building icon from its Figma path data', async () => {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Icon name="building" color="#40547F" size={18} />);
    });
  });
});
