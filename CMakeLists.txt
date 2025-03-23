cmake_minimum_required(VERSION 3.14)

# Project definition
project(Sonora 
    VERSION 0.1.0
    DESCRIPTION "Cross-platform open-source music player"
    LANGUAGES CXX
)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Include custom modules
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

# Build options
option(SONORA_BUILD_TESTS "Build test suite" ON)
option(SONORA_ENABLE_COVERAGE "Enable code coverage" OFF)
option(SONORA_USE_SANITIZERS "Use address and undefined behavior sanitizers" OFF)
option(SONORA_STATIC_ANALYSIS "Enable static analysis during build" ON)

# Include helper modules
include(cmake/CompilerOptions.cmake)

if(DEFINED VCPKG_ROOT AND DEFINED VCPKG_TARGET_TRIPLET)
  set(BOOST_ROOT "${VCPKG_ROOT}/installed/${VCPKG_TARGET_TRIPLET}")
  set(BOOST_INCLUDEDIR "${BOOST_ROOT}/include")
  set(BOOST_LIBRARYDIR "${BOOST_ROOT}/lib")
endif()

# Dependencies
find_package(Threads REQUIRED)
find_package(FFmpeg REQUIRED)
find_package(Boost REQUIRED COMPONENTS filesystem program_options)
find_package(SQLite3 REQUIRED)

# Set output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Define include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${Boost_INCLUDE_DIRS}
    ${FFMPEG_INCLUDE_DIRS}
    ${SQLite3_INCLUDE_DIRS}
)

# Add subdirectories
add_subdirectory(src)

# Add test directory if enabled
if(SONORA_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)

    # Include the test configuration
    include(cmake/TestConfig.cmake)

    # Apply warning suppression to GoogleTest targets
    configure_gtest_warnings()

    # Add after GoogleTest setup
    include(cmake/GoogleTestWarnings.cmake)
endif()

# Add documentation generation
add_subdirectory(docs)

# Install targets
install(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/include/sonora
        DESTINATION include
        FILES_MATCHING PATTERN "*.h")

# Generate package configuration
include(CPack)
