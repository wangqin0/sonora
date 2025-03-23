# Core library components
add_subdirectory(core)

# CLI application
add_subdirectory(cli)

# File providers
add_subdirectory(providers)

# UI implementations (empty for now)
# add_subdirectory(ui)

# Main executable target
add_executable(sonora
    main.cpp
)

target_link_libraries(sonora
    PRIVATE
    sonora-cli
    sonora-core
    sonora-providers
    Boost::program_options
    Threads::Threads
)

# Install the executable
install(TARGETS sonora
        RUNTIME DESTINATION bin)