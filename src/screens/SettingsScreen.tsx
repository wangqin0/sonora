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

import { useStore } from '../store';
import { AppSettings, LogLevel } from '../types';
import { logger } from '../utils/logger';

const SettingsScreen = () => {
  const { settings, updateSettings } = useStore();
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle audio quality change
  const handleAudioQualityChange = async (audioQuality: 'auto' | 'high' | 'medium' | 'low') => {
    try {
      setIsLoading(true);
      await updateSettings({ audioQuality });
    } catch (error) {
      logger.error('Error updating audio quality setting', error);
      Alert.alert('Error', 'Failed to update audio quality setting');
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

  // Handle log level change
  const handleLogLevelChange = async (logLevel: LogLevel) => {
    try {
      setIsLoading(true);
      await updateSettings({ logLevel });
    } catch (error) {
      logger.error('Error updating log level setting', error);
      Alert.alert('Error', 'Failed to update log level setting');
    } finally {
      setIsLoading(false);
    }
  };

  // Render a section header
  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  // Render a setting item with options
  const renderSettingItem = (
    title: string, 
    value: string, 
    options: string[], 
    onSelect: (value: any) => void
  ) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingValue}>{value}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity 
            key={option} 
            style={[styles.optionButton, value === option && styles.optionButtonSelected]}
            onPress={() => onSelect(option)}
            disabled={isLoading}
          >
            <Text 
              style={[styles.optionText, value === option && styles.optionTextSelected]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Appearance */}
      {renderSectionHeader('Appearance')}
      {renderSettingItem(
        'Theme',
        settings.theme,
        ['light', 'dark', 'system'],
        handleThemeChange
      )}

      {/* Playback */}
      {renderSectionHeader('Playback')}
      {renderSettingItem(
        'Audio Quality',
        settings.audioQuality,
        ['auto', 'high', 'medium', 'low'],
        handleAudioQualityChange
      )}

      {/* Storage */}
      {renderSectionHeader('Storage')}
      {renderSettingItem(
        'Download Strategy',
        settings.downloadStrategy,
        ['wifi-only', 'always', 'never'],
        handleDownloadStrategyChange
      )}

      {/* Advanced */}
      {renderSectionHeader('Advanced')}
      {renderSettingItem(
        'Log Level',
        settings.logLevel,
        [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR],
        handleLogLevelChange
      )}

      {/* About */}
      {renderSectionHeader('About')}
      <View style={styles.aboutContainer}>
        <Ionicons name="musical-notes" size={48} color="#6200ee" />
        <Text style={styles.appName}>Sonora</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appDescription}>
          A music player app for local and OneDrive music libraries
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  settingItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#6200ee',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#fff',
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
    color: '#666',
    marginTop: 4,
  },
  appDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default SettingsScreen;