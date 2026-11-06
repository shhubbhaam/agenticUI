// Opens the "stage earned" screen once when Path sees a stage that has newly become complete.
// The first time a course is seen, stages already finished are recorded without celebrating.
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { useCelebrationStore } from '../../state/useCelebrationStore';
import { pendingCelebration } from '../../core/learning/stageCompletion';
import type { PathData } from './usePathData';

export function useStageCelebration(pathData: Pick<PathData, 'status' | 'courseUuid' | 'stages'>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const seen = useCelebrationStore((s) => (pathData.courseUuid ? s.seen[pathData.courseUuid] : undefined));
  const setSeen = useCelebrationStore((s) => s.setSeen);
  // Stages arrive in path order, so the last newly finished one is the furthest along.
  const completedKey = pathData.stages.filter((s) => s.status === 'completed').map((s) => s.id).join('|');

  useEffect(() => {
    if (pathData.status !== 'ready' || !pathData.courseUuid) return;
    const completed = completedKey ? completedKey.split('|') : [];
    const { celebrate, seen: next } = pendingCelebration(completed, seen);
    if (next !== seen) setSeen(pathData.courseUuid, next);
    if (celebrate) navigation.navigate('StageComplete', { courseUuid: pathData.courseUuid, chapterId: celebrate });
  }, [pathData.status, pathData.courseUuid, completedKey, seen, setSeen, navigation]);
}
