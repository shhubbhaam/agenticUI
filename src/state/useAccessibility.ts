import { textScaleFor, scaleFontSize } from '../core/settings/settings';
import { useSettingsStore } from './useSettingsStore';

export interface Accessibility {
  reduceMotion: boolean;
  largerText: boolean;
  // 1 normally, 1.25 with "Larger text".
  textScale: number;
  transcriptDefaults: boolean;
  // Scales a design font size (px) by the current text scale.
  scaleFont: (size: number) => number;
}

// Read-only view of the accessibility settings for any component:
//   const { reduceMotion, textScale, scaleFont } = useAccessibility();
export function useAccessibility(): Accessibility {
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion);
  const largerText = useSettingsStore((s) => s.settings.largerText);
  const transcriptDefaults = useSettingsStore((s) => s.settings.transcriptDefaults);
  const textScale = textScaleFor({ largerText });
  return {
    reduceMotion,
    largerText,
    textScale,
    transcriptDefaults,
    scaleFont: (size) => scaleFontSize(size, textScale),
  };
}
