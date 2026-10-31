import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';

// Navigation callbacks for the You tab, so the screen only composes.
// (Log out lives in Settings now — see screens/settings/useSettingsActions.)
export function useYouActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return {
    openSettings: () => navigation.navigate('Settings'),
    openPath: () => navigation.navigate('PathScreen', { direction: 'backward' }),
    openSkills: () => navigation.navigate('Skills'),
    openStreak: () => navigation.navigate('Streak'),
    openMadeByYou: () => navigation.navigate('Skills'),
  };
}
