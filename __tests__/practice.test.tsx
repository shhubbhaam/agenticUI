import React from 'react';
import ReactTestRenderer, { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PracticeView } from '../src/screens/practice/PracticeView';
import { QuickPracticeView } from '../src/screens/practice/QuickPracticeView';
import { useQuickPractice } from '../src/screens/practice/useQuickPractice';
import { MOCK_DECK, MOCK_PRACTICE_DATA } from '../src/data/mock/MockPracticeRepository';
import type { PracticeData } from '../src/core/practice/types';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>;

function render(el: React.ReactElement) {
  let root!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    root = ReactTestRenderer.create(wrap(el));
  });
  return root;
}

const byId = (root: ReactTestRenderer.ReactTestRenderer, id: string): ReactTestInstance =>
  root.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function')[0] ??
  root.root.findAll((n) => n.props.testID === id)[0];

const hasId = (root: ReactTestRenderer.ReactTestRenderer, id: string) =>
  root.root.findAll((n) => n.props.testID === id).length > 0;

const texts = (root: ReactTestRenderer.ReactTestRenderer): string[] =>
  root.root
    .findAll((n) => (n.type as unknown) === 'Text')
    .map((n) => [n.props.children].flat(Infinity).join(''));

const press = (root: ReactTestRenderer.ReactTestRenderer, id: string) =>
  ReactTestRenderer.act(() => {
    byId(root, id).props.onPress();
  });

function PracticeHarness(props: Partial<React.ComponentProps<typeof PracticeView>> & { data: PracticeData }) {
  return (
    <PracticeView
      onStartPractice={() => {}}
      onStartFirstLesson={() => {}}
      onItemPress={() => {}}
      onStrengthenPress={() => {}}
      onSettingsPress={() => {}}
      {...props}
    />
  );
}

function SessionHarness({ onClose }: { onClose: () => void }) {
  const session = useQuickPractice(MOCK_DECK);
  return <QuickPracticeView deck={MOCK_DECK} session={session} onClose={onClose} />;
}

describe('PracticeView (PR-01)', () => {
  it('items due: hero, revisit list and strengthen card; no downloaded alert by default', () => {
    const root = render(<PracticeHarness data={MOCK_PRACTICE_DATA} />);
    const t = texts(root);
    expect(t).toContain('PRACTICE');
    expect(t).toContain('Rewriting a weak prompt');
    expect(t).toContain('Your first reusable brief');
    expect(t).toContain('2 due');
    expect(t).toContain('One idea to strengthen');
    expect(t).toContain('What belongs in context?');
    expect(hasId(root, 'downloaded-notice')).toBe(false);
  });

  it('shows the downloaded-subset alert when sets are downloaded', () => {
    const root = render(<PracticeHarness data={{ ...MOCK_PRACTICE_DATA, downloadedCount: 2 }} />);
    expect(texts(root)).toContain('2 practice sets are downloaded and ready.');
  });

  it('wires every button', () => {
    const calls: string[] = [];
    const root = render(
      <PracticeHarness
        data={MOCK_PRACTICE_DATA}
        onStartPractice={() => calls.push('start')}
        onItemPress={(id) => calls.push(`item-${id}`)}
        onStrengthenPress={() => calls.push('strengthen')}
        onSettingsPress={() => calls.push('settings')}
      />,
    );
    press(root, 'practice-start-button');
    press(root, 'revisit-item-2');
    press(root, 'practice-next-card');
    press(root, 'practice-settings-button');
    expect(calls).toEqual(['start', 'item-2', 'strengthen', 'settings']);
  });

  it('nothing due: caught-up empty state starts practice', () => {
    const onStart = jest.fn();
    const root = render(<PracticeHarness data={{ ...MOCK_PRACTICE_DATA, dueItems: [] }} onStartPractice={onStart} />);
    const t = texts(root);
    expect(t).toContain('You’re all caught up.');
    expect(t).toContain('Try a little practice');
    expect(t).not.toContain('Ready to revisit');
    press(root, 'empty-state-button');
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('nothing learned yet: first-lesson empty state', () => {
    const onFirst = jest.fn();
    const root = render(
      <PracticeHarness
        data={{ ...MOCK_PRACTICE_DATA, dueItems: [], hasStartedLearning: false }}
        onStartFirstLesson={onFirst}
      />,
    );
    const t = texts(root);
    expect(t).toContain('Your practice grows with you.');
    expect(t).toContain('Start your first lesson');
    press(root, 'empty-state-button');
    expect(onFirst).toHaveBeenCalledTimes(1);
  });
});

describe('QuickPracticeView (PR-02)', () => {
  it('question state: reveal button only', () => {
    const root = render(<SessionHarness onClose={() => {}} />);
    const t = texts(root);
    expect(t).toContain('QUICK PRACTICE');
    expect(t).toContain('1 of 5');
    expect(t).toContain('What three things make a\nuseful AI brief?');
    expect(hasId(root, 'reveal-button')).toBe(true);
    expect(hasId(root, 'remembered-button')).toBe(false);
  });

  it('reveal -> answer with feedback buttons, no finish link on card 1', () => {
    const root = render(<SessionHarness onClose={() => {}} />);
    press(root, 'reveal-button');
    const t = texts(root);
    expect(t).toContain('The connection');
    expect(t).toContain('How did that feel?');
    expect(hasId(root, 'remembered-button')).toBe(true);
    expect(hasId(root, 'see-again-button')).toBe(true);
    expect(hasId(root, 'finish-button')).toBe(false);
  });

  it('remembered advances to card 2; finish link appears on the answer of card 2', () => {
    const root = render(<SessionHarness onClose={() => {}} />);
    press(root, 'reveal-button');
    press(root, 'remembered-button');
    expect(texts(root)).toContain('2 of 5');
    expect(hasId(root, 'reveal-button')).toBe(true);
    press(root, 'reveal-button');
    expect(hasId(root, 'finish-button')).toBe(true);
  });

  it('see it again returns to card 1 with the notice', () => {
    const root = render(<SessionHarness onClose={() => {}} />);
    press(root, 'reveal-button');
    press(root, 'remembered-button');
    press(root, 'reveal-button');
    press(root, 'see-again-button');
    const t = texts(root);
    expect(t).toContain('1 of 5');
    expect(t).toContain('You’re back at card 1. Nothing was lost.');
    press(root, 'reveal-button');
    expect(hasId(root, 'restart-notice')).toBe(false);
  });

  it('finishing the last card completes the session and Done closes it', () => {
    const onClose = jest.fn();
    const root = render(<SessionHarness onClose={onClose} />);
    for (let i = 0; i < 5; i += 1) {
      press(root, 'reveal-button');
      press(root, 'remembered-button');
    }
    const t = texts(root);
    expect(t).toContain('PRACTICE COMPLETE');
    expect(t).toContain('A little more familiar.');
    expect(t).toContain('5 ideas revisited');
    expect(t).toContain('You revisited five ideas. Your original lesson progress stays credited.');
    press(root, 'empty-state-button');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('finish early completes with the number remembered so far; back arrow closes', () => {
    const onClose = jest.fn();
    const root = render(<SessionHarness onClose={onClose} />);
    press(root, 'reveal-button');
    press(root, 'remembered-button');
    press(root, 'reveal-button');
    press(root, 'finish-button');
    expect(texts(root)).toContain('1 idea revisited');
    press(root, 'back-header-back');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
