#include <gtest/gtest.h>
#include "sonora/providers/local/LocalFileProvider.h"
#include <boost/filesystem.hpp>
#include <fstream>

namespace fs = boost::filesystem;

class LocalFileProviderTest : public ::testing::Test {
protected:
    fs::path testDir;
    
    void SetUp() override {
        // Create a temporary test directory
        testDir = fs::temp_directory_path() / "sonora_test";
        fs::create_directory(testDir);
        
        // Create some test files
        createTestFile(testDir / "test1.txt", "Test file 1");
        createTestFile(testDir / "test2.txt", "Test file 2");
        
        // Create a subdirectory
        fs::path subDir = testDir / "subdir";
        fs::create_directory(subDir);
        createTestFile(subDir / "test3.txt", "Test file 3");
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

TEST_F(LocalFileProviderTest, ListFiles) {
    sonora::providers::LocalFileProvider provider(testDir.string());
    
    // List files in root directory
    auto files = provider.listFiles("");
    ASSERT_EQ(files.size(), 3); // 2 files + 1 directory
    
    // Check if we have the expected files
    bool foundFile1 = false;
    bool foundFile2 = false;
    bool foundSubdir = false;
    
    for (const auto& file : files) {
        if (file.name == "test1.txt") {
            foundFile1 = true;
            EXPECT_FALSE(file.isDirectory);
        } else if (file.name == "test2.txt") {
            foundFile2 = true;
            EXPECT_FALSE(file.isDirectory);
        } else if (file.name == "subdir") {
            foundSubdir = true;
            EXPECT_TRUE(file.isDirectory);
        }
    }
    
    EXPECT_TRUE(foundFile1);
    EXPECT_TRUE(foundFile2);
    EXPECT_TRUE(foundSubdir);
    
    // List files in subdirectory
    files = provider.listFiles("subdir");
    ASSERT_EQ(files.size(), 1);
    EXPECT_EQ(files[0].name, "test3.txt");
    EXPECT_FALSE(files[0].isDirectory);
}

TEST_F(LocalFileProviderTest, OpenFile) {
    sonora::providers::LocalFileProvider provider(testDir.string());
    
    // Open existing file
    auto stream = provider.openFile("test1.txt");
    ASSERT_NE(stream, nullptr);
    
    // Read content
    const size_t bufferSize = 1024;
    uint8_t buffer[bufferSize];
    size_t bytesRead = stream->read(buffer, bufferSize);
    
    std::string content(reinterpret_cast<char*>(buffer), bytesRead);
    EXPECT_EQ(content, "Test file 1");
    
    // Try to open non-existent file
    stream = provider.openFile("nonexistent.txt");
    EXPECT_EQ(stream, nullptr);
}

TEST_F(LocalFileProviderTest, AsyncListFiles) {
    sonora::providers::LocalFileProvider provider(testDir.string());
    
    // List files asynchronously
    auto futureFiles = provider.listFilesAsync("");
    auto files = futureFiles.get();
    
    ASSERT_EQ(files.size(), 3); // 2 files + 1 directory
}