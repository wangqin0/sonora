/**
 * Player Screen
 * Full-screen player interface
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

import { useStore } from '../store';
import { formatTime } from '../utils/formatters';
import { logger } from '../utils/logger';

const { width } = Dimensions.get('window');

const PlayerScreen = () => {
  const { 
    playerState, 
    togglePlayPause, 
    nextTrack, 
    previousTrack, 
    seekTo,
    toggleRepeat,
    toggleShuffle
  } = useStore();
  
  const [sliderValue, setSliderValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  
  const { currentTrack, isPlaying, currentPosition, duration, repeatMode, shuffleMode } = playerState;
  
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
      logger.error('Error seeking to position', error);
    } finally {
      setIsSeeking(false);
    }
  };
  
  // If no track is loaded, show placeholder
  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.placeholderContainer}>
          <Ionicons name="musical-notes-outline" size={80} color="#6200ee" />
          <Text style={styles.placeholderText}>No track playing</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Extract clean title (without artist prefix)
  let cleanTitle = currentTrack.title;
  if (cleanTitle.includes('-') && currentTrack.artist && cleanTitle.startsWith(currentTrack.artist)) {
    cleanTitle = cleanTitle.substring(currentTrack.artist.length).replace(/^\s*-\s*/, '').trim();
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Album art */}
      <View style={styles.artworkContainer}>
        {currentTrack.artwork ? (
          <Image 
            source={{ uri: currentTrack.artwork }} 
            style={styles.artwork} 
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderArtwork}>
            <Ionicons name="musical-note" size={80} color="#6200ee" />
          </View>
        )}
      </View>
      
      {/* Track info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {cleanTitle}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack.artist || 'Unknown artist'}
        </Text>
        <Text style={styles.source}>
          Source: {currentTrack.source === 'local' ? 'Local Storage' : 'OneDrive'}
        </Text>
      </View>
      
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={sliderValue}
          minimumTrackTintColor="#6200ee"
          maximumTrackTintColor="#d8d8d8"
          thumbTintColor="#6200ee"
          onValueChange={handleSliderValueChange}
          onSlidingComplete={handleSliderSlidingComplete}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(currentPosition)}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleShuffle}>
          <Ionicons 
            name="shuffle" 
            size={24} 
            color={shuffleMode ? '#6200ee' : '#888'} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={previousTrack}>
          <Ionicons name="play-skip-back" size={36} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
          <Ionicons 
            name={isPlaying ? 'pause' : 'play'} 
            size={36} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={nextTrack}>
          <Ionicons name="play-skip-forward" size={36} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleRepeat}>
          <Ionicons 
            name={repeatMode === 'off' ? 'repeat-outline' : 'repeat'} 
            size={24} 
            color={repeatMode === 'off' ? '#888' : '#6200ee'} 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: 32,
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
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  artist: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  source: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 32,
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
    color: '#888',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PlayerScreen;