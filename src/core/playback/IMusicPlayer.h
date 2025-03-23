#pragma once

#include <memory>
#include <string>
#include <vector>

namespace sonora {
namespace playback {

/**
 * @brief Repeat mode for playback
 */
enum class RepeatMode {
    None,       ///< No repeat
    Single,     ///< Repeat single track
    All         ///< Repeat all tracks in queue
};

/**
 * @brief Interface for playback observer
 */
class IPlaybackObserver {
public:
    virtual ~IPlaybackObserver() = default;
    
    /**
     * @brief Called when playback starts
     */
    virtual void onPlaybackStarted() = 0;
    
    /**
     * @brief Called when playback pauses
     */
    virtual void onPlaybackPaused() = 0;
    
    /**
     * @brief Called when playback stops
     */
    virtual void onPlaybackStopped() = 0;
    
    /**
     * @brief Called when track changes
     * @param uri URI of the new track
     */
    virtual void onTrackChanged(const std::string& uri) = 0;
    
    /**
     * @brief Called to update playback progress
     * @param position Current playback position in seconds
     * @param duration Total track duration in seconds
     */
    virtual void onPlaybackProgress(double position, double duration) = 0;
};

/**
 * @brief Interface for music player
 */
class IMusicPlayer {
public:
    virtual ~IMusicPlayer() = default;
    
    /**
     * @brief Play a track
     * @param uri URI of the track to play
     */
    virtual void play(const std::string& uri) = 0;
    
    /**
     * @brief Pause playback
     */
    virtual void pause() = 0;
    
    /**
     * @brief Resume playback
     */
    virtual void resume() = 0;
    
    /**
     * @brief Stop playback
     */
    virtual void stop() = 0;
    
    /**
     * @brief Skip to next track in queue
     */
    virtual void next() = 0;
    
    /**
     * @brief Skip to previous track in queue
     */
    virtual void previous() = 0;
    
    /**
     * @brief Seek to position
     * @param position Position in seconds
     */
    virtual void seek(double position) = 0;
    
    /**
     * @brief Add track to queue
     * @param uri URI of the track to add
     */
    virtual void enqueue(const std::string& uri) = 0;
    
    /**
     * @brief Clear the playback queue
     */
    virtual void clearQueue() = 0;
    
    /**
     * @brief Set repeat mode
     * @param mode Repeat mode
     */
    virtual void setRepeatMode(RepeatMode mode) = 0;
    
    /**
     * @brief Set shuffle mode
     * @param shuffle True to enable shuffle
     */
    virtual void setShuffleMode(bool shuffle) = 0;
    
    /**
     * @brief Get current playback position
     * @return Position in seconds
     */
    virtual double getCurrentPosition() = 0;
    
    /**
     * @brief Get current track duration
     * @return Duration in seconds
     */
    virtual double getDuration() = 0;
    
    /**
     * @brief Check if player is playing
     * @return True if playing
     */
    virtual bool isPlaying() = 0;
    
    /**
     * @brief Add playback observer
     * @param observer Observer to add
     */
    virtual void addObserver(std::shared_ptr<IPlaybackObserver> observer) = 0;
    
    /**
     * @brief Remove playback observer
     * @param observer Observer to remove
     */
    virtual void removeObserver(std::shared_ptr<IPlaybackObserver> observer) = 0;
};

} // namespace playback
} // namespace sonora