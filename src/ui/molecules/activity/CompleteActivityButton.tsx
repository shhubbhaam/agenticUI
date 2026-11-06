// src/ui/molecules/activity/CompleteActivityButton.tsx
// "Mark as complete" at the foot of an activity (slides, article, video): the raised blue button with a
// check, "Saving…" while it records, then a green "Completed" pill. Render-only; the screen decides
// whether to show it at all (the video lesson hides it until every checkpoint is passed).
import React from 'react';
import { View } from 'react-native';
import { colors } from '../../tokens/colors';
import { ActiveButton } from '../../atoms/ActiveButton';
import { Icon } from '../../atoms/Icon';
import { MessagePill } from '../MessagePill';

export type CompleteButtonStatus = 'unknown' | 'incomplete' | 'saving' | 'complete';

interface CompleteActivityButtonProps {
  status: CompleteButtonStatus;
  error?: string | null;
  onPress: () => void;
}

/** True once every checkpoint is passed (or there are none): only then is "Mark as complete" offered. */
export const checkpointsCleared = (passed: number, total: number) => passed >= total;

export const CompleteActivityButton: React.FC<CompleteActivityButtonProps> = ({ status, error, onPress }) => {
  if (status === 'complete') {
    return <MessagePill tone="success" icon="check-circle" message="Completed. Your progress is saved." testID="activity-completed" />;
  }
  return (
    <View style={{ gap: 10 }}>
      {error ? <MessagePill tone="error" icon="warning" message={error} testID="activity-complete-error" /> : null}
      <ActiveButton
        variant="blue"
        testID="activity-complete"
        label={status === 'saving' ? 'Saving…' : 'Mark as complete'}
        icon={<Icon name="check" color={colors.surface.white} size={18} />}
        disabled={status !== 'incomplete'}
        onPress={onPress}
      />
    </View>
  );
};
