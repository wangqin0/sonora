# Collect source files
file(GLOB_RECURSE CLI_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/*.cpp")

# Create CLI library
add_library(sonora-cli
    ${CLI_SOURCES}
)

# Define include directories
target_include_directories(sonora-cli
    PUBLIC
    ${CMAKE_SOURCE_DIR}/include
)

# Link dependencies
target_link_libraries(sonora-cli
    PUBLIC
    sonora-core
    Boost::program_options
)