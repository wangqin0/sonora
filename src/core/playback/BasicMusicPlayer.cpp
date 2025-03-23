#include "sonora/core/playback/BasicMusicPlayer.h"
#include <algorithm>
#include <iostream>
#include <chrono>
#include <thread>

// FFmpeg includes
extern "C" {
    #include <libavformat/avformat.h>
    #include <libavcodec/avcodec.h>
    #include <libswresample/swresample.h>
    #include <libavutil/opt.h>
}

namespace debug {
void printQueue(const std::queue<std::string>& queue) {
    std::cout << "Queue contents: ";
    auto copy = queue;
    while (!copy.empty()) {
        std::cout << copy.front() << " ";
        copy.pop();
    }
    std::cout << std::endl;
}
} // namespace debug

namespace sonora {
namespace playback {

BasicMusicPlayer::BasicMusicPlayer()
    : mIsPlaying(false)
    , mIsPaused(false)
    , mShouldStop(false)
    , mCurrentPosition(0)
    , mDuration(0)
    , mRepeatMode(RepeatMode::None)
    , mShuffleMode(false)
    , mFormatContext(nullptr)
    , mCodecContext(nullptr)
    , mSwrContext(nullptr)
    , mAudioStream(-1)
{
    // Initialize FFmpeg (in a real app, this would be done once at application startup)
    // av_register_all(); // Deprecated in newer FFmpeg versions
}

BasicMusicPlayer::~BasicMusicPlayer() {
    stop();
    clearQueue();
}

void BasicMusicPlayer::play(const std::string& uri) {
    // Stop current playback if any
    stop();
    
    // Clear queue and add the new track
    {
        std::lock_guard<std::mutex> lock(mQueueMutex);
        std::queue<std::string> empty;
        // swap trick for clearing the (possibly very large) queue
        std::swap(mQueue, empty);
        mQueue.push(uri);
    }
    
    mCurrentTrack = uri;
    mIsPlaying = true;
    mIsPaused = false;
    mShouldStop = false;
    
    // Start playback thread
    if (mPlaybackThread.joinable()) {
        mPlaybackThread.join();
    }
    
    mPlaybackThread = std::thread(&BasicMusicPlayer::playbackThreadFunction, this);
    
    notifyTrackChanged(uri);
    notifyPlaybackStarted();
}

void BasicMusicPlayer::pause() {
    if (mIsPlaying && !mIsPaused) {
        mIsPaused = true;
        notifyPlaybackPaused();
    }
}

void BasicMusicPlayer::resume() {
    if (mIsPlaying && mIsPaused) {
        mIsPaused = false;
        notifyPlaybackStarted();
    }
}

void BasicMusicPlayer::stop() {
    if (mIsPlaying) {
        mShouldStop = true;
        mIsPlaying = false;
        mIsPaused = false;
        
        if (mPlaybackThread.joinable()) {
            mPlaybackThread.join();
        }
        
        mCurrentTrack = "";
        mCurrentPosition = 0;
        
        notifyPlaybackStopped();
    }
}

void BasicMusicPlayer::next() {
    std::cout << "mQueue size before next: " << mQueue.size() << std::endl;
    debug::printQueue(mQueue);

    if (mQueue.size() <= 1) {
        std::cerr << "Queue is empty, cannot play next track." << std::endl;
        stop();
        return;
    }
    
    std::string nextTrack;
    {
        std::lock_guard<std::mutex> lock(mQueueMutex);
        if (mQueue.empty()) return;

        nextTrack = mQueue.front();
        mQueue.pop();
    }
    
    play(nextTrack);
}

void BasicMusicPlayer::previous() {
    // In a real implementation, you'd want to keep track of play history
    // For now, just restart the current track
    if (!mCurrentTrack.empty()) {
        play(mCurrentTrack);
    }
}

void BasicMusicPlayer::seek(double position) {
    // For a minimal implementation, just update the position
    // In a real player, you'd seek in the actual audio stream
    mCurrentPosition = position;
    notifyPlaybackProgress(mCurrentPosition, mDuration);
}

void BasicMusicPlayer::enqueue(const std::string& uri) {
    std::lock_guard<std::mutex> lock(mQueueMutex);
    mQueue.push(uri);
}

void BasicMusicPlayer::clearQueue() {
    std::lock_guard<std::mutex> lock(mQueueMutex);
    std::queue<std::string> empty;
    std::swap(mQueue, empty);
}

void BasicMusicPlayer::setRepeatMode(RepeatMode mode) {
    mRepeatMode = mode;
}

void BasicMusicPlayer::setShuffleMode(bool shuffle) {
    mShuffleMode = shuffle;
}

double BasicMusicPlayer::getCurrentPosition() {
    return mCurrentPosition;
}

double BasicMusicPlayer::getDuration() {
    return mDuration;
}

bool BasicMusicPlayer::isPlaying() {
    return mIsPlaying && !mIsPaused;
}

void BasicMusicPlayer::addObserver(std::shared_ptr<IPlaybackObserver> observer) {
    std::lock_guard<std::mutex> lock(mObserverMutex);
    mObservers.push_back(observer);
}

void BasicMusicPlayer::removeObserver(std::shared_ptr<IPlaybackObserver> observer) {
    std::lock_guard<std::mutex> lock(mObserverMutex);
    mObservers.erase(
        std::remove_if(
            mObservers.begin(), 
            mObservers.end(),
            [observer](const std::shared_ptr<IPlaybackObserver>& obs) {
                return obs == observer;
            }
        ),
        mObservers.end()
    );
}

void BasicMusicPlayer::notifyPlaybackStarted() {
    std::lock_guard<std::mutex> lock(mObserverMutex);
    for (auto& observer : mObservers) {
        observer->onPlaybackStarted();
    }
}

void BasicMusicPlayer::notifyPlaybackPaused() {
    std::lock_guard<std::mutex> lock(mObserverMutex);
    for (auto& observer : mObservers) {
        observer->onPlaybackPaused();
    }
}

void BasicMusicPlayer::notifyPlaybackStopped() {
    std::lock_guard<std::mutex> lock(mObserverMutex);
    for (auto& observer : mObservers) {
        observer->onPlaybackStopped();
    }
}

void BasicMusicPlayer::notifyTrackChanged(const std::string& uri) {
    std::lock_guard<std::mutex> lock(mObserverMutex);
    for (auto& observer : mObservers) {
        observer->onTrackChanged(uri);
    }
}

void BasicMusicPlayer::notifyPlaybackProgress(double position, double duration) {
    std::lock_guard<std::mutex> lock(mObserverMutex);
    for (auto& observer : mObservers) {
        observer->onPlaybackProgress(position, duration);
    }
}

void BasicMusicPlayer::playbackThreadFunction() {
    // In a real implementation, this would decode audio and play it through the sound system
    // For our minimal version, we'll simulate playback with sleep
    
    if (!openAudioFile(mCurrentTrack)) {
        std::cerr << "Failed to open audio file: " << mCurrentTrack << std::endl;
        mIsPlaying = false;
        notifyPlaybackStopped();
        return;
    }
    
    // Get duration (in a real implementation, this would come from the audio file)
    mDuration = 180.0; // 3 minutes as an example
    mCurrentPosition = 0.0;
    
    const auto startTime = std::chrono::steady_clock::now();
    
    while (mIsPlaying && !mShouldStop) {
        if (!mIsPaused) {
            // Update position
            auto elapsed = std::chrono::steady_clock::now() - startTime;
            mCurrentPosition = std::chrono::duration<double>(elapsed).count();
            
            // Notify progress
            notifyPlaybackProgress(mCurrentPosition, mDuration);
            
            // Check if track is finished
            if (mCurrentPosition >= mDuration) {
                // Handle repeat mode
                if (mRepeatMode == RepeatMode::Single) {
                    // Restart the track
                    play(mCurrentTrack);
                    return;
                } else if (mRepeatMode == RepeatMode::All) {
                    // Add current track to end of queue
                    enqueue(mCurrentTrack);
                }
                
                // Move to next track
                next();
                return;
            }
        }
        
        // Sleep a bit to reduce CPU usage
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    closeAudioFile();
}

bool BasicMusicPlayer::openAudioFile([[maybe_unused]] const std::string& uri) {
    // In a real implementation, this would use FFmpeg to open and decode the audio file
    // For our minimal version, we'll just return success
    return true;
}

void BasicMusicPlayer::closeAudioFile() {
    // In a real implementation, this would close FFmpeg resources
}

} // namespace playback
} // namespace sonora