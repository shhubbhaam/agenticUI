// M8: text follows Android's system font size, and long text wraps instead of breaking layouts.
import React from 'react';
import fs from 'fs';
import path from 'path';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { ActiveButton } from './atoms/ActiveButton';
import { ContentRow } from './molecules/ContentRow';
import { NextStepCard } from './molecules/home/NextStepCard';
import { GhostCta } from './molecules/onboarding/GhostCta';
import { CoachMessage } from './organisms/coach/CoachParts';

function render(el: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(el); });
  return tree;
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const LONG = 'Understanding gradient descent, learning rates and why your loss curve looks the way it does '.repeat(4).trim();

describe('system font size (M8)', () => {
  const files = sourceFiles(path.join(__dirname, '..'));

  it('never turns font scaling off', () => {
    const offenders = files.filter((f) => /allowFontScaling\s*[=:]\s*\{?\s*false/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('caps text only modestly (at least 1.2x), so it still grows with the setting', () => {
    const tooLow: string[] = [];
    for (const f of files) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/maxFontSizeMultiplier=\{\s*([0-9.]+)\s*\}/g)) {
        if (Number(m[1]) < 1.2) tooLow.push(`${path.basename(f)}: ${m[1]}`);
      }
    }
    expect(tooLow).toEqual([]);
  });
});

describe('long text wraps instead of being cut off (M8)', () => {
  function expectWrapped(tree: ReactTestRenderer.ReactTestRenderer) {
    const node = tree.root.findAll((n) => n.type === Text && n.props.children === LONG)[0];
    expect(node).toBeDefined();
    expect(node.props.numberOfLines).toBeUndefined();
  }

  it('buttons grow with their label (no fixed height)', () => {
    for (const variant of ['plum', 'secondary', 'primary'] as const) {
      const tree = render(<ActiveButton variant={variant} label={LONG} onPress={() => undefined} />);
      expectWrapped(tree);
      const fixed = tree.root.findAll((n) => typeof n.type !== 'string' && StyleSheet.flatten(n.props.style)?.height === 49);
      expect(fixed).toHaveLength(0);
    }
    const ghost = render(<GhostCta label={LONG} onPress={() => undefined} />);
    expectWrapped(ghost);
  });

  it('rows and cards show the whole title', () => {
    expectWrapped(render(<ContentRow icon="eye" title={LONG} subtitle="Subtitle" onPress={() => undefined} />));
    expectWrapped(render(<NextStepCard title={LONG} subtitle="Next" onPress={() => undefined} />));
    expectWrapped(render(<CoachMessage text={LONG} />));
  });
});
