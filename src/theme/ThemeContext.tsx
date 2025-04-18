import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useStore } from '../store';

// Define theme colors
export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  primary: '#6200EE',
  secondary: '#03DAC6',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#B00020',
  cardBackground: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  statusBar: 'dark',
};

export const darkTheme = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  border: '#2C2C2C',
  error: '#CF6679',
  cardBackground: '#2C2C2C',
  tabBarBackground: '#1E1E1E',
  statusBar: 'light',
};

// Create theme context
type ThemeContextType = {
  theme: typeof lightTheme;
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { settings, updateSettings } = useStore();
  const deviceTheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Determine theme based on settings and device theme
  useEffect(() => {
    const setThemeFromSettings = async () => {
      if (settings.theme === 'system') {
        setIsDarkMode(deviceTheme === 'dark');
      } else {
        setIsDarkMode(settings.theme === 'dark');
      }
    };

    setThemeFromSettings();
  }, [settings.theme, deviceTheme]);

  // Toggle theme
  const toggleTheme = async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    await updateSettings({ theme: newTheme });
  };

  // Current theme based on dark/light mode
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 