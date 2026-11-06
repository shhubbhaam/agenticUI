import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';

// Navigation callbacks for the Streak screen.
export function useStreakActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return {
    goBack: () => navigation.goBack(),
    takeSmallStep: () => navigation.navigate('HomeScreen', { direction: 'forward' }),
  };
}
