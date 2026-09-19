import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/login/LoginScreen';
import PathScreen from '../screens/path/PathScreen';
import HomeScreen from '../screens/home/HomeScreen';
import PracticeScreen from '../screens/practice/PracticeScreen';
import YouScreen from '../screens/you/YouScreen';

// Bottom-bar tab screens carry an optional `direction`, set by
// useTabNavigation from the tapped tab's position relative to the current
// one, so the push/replace transition can slide from the matching side.
type TabScreenParams = { direction?: 'forward' | 'backward' } | undefined;

export type RootStackParamList = {
  Login: undefined;
  PathScreen: TabScreenParams;
  HomeScreen: TabScreenParams;
  PracticeScreen: TabScreenParams;
  YouScreen: TabScreenParams;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const tabScreenOptions = ({ route }: { route: { params?: TabScreenParams } }) => ({
  animation: route.params?.direction === 'backward' ? ('slide_from_left' as const) : ('slide_from_right' as const),
});

export default function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PathScreen" component={PathScreen} options={tabScreenOptions} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} options={tabScreenOptions} />
        <Stack.Screen name="PracticeScreen" component={PracticeScreen} options={tabScreenOptions} />
        <Stack.Screen name="YouScreen" component={YouScreen} options={tabScreenOptions} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
