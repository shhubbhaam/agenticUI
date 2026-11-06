import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import type { SkillId } from '../../core/you/skills';

// Navigation callbacks for the Skills & evidence screens.
export function useSkillsActions() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return {
    goBack: () => navigation.goBack(),
    openEvidence: (skillId: SkillId) => navigation.navigate('Evidence', { skillId }),
    startLesson: () => navigation.navigate('HomeScreen', { direction: 'forward' }),
    openPath: () => navigation.navigate('PathScreen', { direction: 'forward' }),
  };
}
