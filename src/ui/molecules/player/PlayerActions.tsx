// src/ui/molecules/player/PlayerActions.tsx
// Text actions under the timeline: "Captions on · Fit to screen · Ask Coach", plus a download
// action only when the video can be stored offline (uploaded videos, not YouTube).
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

export type CaptionsState = 'on' | 'off' | 'unavailable';
export type DownloadState = { status: 'idle' } | { status: 'downloading'; progress: number } | { status: 'downloaded' } | { status: 'error' };

interface PlayerActionsProps {
  captions: CaptionsState;
  onToggleCaptions: () => void;
  onFitToScreen: () => void;
  /** In full screen the same action exits it. */
  fullscreen?: boolean;
  onAskCoach: () => void;
  /** Omit for online-only videos (YouTube): no download action is shown. */
  download?: DownloadState;
  onDownload?: () => void;
  /** light: under the video (default). dark: floating over the video in full screen. */
  tone?: 'light' | 'dark';
}

export function downloadLabel(d: DownloadState): string {
  switch (d.status) {
    case 'idle': return 'Download';
    case 'downloading': return `Downloading ${Math.round(Math.min(1, Math.max(0, d.progress)) * 100)}%`;
    case 'downloaded': return 'Downloaded';
    case 'error': return 'Retry download';
  }
}

const Action: React.FC<{ label: string; onPress?: () => void; disabled?: boolean; testID: string; hint?: string; selected?: boolean; ink: string }> = ({
  label, onPress, disabled = false, testID, hint, selected, ink,
}) => (
  <TouchableOpacity
    testID={testID}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint={hint}
    accessibilityState={{ disabled, ...(selected === undefined ? {} : { selected }) }}
    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, opacity: disabled ? 0.5 : 1 }}
  >
    <Text style={{ fontFamily: typography.fontFamily.jakarta, color: ink, ...typography.fontSize['type-12'] }}>{label}</Text>
  </TouchableOpacity>
);

export const PlayerActions: React.FC<PlayerActionsProps> = ({ captions, onToggleCaptions, onFitToScreen, fullscreen = false, onAskCoach, download, onDownload, tone = 'light' }) => {
  const ink = tone === 'dark' ? colors.player.actionInkOnDark : colors.player.actionInk;
  return (
    <View style={tw`flex-row items-center justify-between w-full`}>
      <Action
        testID="action-captions"
        ink={ink}
        label={captions === 'unavailable' ? 'No captions' : captions === 'on' ? 'Captions on' : 'Captions off'}
        onPress={onToggleCaptions}
        disabled={captions === 'unavailable'}
        selected={captions === 'unavailable' ? undefined : captions === 'on'}
      />
      <Action testID="action-fit" ink={ink} label={fullscreen ? 'Exit full screen' : 'Fit to screen'} onPress={onFitToScreen} selected={fullscreen} />
      <Action testID="action-coach" ink={ink} label="Ask Coach" onPress={onAskCoach} hint="Ask the learning coach about this video" />
      {download ? (
        <Action
          testID="action-download"
          ink={ink}
          label={downloadLabel(download)}
          onPress={onDownload}
          disabled={download.status === 'downloading' || download.status === 'downloaded'}
          hint={download.status === 'idle' ? 'Save this video to watch offline' : undefined}
        />
      ) : null}
    </View>
  );
};
