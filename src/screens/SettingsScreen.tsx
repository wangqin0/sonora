/**
 * Settings Screen
 * Allows users to configure app preferences
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../store';
import { AppSettings, LogLevel } from '../types';
import { logger } from '../utils/logger';
import { useTheme } from '../theme/ThemeContext';
import ThemeToggle from '../components/theme/ThemeToggle';

const SettingsScreen = () => {
  const { settings, updateSettings } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  // Handle theme change
  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    try {
      setIsLoading(true);
      await updateSettings({ theme });
    } catch (error) {
      logger.error('Error updating theme setting', error);
      Alert.alert('Error', 'Failed to update theme setting');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle download strategy change
  const handleDownloadStrategyChange = async (downloadStrategy: 'wifi-only' | 'always' | 'never') => {
    try {
      setIsLoading(true);
      await updateSettings({ downloadStrategy });
    } catch (error) {
      logger.error('Error updating download strategy setting', error);
      Alert.alert('Error', 'Failed to update download strategy setting');
    } finally {
      setIsLoading(false);
    }
  };

  // Render a section header
  const renderSectionHeader = (title: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.surface }]}>
      <Text style={[styles.sectionHeaderText, { color: theme.textSecondary }]}>{title}</Text>
    </View>
  );

  // Render a setting item with options
  const renderSettingItem = (
    title: string, 
    value: string, 
    options: string[], 
    onSelect: (value: any) => void
  ) => (
    <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
      <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{value}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity 
            key={option} 
            style={[
              styles.optionButton, 
              { backgroundColor: value === option ? theme.primary : theme.surface },
            ]}
            onPress={() => onSelect(option)}
            disabled={isLoading}
          >
            <Text 
              style={[
                styles.optionText, 
                { color: value === option ? '#fff' : theme.textSecondary },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render the theme toggle setting
  const renderThemeToggleSetting = () => (
    <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
      <View style={styles.themeToggleHeader}>
        <View>
          <Text style={[styles.settingTitle, { color: theme.text }]}>Toggle Theme</Text>
          <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
            Current: {isDarkMode ? 'Dark' : 'Light'}
          </Text>
        </View>
        <ThemeToggle size={28} />
      </View>
      <View style={styles.optionsContainer}>
        {['light', 'dark', 'system'].map((option) => (
          <TouchableOpacity 
            key={option} 
            style={[
              styles.optionButton, 
              { backgroundColor: settings.theme === option ? theme.primary : theme.surface },
            ]}
            onPress={() => handleThemeChange(option as 'light' | 'dark' | 'system')}
            disabled={isLoading}
          >
            <Text 
              style={[
                styles.optionText, 
                { color: settings.theme === option ? '#fff' : theme.textSecondary },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.background,
          paddingTop: insets.top > 0 ? insets.top : 0
        }
      ]}
    >
      {/* Appearance */}
      {renderSectionHeader('Appearance')}
      {renderThemeToggleSetting()}

      {/* Storage */}
      {renderSectionHeader('Storage')}
      {renderSettingItem(
        'Download Strategy',
        settings.downloadStrategy,
        ['wifi-only', 'always', 'never'],
        handleDownloadStrategyChange
      )}

      {/* About */}
      {renderSectionHeader('About')}
      <View style={styles.aboutContainer}>
        <Ionicons name="musical-notes" size={48} color={theme.primary} />
        <Text style={[styles.appName, { color: theme.text }]}>Sonora</Text>
        <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Version 1.0.0</Text>
        <Text style={[styles.appDescription, { color: theme.textSecondary }]}>
          A music player app for local and OneDrive music libraries
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  settingItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  themeToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  optionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
  },
  aboutContainer: {
    padding: 24,
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  appVersion: {
    fontSize: 16,
    marginTop: 4,
  },
  appDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default SettingsScreen;