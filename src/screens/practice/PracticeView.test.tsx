// The Practice tab runs on sample content: it must say so on screen in every state (W3 review).
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PracticeView } from './PracticeView';
import { MOCK_PRACTICE_DATA } from '../../data/mock/MockPracticeRepository';
import { PRACTICE_SAMPLE_NOTICE } from '../../core/practice/sample';
import type { PracticeData } from '../../core/practice/types';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const noop = () => undefined;

function render(data: PracticeData) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <PracticeView data={data} onStartPractice={noop} onStartFirstLesson={noop} onItemPress={noop} onStrengthenPress={noop} onSettingsPress={noop} />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

const notices = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll((n) => n.props.testID === 'practice-sample-notice' && n.props.message === PRACTICE_SAMPLE_NOTICE);

describe('Practice tab sample-content label', () => {
  it('is shown when items are due', () => {
    expect(notices(render(MOCK_PRACTICE_DATA)).length).toBeGreaterThan(0);
  });

  it('is shown when nothing is due (empty state)', () => {
    expect(notices(render({ ...MOCK_PRACTICE_DATA, dueItems: [] })).length).toBeGreaterThan(0);
  });
});
