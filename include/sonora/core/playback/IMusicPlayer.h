#pragma once

#include <memory>
#include <string>
#include <vector>

namespace sonora {
namespace playback {

// Forward declaration
class IPlaybackObserver;

/**
 * @brief Repeat mode for playback
 */
enum class RepeatMode {
    None,     // No repeat
    Single,   // Repeat current track
    All       // Repeat all tracks
};

/**
 * @brief Observer interface for playback events
 */
class IPlaybackObserver {
public:
    virtual ~IPlaybackObserver() = default;
    
    virtual void onPlaybackStarted() = 0;
    virtual void onPlaybackPaused() = 0;
    virtual void onPlaybackStopped() = 0;
    virtual void onTrackChanged(const std::string& uri) = 0;
    virtual void onPlaybackProgress(double position, double duration) = 0;
};

/**
 * @brief Interface for music player implementations
 */
class IMusicPlayer {
public:
    virtual ~IMusicPlayer() = default;
    
    // Playback control
    virtual void play(const std::string& uri) = 0;
    virtual void pause() = 0;
    virtual void resume() = 0;
    virtual void stop() = 0;
    virtual void next() = 0;
    virtual void previous() = 0;
    virtual void seek(double position) = 0;
    
    // Queue management
    virtual void enqueue(const std::string& uri) = 0;
    virtual void clearQueue() = 0;
    
    // Playback settings
    virtual void setRepeatMode(RepeatMode mode) = 0;
    virtual void setShuffleMode(bool shuffle) = 0;
    
    // Status information
    virtual double getCurrentPosition() = 0;
    virtual double getDuration() = 0;
    virtual bool isPlaying() = 0;
    
    // Observer pattern
    virtual void addObserver(std::shared_ptr<IPlaybackObserver> observer) = 0;
    virtual void removeObserver(std::shared_ptr<IPlaybackObserver> observer) = 0;
};

} // namespace playback
} // namespace sonora