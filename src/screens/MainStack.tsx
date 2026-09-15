import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Login from './Login';
import Path from './Path';
import index from './index';
import PathScreen from '../features/roadmap/screens/PathScreen';
import HomeScreen from '../features/roadmap/screens/HomeScreen';
import Screen from '../features/roadmap/screens/Screen';

console.log('Path component:', Path);
console.log('Path type:', typeof Path);


export type RootStackParamList = {
  Login: undefined;
  Path: undefined;
  index: undefined;
  PathScreen: undefined;
  HomeScreen: undefined;
  Screen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{headerShown: false,}}>
        <Stack.Screen
          name="Login"
          component={Login}
        />
        <Stack.Screen
          name="Path"
          component={Path}
        />
         <Stack.Screen
          name="PathScreen"
          component={PathScreen}
        />
         <Stack.Screen
          name="HomeScreen"
          component={HomeScreen}
        />
        <Stack.Screen
          name="index"
          component={index}
        />
        <Stack.Screen
          name="Screen"
          component={Screen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}