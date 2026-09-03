import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainStack from './src/screens/MainStack';

function App() {
  return (
    <SafeAreaProvider>
        <MainStack />
    </SafeAreaProvider>
  );
}

export default App;