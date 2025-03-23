# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Set compiler warning levels
if(MSVC)
    # Visual Studio options
    add_compile_options(/W4 /MP /EHsc)
    
    # Disable specific warnings
    add_compile_options(/wd4251) # class needs to have dll-interface
    add_compile_options(/wd4275) # non dll-interface class used as base
else()
    # GCC/Clang options
    add_compile_options(-Wall -Wextra -Wpedantic)
    
    # Additional warnings
    add_compile_options(-Woverloaded-virtual -Wcast-qual -Wconversion -Wsign-conversion)
endif()

# Use position independent code
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Enable C++ 17 filesystem (need explicit linking for some compilers)
if(NOT MSVC)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17")
    if(CMAKE_CXX_COMPILER_ID MATCHES "GNU")
        # Add compiler-specific flags
        if(CMAKE_CXX_COMPILER_VERSION VERSION_LESS 9.0)
            link_libraries(stdc++fs)  # For GCC < 9
        endif()
    elseif(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
        # Add Clang-specific flags
        if(CMAKE_CXX_COMPILER_VERSION VERSION_LESS 9.0)
            link_libraries(c++fs)  # For Clang < 9
        endif()
    endif()
endif()

# Enable sanitizers if requested
if(SONORA_USE_SANITIZERS)
    if(NOT MSVC)
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address,undefined -fno-omit-frame-pointer")
        set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fsanitize=address,undefined")
    else()
        message(WARNING "Sanitizers are not supported on MSVC")
    endif()
endif()

# Enable code coverage if requested
if(SONORA_ENABLE_COVERAGE)
    if(NOT MSVC)
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} --coverage")
        set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} --coverage")
    else()
        message(WARNING "Code coverage is not supported on MSVC")
    endif()
endif()

# Enable static analysis if requested
if(SONORA_STATIC_ANALYSIS)
    if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
        find_program(CLANG_TIDY_EXE NAMES "clang-tidy")
        if(CLANG_TIDY_EXE)
            set(CMAKE_CXX_CLANG_TIDY "${CLANG_TIDY_EXE};-format-style=file")
        endif()
    elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU")
        find_program(CPPCHECK_EXE NAMES "cppcheck")
        if(CPPCHECK_EXE)
            set(CMAKE_CXX_CPPCHECK 
                "${CPPCHECK_EXE}"
                "--enable=warning,performance,portability"
                "--inconclusive"
                "--force"
                "--inline-suppr")
        endif()
    endif()
endif()

# Add definitions for platform detection
if(WIN32)
    add_definitions(-DPLATFORM_WINDOWS)
elseif(APPLE)
    add_definitions(-DPLATFORM_MACOS)
elseif(UNIX)
    add_definitions(-DPLATFORM_LINUX)
endif()