import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { View } from 'react-native';
import { StageCrest } from './StageCrest';

describe('StageCrest', () => {
  it('renders at the existing sm/lg sizes unchanged', async () => {
    let sm: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      sm = ReactTestRenderer.create(<StageCrest tone="plum" icon="layers" size="sm" />);
    });
    const smBox = sm!.root.findAllByType(View)[0];
    expect(smBox.props.style[1]).toMatchObject({ width: 39, height: 41 });

    let lg: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      lg = ReactTestRenderer.create(<StageCrest tone="plum" icon="layers" size="lg" />);
    });
    const lgBox = lg!.root.findAllByType(View)[0];
    expect(lgBox.props.style[1]).toMatchObject({ width: 47, height: 49 });
  });

  it('renders at the new xl size (75x78) for the auth hero icon', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<StageCrest tone="plum" icon="layers" size="xl" />);
    });
    const box = tree!.root.findAllByType(View)[0];
    expect(box.props.style[1]).toMatchObject({ width: 75, height: 78, borderRadius: 23 });
  });
});
