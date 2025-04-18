/**
 * Playing Tab Screen
 * Tab showing currently playing track with controls
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useStore } from '../store';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import { logger } from '../utils/logger';

const { width } = Dimensions.get('window');

const PlayingTabScreen = () => {
  const navigation = useNavigation();
  // Get player controls from the main store
  const { togglePlayPause, nextTrack, previousTrack, seekTo } = useStore();
  // Get player state directly from player store to ensure fresh data
  const playerState = usePlayerStore(state => state.playerState);
  const { theme } = useTheme();
  
  const [sliderValue, setSliderValue] = useState(0);
  const [volumeValue, setVolumeValue] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  
  const { currentTrack, isPlaying, currentPosition, duration } = playerState;
  
  // Force UI update when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      // Log the current state to help with debugging
      logger.info(`PlayingTabScreen focused - currentTrack: ${currentTrack ? currentTrack.title : 'null'}`);
      
      // Force a re-render to ensure we have the latest player state
      const interval = setInterval(() => {
        // This empty setState will trigger a re-render
        setSliderValue(prev => {
          if (currentTrack && !isSeeking) {
            return playerState.currentPosition;
          }
          return prev;
        });
      }, 500);
      
      return () => clearInterval(interval);
    }, [currentTrack, playerState, isSeeking])
  );
  
  // Update slider position based on current playback position
  useEffect(() => {
    if (!isSeeking && currentTrack) {
      setSliderValue(currentPosition);
    }
  }, [currentPosition, isSeeking, currentTrack]);
  
  // Handle slider value change
  const handleSliderValueChange = (value: number) => {
    setIsSeeking(true);
    setSliderValue(value);
  };
  
  // Handle slider seek complete
  const handleSliderSlidingComplete = async (value: number) => {
    try {
      await seekTo(value);
    } catch (error) {
      console.error('Error seeking to position', error);
    } finally {
      setIsSeeking(false);
    }
  };

  // Handle volume change
  const handleVolumeChange = (value: number) => {
    setVolumeValue(value);
    // Here you would implement actual volume control
    // This would depend on your player implementation
  };
  
  // Log player state for debugging
  useEffect(() => {
    logger.debug(`PlayingTabScreen player state - currentTrack: ${currentTrack ? currentTrack.title : 'null'}, isPlaying: ${isPlaying}`);
  }, [currentTrack, isPlaying]);
  
  // If no track is loaded, show placeholder
  if (!currentTrack) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.placeholderContainer}>
          <Ionicons name="musical-notes-outline" size={80} color={theme.primary} />
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            No track playing
          </Text>
        </View>
      </View>
    );
  }
  
  // Extract clean title (without artist prefix)
  let cleanTitle = currentTrack.title;
  if (cleanTitle.includes('-') && currentTrack.artist && cleanTitle.startsWith(currentTrack.artist)) {
    cleanTitle = cleanTitle.substring(currentTrack.artist.length).replace(/^\s*-\s*/, '').trim();
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Album art */}
      <View style={styles.artworkContainer}>
        {currentTrack.artwork ? (
          <Image 
            source={{ uri: currentTrack.artwork }} 
            style={styles.artwork} 
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.placeholderArtwork, { backgroundColor: theme.surface }]}>
            <Ionicons name="musical-note" size={80} color={theme.primary} />
          </View>
        )}
      </View>
      
      {/* Track info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {cleanTitle}
        </Text>
        <Text style={[styles.artist, { color: theme.textSecondary }]} numberOfLines={1}>
          {currentTrack.artist || 'Unknown artist'}
        </Text>
      </View>
      
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={sliderValue}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={theme.border}
          thumbTintColor={theme.primary}
          onValueChange={handleSliderValueChange}
          onSlidingComplete={handleSliderSlidingComplete}
        />
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: theme.textSecondary }]}>
            {formatTime(currentPosition)}
          </Text>
          <Text style={[styles.timeText, { color: theme.textSecondary }]}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={previousTrack}>
          <Ionicons name="play-skip-back" size={32} color={theme.text} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.playButton, { backgroundColor: theme.primary }]} onPress={togglePlayPause}>
          <Ionicons 
            name={isPlaying ? 'pause' : 'play'} 
            size={32} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={nextTrack}>
          <Ionicons name="play-skip-forward" size={32} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      {/* Volume control */}
      <View style={styles.volumeContainer}>
        <Ionicons name="volume-low" size={20} color={theme.textSecondary} />
        <Slider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={1}
          value={volumeValue}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={theme.border}
          thumbTintColor={theme.primary}
          onValueChange={handleVolumeChange}
        />
        <Ionicons name="volume-high" size={20} color={theme.textSecondary} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    marginTop: 16,
  },
  artworkContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  artwork: {
    width: width - 80,
    height: width - 80,
    borderRadius: 8,
  },
  placeholderArtwork: {
    width: width - 80,
    height: width - 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    fontSize: 18,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    fontSize: 14,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  controlButton: {
    padding: 16,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 24,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 12,
    height: 40,
  },
});

export default PlayingTabScreen; 