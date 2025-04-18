import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface ThemeToggleProps {
  size?: number;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ size = 24 }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.surface }]} 
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={isDarkMode ? 'sunny' : 'moon'} 
          size={size} 
          color={theme.primary} 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 20,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeToggle; 