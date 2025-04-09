/**
 * Mini Player Bar Component
 * Displays a mini player at the bottom of the screen
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useStore } from '../../store';

const MiniPlayerBar = () => {
  const navigation = useNavigation();
  const { playerState, togglePlayPause } = useStore();
  
  // If no track is playing, don't show the mini player
  if (!playerState.currentTrack) {
    return null;
  }
  
  // Handle press on the mini player to open full player
  const handlePress = () => {
    navigation.navigate('Player');
  };
  
  // Handle play/pause button press
  const handlePlayPause = (e: any) => {
    e.stopPropagation(); // Prevent opening the full player
    togglePlayPause();
  };
  
  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.iconContainer}>
        <Ionicons name="musical-note" size={24} color="#6200ee" />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {playerState.currentTrack.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {playerState.currentTrack.artist || 'Unknown artist'}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
        <Ionicons 
          name={playerState.isPlaying ? 'pause' : 'play'} 
          size={24} 
          color="#6200ee" 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  artist: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});

export default MiniPlayerBar;