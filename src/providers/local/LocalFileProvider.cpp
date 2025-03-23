#include "sonora/providers/local/LocalFileProvider.h"
#include <boost/filesystem.hpp>
#include <cstring>
#include <fstream>
#include <future>
#include <thread>

namespace fs = boost::filesystem;

namespace sonora {
namespace providers {

LocalFileInputStream::LocalFileInputStream(const std::string& path) {
    mFile = fopen(path.c_str(), "rb");
    if (!mFile) {
        throw std::runtime_error("Failed to open file: " + path);
    }
}

LocalFileInputStream::~LocalFileInputStream() {
    if (mFile) {
        fclose(mFile);
        mFile = nullptr;
    }
}

size_t LocalFileInputStream::read(uint8_t* buffer, size_t size) {
    if (!mFile) return 0;
    return fread(buffer, 1, size, mFile);
}

bool LocalFileInputStream::seek(int64_t position) {
    if (!mFile) return false;
    return fseek(mFile, position, SEEK_SET) == 0;
}

int64_t LocalFileInputStream::tell() {
    if (!mFile) return -1;
    return ftell(mFile);
}

bool LocalFileInputStream::isEOF() {
    if (!mFile) return true;
    return feof(mFile) != 0;
}

// LocalFileProvider Implementation
LocalFileProvider::LocalFileProvider(const std::string& rootDirectory)
    : mRootDirectory(rootDirectory) {
    // Ensure the root directory has a trailing slash
    if (!mRootDirectory.empty() && mRootDirectory.back() != '/') {
        mRootDirectory += '/';
    }
}

std::vector<sonora::filesystem::FileInfo> LocalFileProvider::listFiles(const std::string& directory) {
    std::vector<sonora::filesystem::FileInfo> result;
    
    std::string fullPath = mRootDirectory + directory;
    
    try {
        fs::path dir(fullPath);
        if (!fs::exists(dir) || !fs::is_directory(dir)) {
            return result;
        }
        
        for (const auto& entry : fs::directory_iterator(dir)) {
            sonora::filesystem::FileInfo info;
            info.name = entry.path().filename().string();
            info.path = directory + (directory.empty() || directory.back() == '/' ? "" : "/") + info.name;
            info.isDirectory = fs::is_directory(entry.path());
            info.size = info.isDirectory ? 0 : fs::file_size(entry.path());
            info.modifiedTime = static_cast<uint64_t>(fs::last_write_time(entry.path()));
            
            result.push_back(info);
        }
    } catch (const fs::filesystem_error& e) {
        // Handle or log error
    }
    
    return result;
}

std::unique_ptr<sonora::filesystem::InputStream> LocalFileProvider::openFile(const std::string& path) {
    std::string fullPath = mRootDirectory + path;
    try {
        return std::make_unique<LocalFileInputStream>(fullPath);
    } catch (const std::exception& e) {
        return nullptr;
    }
}

sonora::filesystem::FileMetadata LocalFileProvider::getFileMetadata(const std::string& path) {
    sonora::filesystem::FileMetadata metadata;
    std::string fullPath = mRootDirectory + path;
    
    try {
        fs::path filePath(fullPath);
        if (!fs::exists(filePath) || fs::is_directory(filePath)) {
            return metadata;
        }
        
        // Simple MIME type detection based on extension
        std::string ext = filePath.extension().string();
        if (ext == ".mp3") {
            metadata.mimeType = "audio/mpeg";
        } else if (ext == ".flac") {
            metadata.mimeType = "audio/flac";
        } else if (ext == ".ogg") {
            metadata.mimeType = "audio/ogg";
        } else if (ext == ".wav") {
            metadata.mimeType = "audio/wav";
        } else {
            metadata.mimeType = "application/octet-stream";
        }
        
        // For a real implementation, you'd want to use libmagic or a similar library
        // for more accurate MIME type detection and file encoding information
    } catch (const fs::filesystem_error& e) {
        // Handle or log error
    }
    
    return metadata;
}

std::future<std::vector<sonora::filesystem::FileInfo>> LocalFileProvider::listFilesAsync(const std::string& directory) {
    return std::async(std::launch::async, [this, directory]() {
        return this->listFiles(directory);
    });
}

std::future<std::unique_ptr<sonora::filesystem::InputStream>> LocalFileProvider::openFileAsync(const std::string& path) {
    return std::async(std::launch::async, [this, path]() {
        return this->openFile(path);
    });
}

} // namespace providers
} // namespace sonora