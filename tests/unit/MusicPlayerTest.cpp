#include <gtest/gtest.h>
#include "sonora/core/playback/BasicMusicPlayer.h"
#include <memory>
#include <chrono>
#include <thread>

class TestPlaybackObserver : public sonora::playback::IPlaybackObserver {
public:
    bool playbackStarted = false;
    bool playbackPaused = false;
    bool playbackStopped = false;
    std::string currentTrack;
    double currentPosition = 0.0;
    double currentDuration = 0.0;
    
    void reset() {
        playbackStarted = false;
        playbackPaused = false;
        playbackStopped = false;
        currentTrack = "";
        currentPosition = 0.0;
        currentDuration = 0.0;
    }
    
    void onPlaybackStarted() override {
        playbackStarted = true;
    }
    
    void onPlaybackPaused() override {
        playbackPaused = true;
    }
    
    void onPlaybackStopped() override {
        playbackStopped = true;
    }
    
    void onTrackChanged(const std::string& uri) override {
        currentTrack = uri;
    }
    
    void onPlaybackProgress(double position, double duration) override {
        currentPosition = position;
        currentDuration = duration;
    }
};

TEST(MusicPlayerTest, BasicPlayback) {
    auto player = std::make_shared<sonora::playback::BasicMusicPlayer>();
    auto observer = std::make_shared<TestPlaybackObserver>();
    
    player->addObserver(observer);
    
    // Test play
    player->play("test_track.mp3");
    EXPECT_TRUE(observer->playbackStarted);
    EXPECT_EQ(observer->currentTrack, "test_track.mp3");
    
    // Test pause
    observer->reset();
    player->pause();
    EXPECT_TRUE(observer->playbackPaused);
    
    // Test resume
    observer->reset();
    player->resume();
    EXPECT_TRUE(observer->playbackStarted);
    
    // Test stop
    observer->reset();
    player->stop();
    EXPECT_TRUE(observer->playbackStopped);
    
    // Test queue operations
    observer->reset();
    player->enqueue("track1.mp3");
    player->enqueue("track2.mp3");
    player->play("track0.mp3");
    EXPECT_TRUE(player->isPlaying());
    
    // Test next track
    observer->reset();
    player->next();
    EXPECT_EQ(observer->currentTrack, "");
    
    // Cleanup
    player->removeObserver(observer);
}