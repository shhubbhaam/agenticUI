import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { HomeHeader } from './organisms/home/HomeHeader';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function texts(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree.root.findAllByType(Text).map((n) => n.props.children as string | number);
}

describe('HomeHeader', () => {
  it('greets the real first name and shows the real streak', () => {
    const out = texts(<HomeHeader username="Asha" streakCount={4} />);
    expect(out).toContain(4);
    expect(out.some((t) => typeof t === 'string' && /^Good (morning|afternoon|evening), Asha$/.test(t))).toBe(true);
  });

  it.each([undefined, '', '  '])('uses a neutral greeting with no name (%p)', (name) => {
    const out = texts(<HomeHeader username={name} streakCount={0} />);
    expect(out.some((t) => typeof t === 'string' && /^Good (morning|afternoon|evening)$/.test(t))).toBe(true);
    expect(out).toContain(0);
  });
});
