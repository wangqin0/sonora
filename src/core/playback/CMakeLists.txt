# Collect source files
file(GLOB_RECURSE PLAYBACK_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/*.cpp")

# Add sources to the core library
target_sources(sonora-core PRIVATE ${PLAYBACK_SOURCES})
