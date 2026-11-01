import { deriveIdentityLine, deriveInitial } from './identity';

describe('deriveIdentityLine', () => {
  it('joins role and goal', () => {
    expect(deriveIdentityLine('marketing', 'build-own', 'Org')).toBe('Marketing Manager → AI Workflow Builder');
  });
  it('uses whichever answer exists', () => {
    expect(deriveIdentityLine('sales', null, 'Org')).toBe('Sales Professional');
    expect(deriveIdentityLine(null, 'lead-rollout', 'Org')).toBe('AI Rollout Leader');
  });
  it('falls back when there are no answers', () => {
    expect(deriveIdentityLine(null, null, 'My Org')).toBe('My Org');
  });
});

describe('deriveInitial', () => {
  it('uppercases the first letter', () => {
    expect(deriveInitial('  priya sharma')).toBe('P');
  });
  it('handles an empty name', () => {
    expect(deriveInitial('  ')).toBe('?');
  });
});
