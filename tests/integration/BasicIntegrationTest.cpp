#include <gtest/gtest.h>
#include "sonora/providers/local/LocalFileProvider.h"
#include "sonora/core/playback/BasicMusicPlayer.h"
#include <boost/filesystem.hpp>
#include <fstream>
#include <thread>
#include <chrono>

namespace fs = boost::filesystem;

class BasicIntegrationTest : public ::testing::Test {
protected:
    fs::path testDir;
    std::shared_ptr<sonora::providers::LocalFileProvider> fileProvider;
    std::shared_ptr<sonora::playback::BasicMusicPlayer> musicPlayer;
    
    void SetUp() override {
        // Create a temporary test directory
        testDir = fs::temp_directory_path() / "sonora_integration_test";
        fs::create_directory(testDir);
        
        // Create some test files (these would be audio files in a real setup)
        createTestFile(testDir / "song1.mp3", "Mock MP3 Content 1");
        createTestFile(testDir / "song2.mp3", "Mock MP3 Content 2");
        
        // Initialize components
        fileProvider = std::make_shared<sonora::providers::LocalFileProvider>(testDir.string());
        musicPlayer = std::make_shared<sonora::playback::BasicMusicPlayer>();
    }
    
    void TearDown() override {
        // Clean up test directory
        fs::remove_all(testDir);
    }
    
    void createTestFile(const fs::path& path, const std::string& content) {
        std::ofstream file(path.string());
        file << content;
        file.close();
    }
};

TEST_F(BasicIntegrationTest, PlaySongFromProvider) {
    // List all files in the test directory
    auto files = fileProvider->listFiles("");
    ASSERT_FALSE(files.empty());
    
    // Find a music file to play
    std::string musicFile;
    for (const auto& file : files) {
        if (!file.isDirectory && file.name.find(".mp3") != std::string::npos) {
            musicFile = file.path;
            break;
        }
    }
    ASSERT_FALSE(musicFile.empty());
    
    // Attempt to play the file
    musicPlayer->play(musicFile);
    EXPECT_TRUE(musicPlayer->isPlaying());
    
    // Wait a bit and check if playback is still active
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    EXPECT_TRUE(musicPlayer->isPlaying());
    
    // Stop playback
    musicPlayer->stop();
    EXPECT_FALSE(musicPlayer->isPlaying());
}