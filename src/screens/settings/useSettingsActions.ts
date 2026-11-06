import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { useSessionStore } from '../../state/useSessionStore';

// Navigation + sign-out callbacks for the Settings screens, so screens only compose.
export function useSettingsActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signOut = useSessionStore((s) => s.signOut);

  return {
    goBack: () => navigation.goBack(),
    openAccessibility: () => navigation.navigate('Accessibility'),
    openManageDownloads: () => navigation.navigate('ManageDownloads'),
    // Rows whose screens are not designed yet land on the shared placeholder.
    openComingSoon: (title: string) => navigation.navigate('ComingSoon', { title }),
    // Identical to the behaviour it replaces on the You tab: signOut, then
    // always land on Login even if clearing the session threw.
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
