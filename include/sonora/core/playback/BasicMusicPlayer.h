#pragma once

#include "IMusicPlayer.h"
#include <queue>
#include <mutex>
#include <thread>
#include <atomic>
#include <memory>
#include <vector>
#include <string>
#include <algorithm>

extern "C" {
    struct AVFormatContext;
    struct AVCodecContext;
    struct SwrContext;
}

namespace sonora {
namespace playback {

/**
 * @brief Basic implementation of music player
 */
class BasicMusicPlayer : public IMusicPlayer {
public:
    BasicMusicPlayer();
    ~BasicMusicPlayer();
    
    // IMusicPlayer implementation
    void play(const std::string& uri) override;
    void pause() override;
    void resume() override;
    void stop() override;
    void next() override;
    void previous() override;
    void seek(double position) override;
    void enqueue(const std::string& uri) override;
    void clearQueue() override;
    void setRepeatMode(RepeatMode mode) override;
    void setShuffleMode(bool shuffle) override;
    double getCurrentPosition() override;
    double getDuration() override;
    bool isPlaying() override;
    void addObserver(std::shared_ptr<IPlaybackObserver> observer) override;
    void removeObserver(std::shared_ptr<IPlaybackObserver> observer) override;
    
private:
    // Playback state
    std::atomic<bool> mIsPlaying;
    std::atomic<bool> mIsPaused;
    std::atomic<bool> mShouldStop;
    double mCurrentPosition;
    double mDuration;
    std::string mCurrentTrack;
    RepeatMode mRepeatMode;
    bool mShuffleMode;
    
    // Queue management
    std::queue<std::string> mQueue;
    std::mutex mQueueMutex;
    
    // Observer management
    std::vector<std::shared_ptr<IPlaybackObserver>> mObservers;
    std::mutex mObserverMutex;
    
    // Playback thread
    std::thread mPlaybackThread;
    
    // FFmpeg resources
    AVFormatContext* mFormatContext;
    AVCodecContext* mCodecContext;
    SwrContext* mSwrContext;
    int mAudioStream;
    
    // Internal methods
    void playbackThreadFunction();
    bool openAudioFile(const std::string& uri);
    void closeAudioFile();
    
    // Observer notifications
    void notifyPlaybackStarted();
    void notifyPlaybackPaused();
    void notifyPlaybackStopped();
    void notifyTrackChanged(const std::string& uri);
    void notifyPlaybackProgress(double position, double duration);
};

} // namespace playback
} // namespace sonora