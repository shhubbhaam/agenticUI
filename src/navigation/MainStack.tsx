import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LaunchpadScreen from '../screens/launchpad/LaunchpadScreen';
import LoginScreen from '../screens/login/LoginScreen';
import PathScreen from '../screens/path/PathScreen';
import HomeScreen from '../screens/home/HomeScreen';
import PracticeScreen from '../screens/practice/PracticeScreen';
import QuickPracticeScreen from '../screens/practice/QuickPracticeScreen';
import YouScreen from '../screens/you/YouScreen';
import SkillsScreen from '../screens/skills/SkillsScreen';
import EvidenceScreen from '../screens/skills/EvidenceScreen';
import StreakScreen from '../screens/streak/StreakScreen';
import ComingSoonScreen from '../screens/placeholder/ComingSoonScreen';
import CoachScreen from '../screens/coach/CoachScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import AccessibilityScreen from '../screens/settings/AccessibilityScreen';
import ManageDownloadsScreen from '../screens/settings/ManageDownloadsScreen';
import { useSettingsStore } from '../state/useSettingsStore';
import { useSettingsSync } from '../state/useSettingsSync';
import LessonScreen from '../screens/lesson/LessonScreen';
import SlidesScreen from '../screens/slides/SlidesScreen';
import AssignmentScreen from '../screens/assignment/AssignmentScreen';
import StageCompleteScreen from '../screens/completion/StageCompleteScreen';
import RoleScreen from '../screens/onboarding/RoleScreen';
import ExperienceScreen from '../screens/onboarding/ExperienceScreen';
import GoalScreen from '../screens/onboarding/GoalScreen';
import BudgetScreen from '../screens/onboarding/BudgetScreen';
import FormatsScreen from '../screens/onboarding/FormatsScreen';
import DiagnosticScreen from '../screens/onboarding/DiagnosticScreen';
import { diagnosticGetId } from '../screens/onboarding/useDiagnosticFlow';
import type { DiagnosticQuestionNumber } from '../core/onboarding/types';
import type { SkillId } from '../core/you/skills';

// Bottom-bar tab screens carry an optional `direction`, set by
// useTabNavigation from the tapped tab's position relative to the current
// one, so the push/replace transition can slide from the matching side.
type TabScreenParams = { direction?: 'forward' | 'backward' } | undefined;

export type RootStackParamList = {
  Launchpad: undefined;
  Login: undefined;
  PathScreen: TabScreenParams;
  HomeScreen: TabScreenParams;
  PracticeScreen: TabScreenParams;
  YouScreen: TabScreenParams;
  QuickPracticeScreen: undefined;
  Skills: undefined;
  Evidence: { skillId: SkillId };
  Streak: undefined;
  Settings: undefined;
  Accessibility: undefined;
  ManageDownloads: undefined;
  // Settings rows whose screens are not designed yet.
  ComingSoon: { title: string; message?: string };
  // M6: the AI coach (agentUi module), for one course.
  Coach: { courseUuid: string };
  /** Without params: the demo lesson (fake clock). With params: that activity's real video. */
  Lesson: { courseUuid: string; activityUuid: string; title?: string; chapter?: string; format?: string } | undefined;
  /** A PDF (document) activity, opened as a slide deck. Route by content with navigation/activityRoute.ts. */
  Slides: { courseUuid: string; activityUuid: string; title?: string; chapter?: string };
  Assignment: { courseUuid: string; activityUuid: string; title?: string; chapter?: string };
  StageComplete: { courseUuid: string; chapterId: string };
  OnboardingRole: undefined;
  OnboardingExperience: undefined;
  OnboardingGoal: undefined;
  OnboardingBudget: undefined;
  OnboardingFormats: undefined;
  OnboardingDiagnostic: { question: DiagnosticQuestionNumber };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const tabScreenOptions =
  (reduceMotion: boolean) =>
  ({ route }: { route: { params?: TabScreenParams } }) => ({
    // Accessibility > Reduce motion: no sliding between screens.
    animation: reduceMotion
      ? ('none' as const)
      : route.params?.direction === 'backward'
        ? ('slide_from_left' as const)
        : ('slide_from_right' as const),
  });

export default function MainStack() {
  useSettingsSync();
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion);
  const tabOptions = tabScreenOptions(reduceMotion);
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Launchpad"
        screenOptions={{ headerShown: false, ...(reduceMotion ? { animation: 'none' as const } : {}) }}
      >
        <Stack.Screen name="Launchpad" component={LaunchpadScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PathScreen" component={PathScreen} options={tabOptions} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} options={tabOptions} />
        <Stack.Screen name="PracticeScreen" component={PracticeScreen} options={tabOptions} />
        <Stack.Screen name="YouScreen" component={YouScreen} options={tabOptions} />
        <Stack.Screen name="Skills" component={SkillsScreen} />
        <Stack.Screen name="Evidence" component={EvidenceScreen} />
        <Stack.Screen name="Streak" component={StreakScreen} />
        {/* Settings and its sub-screens */}
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Accessibility" component={AccessibilityScreen} />
        <Stack.Screen name="ManageDownloads" component={ManageDownloadsScreen} />
        <Stack.Screen name="Coach" component={CoachScreen} />
        <Stack.Screen name="ComingSoon">
          {({ route }) => <ComingSoonScreen title={route.params.title} message={route.params.message} />}
        </Stack.Screen>
        <Stack.Screen name="Lesson" component={LessonScreen} />
        <Stack.Screen name="Slides" component={SlidesScreen} />
        <Stack.Screen name="Assignment" component={AssignmentScreen} />
        <Stack.Screen name="StageComplete" component={StageCompleteScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="OnboardingRole" component={RoleScreen} />
        <Stack.Screen name="OnboardingExperience" component={ExperienceScreen} />
        <Stack.Screen name="OnboardingGoal" component={GoalScreen} />
        <Stack.Screen name="OnboardingBudget" component={BudgetScreen} />
        <Stack.Screen name="OnboardingFormats" component={FormatsScreen} />
        <Stack.Screen name="OnboardingDiagnostic" component={DiagnosticScreen} getId={diagnosticGetId} />
        <Stack.Screen name="QuickPracticeScreen" component={QuickPracticeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
