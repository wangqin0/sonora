# Collect source files
file(GLOB_RECURSE CORE_FILESYSTEM_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/filesystem/*.cpp")
file(GLOB_RECURSE CORE_LIBRARY_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/library/*.cpp")
file(GLOB_RECURSE CORE_PLAYBACK_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/playback/*.cpp")

# Create core library
add_library(sonora-core
    ${CORE_FILESYSTEM_SOURCES}
    ${CORE_LIBRARY_SOURCES}
    ${CORE_PLAYBACK_SOURCES}
)

# Define include directories
target_include_directories(sonora-core
    PUBLIC
    ${CMAKE_SOURCE_DIR}/include
)

# Link dependencies
target_link_libraries(sonora-core
    PUBLIC
    Boost::filesystem
    ${FFMPEG_LIBRARIES}
    ${SQLite3_LIBRARIES}
    Threads::Threads
)

# Add filesystem component
add_subdirectory(filesystem)

# Add library component
add_subdirectory(library)

# Add playback component
add_subdirectory(playback)

# Export targets
install(TARGETS sonora-core
        EXPORT SonoraTargets
        LIBRARY DESTINATION lib
        ARCHIVE DESTINATION lib)