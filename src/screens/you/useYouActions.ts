import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { useSessionStore } from '../../state/useSessionStore';

// Navigation + sign-out callbacks for the You tab, so the screen only composes.
export function useYouActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signOut = useSessionStore((s) => s.signOut);

  return {
    openSettings: () => navigation.navigate('Settings'),
    openPath: () => navigation.navigate('PathScreen', { direction: 'backward' }),
    openSkills: () => navigation.navigate('Skills'),
    openStreak: () => navigation.navigate('Streak'),
    openMadeByYou: () => navigation.navigate('Skills'),
    logOut: () => {
      signOut()
        .catch(() => {
          // Best-effort — always land back on Login even if
          // clearing the local session hit an unexpected error.
        })
        .finally(() => {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        });
    },
  };
}
