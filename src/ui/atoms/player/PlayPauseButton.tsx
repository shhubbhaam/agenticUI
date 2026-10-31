// src/ui/atoms/player/PlayPauseButton.tsx
// Round play control that sits on the video (design: translucent circle, white glyph, bottom-right).
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Play, Pause, RotateCcw } from 'lucide-react-native';
import { colors } from '../../tokens/colors';

export type PlayPauseState = 'play' | 'pause' | 'replay';

interface PlayPauseButtonProps {
  /** What pressing the button does: 'play' shows a play glyph, 'pause' a pause glyph, 'replay' restart. */
  state: PlayPauseState;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}

const LABELS: Record<PlayPauseState, string> = { play: 'Play video', pause: 'Pause video', replay: 'Replay video' };

export const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({ state, onPress, disabled = false, size = 48 }) => {
  const ink = colors.player.stage.ink;
  const glyph = Math.round(size * 0.42);
  return (
    <TouchableOpacity
      testID="play-pause"
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={LABELS[state]}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.player.stage.overlayButton,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {state === 'pause' ? (
        <Pause size={glyph} color={ink} strokeWidth={2.2} />
      ) : state === 'replay' ? (
        <RotateCcw size={glyph} color={ink} strokeWidth={2.2} />
      ) : (
        <Play size={glyph} color={ink} fill={ink} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
};
