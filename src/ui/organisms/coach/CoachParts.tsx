// M6: the AI coach's trusted component catalogue. The coach's events can only ever be shown through
// these four components (text, tool step, approval card, status); nothing the agent sends is
// rendered any other way or executed.
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { PrimaryCta } from '../../molecules/onboarding/PrimaryCta';
import { GhostCta } from '../../molecules/onboarding/GhostCta';
import type { Proposal } from '../../../contracts/agentEvents';

const card = { backgroundColor: colors.surface.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 } as const;
const body = { fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-14'] };
const strong = { fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-15-base'] };

/** The coach's message, growing as it streams. Announced politely to screen readers. */
export const CoachMessage: React.FC<{ text: string }> = ({ text }) =>
  text ? (
    <View style={card} accessibilityLiveRegion="polite" testID="coach-message">
      <Text style={body}>{text}</Text>
    </View>
  ) : null;

/** One tool step: what the coach is doing, then what it found. */
export const ToolStep: React.FC<{ label: string; done: boolean; summary?: string }> = ({ label, done, summary }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 }} accessible accessibilityLabel={`${label}${done ? `, done${summary ? `: ${summary}` : ''}` : ', in progress'}`}>
    <Text style={{ ...strong, color: done ? colors.action.primary : colors.text.muted, width: 18 }}>{done ? '✓' : '…'}</Text>
    <View style={{ flex: 1 }}>
      <Text style={{ ...body, color: colors.text.primary }}>{label}</Text>
      {done && summary ? <Text style={{ ...body, color: colors.text.muted }}>{summary}</Text> : null}
    </View>
  </View>
);

export type ApprovalOutcome = 'approved' | 'declined' | 'expired' | 'cancelled' | null;
const OUTCOME_TEXT: Record<Exclude<ApprovalOutcome, null>, string> = {
  approved: 'Approved. Your coach plan is updated.',
  declined: 'Declined. Nothing changed.',
  expired: 'This suggestion expired.',
  cancelled: 'This suggestion was cancelled.',
};

/** The one change the coach asks to make. Approve sends the hash of exactly what is shown here. */
export const ApprovalCard: React.FC<{
  proposal: Proposal;
  outcome: ApprovalOutcome;
  busy: boolean;
  onApprove: () => void;
  onDecline: () => void;
}> = ({ proposal, outcome, busy, onApprove, onDecline }) => {
  const until = new Date(proposal.expiresAt);
  const time = Number.isNaN(until.getTime()) ? null : `${String(until.getHours()).padStart(2, '0')}:${String(until.getMinutes()).padStart(2, '0')}`;
  return (
    <View style={card} testID="coach-approval">
      <Text style={{ ...body, color: colors.eyebrow.ink, letterSpacing: 1 }} accessibilityRole="header">SUGGESTED CHANGE</Text>
      <Text style={{ ...strong, marginTop: 6 }}>{proposal.title}</Text>
      <Text style={{ ...body, marginTop: 8 }}>{proposal.consequence}</Text>
      {outcome ? (
        <Text style={{ ...body, marginTop: 12, color: colors.text.primary }} accessibilityLiveRegion="polite" testID="coach-approval-outcome">{OUTCOME_TEXT[outcome]}</Text>
      ) : (
        <View style={{ marginTop: 14, gap: 4 }}>
          {time ? <Text style={{ ...body, color: colors.text.muted }}>{`You can answer until ${time}.`}</Text> : null}
          <PrimaryCta label={busy ? 'Sending…' : 'Approve'} onPress={onApprove} disabled={busy} showArrow={false} />
          <GhostCta label="Not now" onPress={busy ? () => undefined : onDecline} />
        </View>
      )}
    </View>
  );
};

/** Connection state, for sighted and screen-reader users alike. */
export const CoachStatusBar: React.FC<{ text: string | null }> = ({ text }) =>
  text ? (
    <Text style={{ ...body, color: colors.text.muted, textAlign: 'center' }} accessibilityLiveRegion="polite" testID="coach-status">{text}</Text>
  ) : null;
