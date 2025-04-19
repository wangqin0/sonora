/**
 * Custom TabBar Component
 * Custom tab bar with safe area support
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { usePlayerStore } from '../../store/playerStore';

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { theme } = useTheme();
  const playerState = usePlayerStore(state => state.playerState);
  const insets = useSafeAreaInsets();
  
  // Check if there's a track playing
  const hasTrack = playerState.currentTrack !== null;
  
  // Calculate the bottom padding based on device, reduce safe area by using half the insets
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom / 2, 6) : 0;
  
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.border,
          borderBottomColor: theme.border,
          borderBottomWidth: 1, // Add bottom border
          paddingBottom: bottomPadding,
          // Make the tab bar the same height as the now playing bar
          height: 64 + bottomPadding,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Get the tab bar icon
        const TabBarIcon = options.tabBarIcon ? 
          options.tabBarIcon({ 
            focused: isFocused, 
            color: isFocused ? theme.primary : theme.textSecondary, 
            size: 24 
          }) : 
          null;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            {TabBarIcon}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    left: 0,
    right: 0,
    zIndex: 8,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingBottom: 0, // Remove any padding at the bottom
  },
});

export default CustomTabBar; 