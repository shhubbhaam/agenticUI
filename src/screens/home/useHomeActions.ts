import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';

// Navigation callbacks for the Today (Home) screen.
export function useHomeActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return {
    openStreak: () => navigation.navigate('Streak'),
  };
}
