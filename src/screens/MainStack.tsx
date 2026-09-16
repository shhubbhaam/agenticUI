import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Login from './Login';
import PathScreen from '../features/roadmap/screens/PathScreen';
import HomeScreen from '../features/roadmap/screens/HomeScreen';

export type RootStackParamList = {
  Login: undefined;
  PathScreen: undefined;
  HomeScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="PathScreen" component={PathScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
