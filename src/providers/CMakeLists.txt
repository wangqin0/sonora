# Collect source files for providers
file(GLOB_RECURSE PROVIDERS_LOCAL_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/local/*.cpp")
file(GLOB_RECURSE PROVIDERS_ONEDRIVE_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/onedrive/*.cpp")

# Create providers library
add_library(sonora-providers
    ${PROVIDERS_LOCAL_SOURCES}
    ${PROVIDERS_ONEDRIVE_SOURCES}
)

# Define include directories
target_include_directories(sonora-providers
    PUBLIC
    ${CMAKE_SOURCE_DIR}/include
)

# Link dependencies
target_link_libraries(sonora-providers
    PUBLIC
    sonora-core
    Boost::filesystem
)

# Add local provider component
add_subdirectory(local)

# OneDrive provider (disabled for now)
# add_subdirectory(onedrive)