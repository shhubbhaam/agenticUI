import React from 'react';
import { Text } from 'react-native';
import { QuestionLayout } from './QuestionLayout';
import { renderScreen, textsOf } from '../../../screens/onboarding/testUtils';

const base = {
  eyebrow: 'YOUR START · 1 OF 4',
  progress: { count: 4, current: 1 },
  title: 'Title here',
  subtitle: 'Subtitle here',
  footer: <Text>Footer CTA</Text>,
};

describe('QuestionLayout', () => {
  it('renders title, subtitle, children, footer, footnote and notice', () => {
    const tree = renderScreen(
      <QuestionLayout {...base} footnote="Small print" notice={<Text>Notice text</Text>}>
        <Text>Child content</Text>
      </QuestionLayout>,
    );
    const texts = textsOf(tree);
    ['YOUR START · 1 OF 4', 'Title here', 'Subtitle here', 'Child content', 'Footer CTA', 'Small print', 'Notice text'].forEach((t) =>
      expect(texts).toContain(t),
    );
  });

  it('shows the back button only when onBack is given', () => {
    const without = renderScreen(<QuestionLayout {...base}><Text>c</Text></QuestionLayout>);
    expect(without.root.findAllByProps({ accessibilityLabel: 'Go back' })).toHaveLength(0);
    const withBack = renderScreen(<QuestionLayout {...base} onBack={jest.fn()}><Text>c</Text></QuestionLayout>);
    expect(withBack.root.findAllByProps({ accessibilityLabel: 'Go back' }).length).toBeGreaterThan(0);
  });

  it('renders the top accessory', () => {
    const tree = renderScreen(
      <QuestionLayout {...base} topAccessory={<Text>Accessory</Text>}><Text>c</Text></QuestionLayout>,
    );
    expect(textsOf(tree)).toContain('Accessory');
  });
});
