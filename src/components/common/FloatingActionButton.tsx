/**
 * Floating Action Button Component
 * Reusable FAB for primary actions like adding music
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
  bottom?: number;
  right?: number;
  size?: number;
}

const FloatingActionButton = ({
  onPress,
  icon = 'add',
  bottom = 120,
  right = 16,
  size = 56,
}: FloatingActionButtonProps) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Calculate the correct bottom position based on device
  const bottomPosition = bottom + (Platform.OS === 'ios' ? insets.bottom / 2 : 0);
  
  // Calculate icon size based on button size
  const iconSize = size * 0.5;
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: theme.primary,
          bottom: bottomPosition,
          right: right,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon as any} size={iconSize} color="white" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 999,
  },
});

export default FloatingActionButton; 