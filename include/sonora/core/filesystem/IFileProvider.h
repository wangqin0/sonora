#pragma once

#include <future>
#include <memory>
#include <string>
#include <vector>

namespace sonora {
namespace filesystem {

/**
 * @brief Information about a file or directory
 */
struct FileInfo {
    std::string name;
    std::string path;
    bool isDirectory;
    uint64_t size;
    uint64_t modifiedTime;
};

/**
 * @brief Metadata about a file
 */
struct FileMetadata {
    uint64_t size;
    uint64_t modifiedTime;
    std::string mimeType;
};

/**
 * @brief Interface for reading from a file
 */
class InputStream {
public:
    virtual ~InputStream() = default;
    
    /**
     * @brief Read data from the stream
     * @param buffer Buffer to read data into
     * @param size Maximum number of bytes to read
     * @return Number of bytes actually read, 0 on EOF
     */
    virtual size_t read(uint8_t* buffer, size_t size) = 0;
    
    /**
     * @brief Seek to a position in the stream
     * @param position Position to seek to
     * @return true if successful, false otherwise
     */
    virtual bool seek(int64_t position) = 0;
    
    /**
     * @brief Get current position in the stream
     * @return Current position
     */
    virtual int64_t tell() = 0;
    
    /**
     * @brief Check if at end of file
     * @return true if at EOF, false otherwise
     */
    virtual bool isEOF() = 0;
};

/**
 * @brief Interface for file providers
 * 
 * This interface abstracts file access operations for different storage backends.
 */
class IFileProvider {
public:
    virtual ~IFileProvider() = default;
    
    /**
     * @brief List files in a directory
     * @param directory Directory path to list
     * @return Vector of FileInfo objects
     */
    virtual std::vector<FileInfo> listFiles(const std::string& directory) = 0;
    
    /**
     * @brief Open a file for reading
     * @param path Path to the file
     * @return InputStream pointer or nullptr on error
     */
    virtual std::unique_ptr<InputStream> openFile(const std::string& path) = 0;
    
    /**
     * @brief Get metadata for a file
     * @param path Path to the file
     * @return FileMetadata object
     */
    virtual FileMetadata getFileMetadata(const std::string& path) = 0;
    
    /**
     * @brief Asynchronously list files in a directory
     * @param directory Directory path to list
     * @return Future containing vector of FileInfo objects
     */
    virtual std::future<std::vector<FileInfo>> listFilesAsync(const std::string& directory) = 0;
    
    /**
     * @brief Asynchronously open a file for reading
     * @param path Path to the file
     * @return Future containing InputStream pointer or nullptr on error
     */
    virtual std::future<std::unique_ptr<InputStream>> openFileAsync(const std::string& path) = 0;
};

} // namespace filesystem
} // namespace sonora