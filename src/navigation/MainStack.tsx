import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LaunchpadScreen from '../screens/launchpad/LaunchpadScreen';
import LoginScreen from '../screens/login/LoginScreen';
import PathScreen from '../screens/path/PathScreen';
import HomeScreen from '../screens/home/HomeScreen';
import PracticeScreen from '../screens/practice/PracticeScreen';
import YouScreen from '../screens/you/YouScreen';
import SkillsScreen from '../screens/skills/SkillsScreen';
import EvidenceScreen from '../screens/skills/EvidenceScreen';
import StreakScreen from '../screens/streak/StreakScreen';
import ComingSoonScreen from '../screens/placeholder/ComingSoonScreen';
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
  Skills: undefined;
  Evidence: { skillId: SkillId };
  Streak: undefined;
  Settings: undefined;
  OnboardingRole: undefined;
  OnboardingExperience: undefined;
  OnboardingGoal: undefined;
  OnboardingBudget: undefined;
  OnboardingFormats: undefined;
  OnboardingDiagnostic: { question: DiagnosticQuestionNumber };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const tabScreenOptions = ({ route }: { route: { params?: TabScreenParams } }) => ({
  animation: route.params?.direction === 'backward' ? ('slide_from_left' as const) : ('slide_from_right' as const),
});

export default function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Launchpad" screenOptions={{headerShown: false}}>
        <Stack.Screen name="Launchpad" component={LaunchpadScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PathScreen" component={PathScreen} options={tabScreenOptions} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} options={tabScreenOptions} />
        <Stack.Screen name="PracticeScreen" component={PracticeScreen} options={tabScreenOptions} />
        <Stack.Screen name="YouScreen" component={YouScreen} options={tabScreenOptions} />
        <Stack.Screen name="Skills" component={SkillsScreen} />
        <Stack.Screen name="Evidence" component={EvidenceScreen} />
        <Stack.Screen name="Streak" component={StreakScreen} />
        {/* Settings and its sub-screens */}
        <Stack.Screen name="Settings">{() => <ComingSoonScreen title="Settings" />}</Stack.Screen>
        <Stack.Screen name="OnboardingRole" component={RoleScreen} />
        <Stack.Screen name="OnboardingExperience" component={ExperienceScreen} />
        <Stack.Screen name="OnboardingGoal" component={GoalScreen} />
        <Stack.Screen name="OnboardingBudget" component={BudgetScreen} />
        <Stack.Screen name="OnboardingFormats" component={FormatsScreen} />
        <Stack.Screen name="OnboardingDiagnostic" component={DiagnosticScreen} getId={diagnosticGetId} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
