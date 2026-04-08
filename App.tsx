import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { FocusProvider } from './src/context/FocusContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <FocusProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </FocusProvider>
    </AuthProvider>
  );
}
