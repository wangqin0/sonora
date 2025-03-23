# Enable testing
enable_testing()

# Find Google Test package
find_package(GTest QUIET)
if(NOT GTest_FOUND)
    # If not found, use FetchContent to download GoogleTest
    include(FetchContent)
    FetchContent_Declare(
        googletest
        GIT_REPOSITORY https://github.com/google/googletest.git
        GIT_TAG release-1.12.1
    )
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-sign-conversion")
    FetchContent_MakeAvailable(googletest)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS_ORIGINAL}")
endif()

# Add unit tests
add_subdirectory(unit)

# Add integration tests
add_subdirectory(integration)