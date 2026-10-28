import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, Image } from 'react-native';
import { Polygon } from 'react-native-svg';
import { Avatar } from './atoms/Avatar';
import { FeatureIcon } from './atoms/FeatureIcon';
import { IconButton } from './atoms/roadmap/IconButton';
import { Badge } from './atoms/roadmap/Badge';
import { Icon } from './atoms/Icon';
import { ContentRow } from './molecules/ContentRow';
import { InfoCard } from './molecules/InfoCard';
import { PentagonChart } from './molecules/PentagonChart';
import { SkillIndicator } from './molecules/profile/SkillIndicator';
import { PathProgressBar } from './molecules/roadmap/PathProgressBar';
import { SectionTitle } from './molecules/home/SectionTitle';
import { PageHeader } from './organisms/PageHeader';
import { ProfileIdentity } from './organisms/profile/ProfileIdentity';
import { ProgressSummaryCard } from './organisms/profile/ProgressSummaryCard';
import { ChapterCollection } from './organisms/profile/ChapterCollection';
import { colors } from './tokens/colors';

function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map((n) => n.props.children);

describe('Avatar', () => {
  it('shows the initial, or the image when a uri is given', () => {
    expect(texts(render(<Avatar initial="P" />))).toEqual(['P']);
    const withImage = render(<Avatar initial="P" imageUri="https://example.com/a.png" />);
    expect(withImage.root.findAllByType(Image)).toHaveLength(1);
    expect(withImage.root.findAllByType(Text)).toHaveLength(0);
  });
});

describe('FeatureIcon / Icon glyphs', () => {
  it('renders the new settings, book and check-circle glyphs', () => {
    (['settings', 'book', 'check-circle'] as const).forEach((name) => {
      expect(render(<Icon name={name} color="#000" size={22} />).toJSON()).not.toBeNull();
    });
    expect(render(<FeatureIcon icon="book" />).toJSON()).not.toBeNull();
  });
});

describe('IconButton', () => {
  it('keeps the blocks default and accepts a custom icon, label and press handler', () => {
    const onPress = jest.fn();
    const tree = render(<IconButton icon="settings" accessibilityLabel="Settings" onPress={onPress} />);
    const button = tree.root.findByProps({ accessibilityLabel: 'Settings' });
    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalled();
    expect(render(<IconButton />).toJSON()).not.toBeNull();
  });
});

describe('Badge', () => {
  it('renders text-only when icon is null', () => {
    const tree = render(<Badge tone="neutral" icon={null} label="42%" />);
    expect(texts(tree)).toEqual(['42%']);
  });
});

describe('PathProgressBar', () => {
  it('clamps non-finite and out-of-range values and honours height/fill', () => {
    const tree = render(<PathProgressBar percent={250} height={7} fillColor="#123456" />);
    const views = tree.root.findAllByType(require('react-native').View);
    const fill = views[views.length - 1];
    expect(fill.props.style[1]).toMatchObject({ height: 7, width: '100%', backgroundColor: '#123456' });
    const nan = render(<PathProgressBar percent={NaN} />);
    const nanViews = nan.root.findAllByType(require('react-native').View);
    expect(nanViews[nanViews.length - 1].props.style[1]).toMatchObject({ width: '0%' });
  });
});

describe('SectionTitle compact variant', () => {
  it('renders the compact heading and fires the action', () => {
    const onPressAction = jest.fn();
    const tree = render(<SectionTitle variant="compact" title="Your chapter collection" actionLabel="View path" onPressAction={onPressAction} />);
    expect(texts(tree)).toEqual(['Your chapter collection', 'View path']);
    act(() => tree.root.findByProps({ accessibilityLabel: 'View path' }).props.onPress());
    expect(onPressAction).toHaveBeenCalled();
  });
});

describe('ContentRow', () => {
  it('renders title and subtitle and presses', () => {
    const onPress = jest.fn();
    (['divided', 'plain', 'card'] as const).forEach((variant) => {
      const tree = render(<ContentRow icon="chart" title="Your skills & evidence" subtitle="See what" variant={variant} onPress={onPress} />);
      expect(texts(tree)).toEqual(['Your skills & evidence', 'See what']);
      act(() => tree.root.findByProps({ accessibilityRole: 'button' }).props.onPress());
    });
    expect(onPress).toHaveBeenCalledTimes(3);
  });
});

describe('InfoCard', () => {
  it('renders optional title and leading slot', () => {
    const tree = render(<InfoCard tone="tinted" title="A clearer brief." body="Body" leading={<Text>crest</Text>} />);
    expect(texts(tree)).toEqual(['crest', 'A clearer brief.', 'Body']);
    expect(texts(render(<InfoCard body="Only body" />))).toEqual(['Only body']);
  });
});

