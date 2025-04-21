import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Audio } from 'expo-av';
import * as WebBrowser from 'expo-web-browser';

import AppNavigator from './src/navigation/AppNavigator';
import { useStore } from './src/store';
import { enableDebugLogging } from './src/utils/debugHelper';
import { ThemeProvider } from './src/theme/ThemeContext';

export default function App() {
  // Initialize audio session on app start
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Failed to set audio mode', error);
      }
    };

    setupAudio();
    
    // Initialize WebBrowser session management
    WebBrowser.maybeCompleteAuthSession();
    
    // Enable debug logging for troubleshooting
    enableDebugLogging();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
