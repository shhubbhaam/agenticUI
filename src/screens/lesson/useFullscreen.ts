// Landscape full screen for the lesson player ("Fit to screen").
// Locks to landscape while on, back to portrait when off or when the screen closes;
// Android back exits full screen instead of leaving the lesson.
import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    ScreenOrientation.lockAsync(
      fullscreen ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => {}); // orientation is cosmetic: never break playback over it
  }, [fullscreen]);

  useEffect(() => () => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setFullscreen(false); return true; });
    return () => sub.remove();
  }, [fullscreen]);

  return {
    fullscreen,
    toggle: useCallback(() => setFullscreen((f) => !f), []),
    exit: useCallback(() => setFullscreen(false), []),
  };
}