describe('PentagonChart', () => {
  const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
  const axesOf = (n: number) => names.slice(0, n).map((label, i) => ({ label, value: i / 4 }));

  it.each([3, 4, 5])('draws three guide rings plus the data polygon and %i labels', (n) => {
    const tree = render(<PentagonChart axes={axesOf(n)} />);
    expect(tree.root.findAllByType(Polygon)).toHaveLength(4);
    expect(texts(tree)).toEqual(names.slice(0, n));
    expect(tree.root.findAllByType(Polygon)[0].props.points.split(' ')).toHaveLength(n);
  });

  it('renders nothing with fewer than three axes', () => {
    expect(render(<PentagonChart axes={axesOf(2)} />).toJSON()).toBeNull();
    expect(render(<PentagonChart axes={[]} />).toJSON()).toBeNull();
  });

  it('caps at five axes', () => {
    const six = [...axesOf(5), { label: 'Zeta', value: 1 }];
    expect(texts(render(<PentagonChart axes={six} />))).toEqual(names);
  });

  it('changes the data polygon when values change', () => {
    const axes = axesOf(5);
    const points = (values: number[]) =>
      render(<PentagonChart axes={axes.map((a, i) => ({ ...a, value: values[i] }))} />).root.findAllByType(Polygon)[3].props.points;
    expect(points([1, 1, 1, 1, 1])).not.toEqual(points([0.2, 0.2, 0.2, 0.2, 0.2]));
    expect(points([0, 0, 0, 0, 0])).toBe(points([0, 0, 0, 0, 0]));
  });
});

describe('SkillIndicator', () => {
  it('shows name, caption and action, and presses', () => {
    const onActionPress = jest.fn();
    const tree = render(
      <SkillIndicator name="Prompting at Work" actionLabel="View evidence" onActionPress={onActionPress} progress={0.8} color={colors.profile.skill.prompting} caption="Exposure" />,
    );
    expect(texts(tree)).toEqual(['Prompting at Work', 'View evidence', 'Exposure']);
    act(() => tree.root.findByProps({ accessibilityLabel: 'View evidence, Prompting at Work' }).props.onPress());
    expect(onActionPress).toHaveBeenCalled();
  });
});

describe('PageHeader / ProfileIdentity / ProgressSummaryCard', () => {
  it('renders the header with description and trailing slot', () => {
    const tree = render(<PageHeader eyebrow="YOU" title="Your progress, made real." description="Intro" trailing={<Text>T</Text>} />);
    expect(texts(tree)).toEqual(['YOU', 'Your progress, made real.', 'T', 'Intro']);
  });
  it('renders identity', () => {
    expect(texts(render(<ProfileIdentity name="Priya Sharma" subtitle="Marketing Manager" initial="P" />))).toEqual(['P', 'Priya Sharma', 'Marketing Manager']);
  });
  it('renders the progress card', () => {
    expect(texts(render(<ProgressSummaryCard title="Three chapters." percent={42} caption="26 of 62 lessons completed" />))).toEqual(['Three chapters.', '42%', '26 of 62 lessons completed']);
  });
});

describe('ChapterCollection', () => {
  const crest = (i: number, label: string | null, completed = false) => ({
    key: `k${i}`,
    label,
    icon: 'blocks' as const,
    tone: 'indigo' as const,
    completed,
  });

  it('labels each crest as completed or locked', () => {
    const tree = render(<ChapterCollection crests={[crest(0, 'Alpha chapter', true), crest(1, 'Beta chapter')]} />);
    expect(tree.root.findByProps({ accessibilityLabel: 'Alpha chapter, completed' })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: 'Beta chapter, locked' })).toBeTruthy();
  });

  it('renders any number of crests in rows of four, truncating names to two lines', () => {
    const long = 'A very long chapter name that will not fit on one line';
    const crests = [...Array.from({ length: 6 }, (_, i) => crest(i, i === 0 ? long : `Chapter ${i}`)), crest(6, 'Seventh'), crest(7, 'Eighth'), crest(8, 'Ninth')];
    const tree = render(<ChapterCollection crests={crests} />);
    expect(texts(tree)).toHaveLength(9);
    expect(tree.root.findByProps({ accessibilityLabel: `${long}, locked` })).toBeTruthy();
    tree.root.findAllByType(Text).forEach((t) => expect(t.props.numberOfLines).toBe(2));
    expect(tree.root.findByProps({ accessibilityLabel: 'Ninth, locked' })).toBeTruthy();
  });

  it('renders unnamed placeholder crests without any label text', () => {
    const tree = render(<ChapterCollection crests={[crest(0, null), crest(1, null)]} />);
    expect(texts(tree)).toEqual([]);
    expect(tree.root.findAllByProps({ accessibilityLabel: 'Chapter, locked' }).length).toBeGreaterThan(0);
  });
});
