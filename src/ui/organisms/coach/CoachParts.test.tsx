// M6: the approval card shows exactly the proposal, and answers only through its two buttons.
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ApprovalCard, ToolStep } from './CoachParts';
import type { Proposal } from '../../../contracts/agentEvents';

const proposal: Proposal = {
  proposalId: 'p1', version: 1, sessionId: 's1', action: { type: 'set-next-step', step: 'practice', activityUuid: 'act_2' },
  title: 'Revisit Lesson 4 first', reason: 'Checkpoint 2 not passed.', consequence: 'Your coach plan will point you back to Lesson 4.',
  expiresAt: '2026-11-20T10:10:00Z', hash: 'a'.repeat(64),
};
const texts = (t: ReactTestRenderer.ReactTestRenderer) => t.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));

describe('ApprovalCard', () => {
  it('shows the proposal and calls approve / decline', () => {
    const onApprove = jest.fn(); const onDecline = jest.fn();
    let t!: ReactTestRenderer.ReactTestRenderer;
    act(() => { t = ReactTestRenderer.create(<ApprovalCard proposal={proposal} outcome={null} busy={false} onApprove={onApprove} onDecline={onDecline} />); });
    expect(texts(t)).toEqual(expect.arrayContaining(['Revisit Lesson 4 first', 'Your coach plan will point you back to Lesson 4.', 'Approve', 'Not now']));
    act(() => t.root.findAll((n) => n.props.onPress && texts({ root: n } as never).includes('Approve'))[0].props.onPress());
    act(() => t.root.findAll((n) => n.props.onPress && texts({ root: n } as never).includes('Not now'))[0].props.onPress());
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('after a decision shows the outcome instead of the buttons', () => {
    let t!: ReactTestRenderer.ReactTestRenderer;
    act(() => { t = ReactTestRenderer.create(<ApprovalCard proposal={proposal} outcome="approved" busy={false} onApprove={jest.fn()} onDecline={jest.fn()} />); });
    expect(texts(t)).toContain('Approved. Your coach plan is updated.');
    expect(texts(t)).not.toContain('Approve');
  });
});

describe('ToolStep', () => {
  it('is announced with its state', () => {
    let t!: ReactTestRenderer.ReactTestRenderer;
    act(() => { t = ReactTestRenderer.create(<ToolStep label="Checking your progress" done summary="3 completed" />); });
    expect(t.root.findAll((n) => n.props.accessibilityLabel === 'Checking your progress, done: 3 completed').length).toBeGreaterThan(0);
  });
});
