#pragma once

#include "sonora/core/filesystem/IFileProvider.h"
#include <string>
#include <cstdio>

namespace sonora {
namespace providers {

/**
 * @brief Implementation of InputStream for local files
 */
class LocalFileInputStream : public sonora::filesystem::InputStream {
public:
    LocalFileInputStream(const std::string& path);
    ~LocalFileInputStream();
    
    // InputStream implementation
    size_t read(uint8_t* buffer, size_t size) override;
    bool seek(int64_t position) override;
    int64_t tell() override;
    bool isEOF() override;
    
private:
    FILE* mFile;
};

/**
 * @brief File provider implementation for local filesystem
 */
class LocalFileProvider : public sonora::filesystem::IFileProvider {
public:
    LocalFileProvider(const std::string& rootDirectory);
    
    // IFileProvider implementation
    std::vector<sonora::filesystem::FileInfo> listFiles(const std::string& directory) override;
    std::unique_ptr<sonora::filesystem::InputStream> openFile(const std::string& path) override;
    sonora::filesystem::FileMetadata getFileMetadata(const std::string& path) override;
    std::future<std::vector<sonora::filesystem::FileInfo>> listFilesAsync(const std::string& directory) override;
    std::future<std::unique_ptr<sonora::filesystem::InputStream>> openFileAsync(const std::string& path) override;
    
private:
    std::string mRootDirectory;
};

} // namespace providers
} // namespace sonora