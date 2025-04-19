/**
 * App Navigation
 * Defines the navigation structure for the app
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import LibraryScreen from '../screens/LibraryScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import StorageProvidersScreen from '../screens/StorageProvidersScreen';
import PlayingTabScreen from '../screens/PlayingTabScreen';

// Import components
import NowPlayingBar from '../components/player/NowPlayingBar';
import CustomTabBar from '../components/navigation/CustomTabBar';
import FloatingActionButton from '../components/common/FloatingActionButton';
import { useTheme } from '../theme/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { usePlayerStore } from '../store/playerStore';
import { useStore } from '../store';

// Define navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  Player: undefined;
  PlaylistDetail: { playlistId: string };
  StorageProviders: undefined;
};

export type MainTabParamList = {
  Library: undefined;
  Search: undefined;
  Playing: undefined;
  Settings: undefined;
};

// Create navigators
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main tab navigator
const MainTabNavigator = () => {
  const { theme, isDarkMode } = useTheme();
  const playerState = usePlayerStore(state => state.playerState);
  const store = useStore();
  const hasTrack = !!playerState.currentTrack;
  const insets = useSafeAreaInsets();

  // Handle add music button press
  const handleAddMusic = async () => {
    try {
      // Import tracks from local storage
      const tracks = await store.importLocalTracksFromFolder();
      
      if (tracks.length > 0) {
        Alert.alert('Success', `Added ${tracks.length} tracks to your library`);
      } else {
        Alert.alert('No tracks added', 'No audio files were found or selected');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import audio files');
      console.error('Error importing audio files:', error);
    }
  };

  // Calculate extra bottom padding for screens to account for the tab bar and player
  const tabBarHeight = 64;
  const safeAreaPadding = Platform.OS === 'ios' ? Math.max(insets.bottom / 2, 6) : 0;
  
  // Custom tab bar with NowPlayingBar above it
  const CustomTabBarWithPlayer = (props: any) => (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      {hasTrack && <NowPlayingBar />}
      <CustomTabBar {...props} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;

            if (route.name === 'Library') {
              iconName = focused ? 'library' : 'library-outline';
            } else if (route.name === 'Search') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'Playing') {
              iconName = focused ? 'musical-notes' : 'musical-notes-outline';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'settings' : 'settings-outline';
            } else {
              iconName = 'help-circle-outline';
            }

            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
          tabBarShowLabel: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          headerStyle: {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
            borderBottomWidth: 1,
          },
          headerTintColor: theme.text,
          headerShown: false,
        })}
        tabBar={props => <CustomTabBarWithPlayer {...props} />}
      >
        <Tab.Screen 
          name="Library" 
          component={LibraryScreen} 
          options={{ title: 'My Library' }}
        />
        <Tab.Screen 
          name="Search" 
          component={SearchScreen} 
          options={{ title: 'Search' }}
        />
        <Tab.Screen 
          name="Playing" 
          component={PlayingTabScreen} 
          options={{ title: 'Now Playing' }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
    </View>
  );
};

// Root stack navigator
const AppNavigator = () => {
  const { theme, isDarkMode } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: isDarkMode,
        colors: {
          primary: theme.primary,
          background: theme.background,
          card: theme.cardBackground,
          text: theme.text,
          border: theme.border,
          notification: theme.error,
        },
        fonts: Platform.select({
          ios: {
            regular: {
              fontFamily: 'System',
              fontWeight: '400',
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'System',
              fontWeight: '600',
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '700',
            },
          },
          android: {
            regular: {
              fontFamily: 'sans-serif',
              fontWeight: 'normal',
            },
            medium: {
              fontFamily: 'sans-serif-medium',
              fontWeight: 'normal',
            },
            bold: {
              fontFamily: 'sans-serif',
              fontWeight: '600',
            },
            heavy: {
              fontFamily: 'sans-serif',
              fontWeight: '700',
            },
          },
          default: {
            regular: {
              fontFamily: 'System',
              fontWeight: '400',
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'System',
              fontWeight: '600',
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '700',
            },
          },
        }),
      }}
    >
      <StatusBar style={theme.statusBar as any} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen 
          name="Player" 
          component={PlayerScreen} 
          options={{ 
            headerShown: true,
            title: 'Now Playing',
            headerStyle: {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen 
          name="PlaylistDetail" 
          component={PlaylistDetailScreen} 
          options={({ route }) => ({ 
            headerShown: true,
            title: 'Playlist',
            headerStyle: {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
            headerTintColor: theme.text,
          })}
        />
        <Stack.Screen 
          name="StorageProviders" 
          component={StorageProvidersScreen} 
          options={{ 
            headerShown: true,
            title: 'Storage Providers',
            headerStyle: {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
            headerTintColor: theme.text,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;