if(NOT DEFINED VCPKG_ROOT AND DEFINED CMAKE_TOOLCHAIN_FILE)
  # Assume toolchain file is at <vcpkg-root>/scripts/buildsystems/vcpkg.cmake
  get_filename_component(_vcpkg_buildsystems_dir "${CMAKE_TOOLCHAIN_FILE}" DIRECTORY)
  get_filename_component(_vcpkg_scripts_dir "${_vcpkg_buildsystems_dir}" DIRECTORY)
  get_filename_component(VCPKG_ROOT "${_vcpkg_scripts_dir}" DIRECTORY)
endif()

if(NOT DEFINED VCPKG_TARGET_TRIPLET)
  if(DEFINED ENV{VCPKG_DEFAULT_TRIPLET})
    set(VCPKG_TARGET_TRIPLET $ENV{VCPKG_DEFAULT_TRIPLET})
  else()
    set(VCPKG_TARGET_TRIPLET "x64-windows")
  endif()
endif()

# Use environment variables as fallback if not defined.
if(NOT DEFINED VCPKG_ROOT AND DEFINED ENV{VCPKG_ROOT})
    set(VCPKG_ROOT $ENV{VCPKG_ROOT})
endif()
if(NOT DEFINED VCPKG_TARGET_TRIPLET AND DEFINED ENV{VCPKG_DEFAULT_TRIPLET})
    set(VCPKG_TARGET_TRIPLET $ENV{VCPKG_DEFAULT_TRIPLET})
endif()

# Set vcpkg-specific directories if available.
if(DEFINED VCPKG_ROOT AND DEFINED VCPKG_TARGET_TRIPLET)
    set(VCPKG_INCLUDE_DIR "${VCPKG_ROOT}/installed/${VCPKG_TARGET_TRIPLET}/include")
    set(VCPKG_LIBRARY_DIR "${VCPKG_ROOT}/installed/${VCPKG_TARGET_TRIPLET}/lib")
else()
    set(VCPKG_INCLUDE_DIR "")
    set(VCPKG_LIBRARY_DIR "")
endif()

# Also use CMAKE_PREFIX_PATH as additional hints.
set(FFMPEG_INCLUDE_HINTS ${VCPKG_INCLUDE_DIR} ${CMAKE_PREFIX_PATH})
set(FFMPEG_LIBRARY_HINTS ${VCPKG_LIBRARY_DIR} "${CMAKE_PREFIX_PATH}/lib")

find_path(AVCODEC_INCLUDE_DIR
    NAMES libavcodec/avcodec.h
    HINTS ${FFMPEG_INCLUDE_HINTS}
    PATHS /usr/include /usr/local/include /opt/local/include
    PATH_SUFFIXES ffmpeg
)

find_path(AVFORMAT_INCLUDE_DIR
    NAMES libavformat/avformat.h
    HINTS ${FFMPEG_INCLUDE_HINTS}
    PATHS /usr/include /usr/local/include /opt/local/include
    PATH_SUFFIXES ffmpeg
)

find_path(AVUTIL_INCLUDE_DIR
    NAMES libavutil/avutil.h
    HINTS ${FFMPEG_INCLUDE_HINTS}
    PATHS /usr/include /usr/local/include /opt/local/include
    PATH_SUFFIXES ffmpeg
)

find_path(SWSCALE_INCLUDE_DIR
    NAMES libswscale/swscale.h
    HINTS ${FFMPEG_INCLUDE_HINTS}
    PATHS /usr/include /usr/local/include /opt/local/include
    PATH_SUFFIXES ffmpeg
)

find_path(SWRESAMPLE_INCLUDE_DIR
    NAMES libswresample/swresample.h
    HINTS ${FFMPEG_INCLUDE_HINTS}
    PATHS /usr/include /usr/local/include /opt/local/include
    PATH_SUFFIXES ffmpeg
)

find_library(AVCODEC_LIBRARY
    NAMES avcodec
    HINTS ${FFMPEG_LIBRARY_HINTS}
    PATHS /usr/lib /usr/local/lib /opt/local/lib
)

find_library(AVFORMAT_LIBRARY
    NAMES avformat
    HINTS ${FFMPEG_LIBRARY_HINTS}
    PATHS /usr/lib /usr/local/lib /opt/local/lib
)

find_library(AVUTIL_LIBRARY
    NAMES avutil
    HINTS ${FFMPEG_LIBRARY_HINTS}
    PATHS /usr/lib /usr/local/lib /opt/local/lib
)

find_library(SWSCALE_LIBRARY
    NAMES swscale
    HINTS ${FFMPEG_LIBRARY_HINTS}
    PATHS /usr/lib /usr/local/lib /opt/local/lib
)

find_library(SWRESAMPLE_LIBRARY
    NAMES swresample
    HINTS ${FFMPEG_LIBRARY_HINTS}
    PATHS /usr/lib /usr/local/lib /opt/local/lib
)

set(FFMPEG_INCLUDE_DIRS
    ${AVCODEC_INCLUDE_DIR}
    ${AVFORMAT_INCLUDE_DIR}
    ${AVUTIL_INCLUDE_DIR}
    ${SWSCALE_INCLUDE_DIR}
    ${SWRESAMPLE_INCLUDE_DIR}
)

set(FFMPEG_LIBRARIES
    ${AVCODEC_LIBRARY}
    ${AVFORMAT_LIBRARY}
    ${AVUTIL_LIBRARY}
    ${SWSCALE_LIBRARY}
    ${SWRESAMPLE_LIBRARY}
)

list(REMOVE_DUPLICATES FFMPEG_INCLUDE_DIRS)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(FFmpeg
    REQUIRED_VARS
        AVCODEC_LIBRARY AVCODEC_INCLUDE_DIR
        AVFORMAT_LIBRARY AVFORMAT_INCLUDE_DIR
        AVUTIL_LIBRARY AVUTIL_INCLUDE_DIR
        SWSCALE_LIBRARY SWSCALE_INCLUDE_DIR
        SWRESAMPLE_LIBRARY SWRESAMPLE_INCLUDE_DIR
)

mark_as_advanced(
    AVCODEC_INCLUDE_DIR AVCODEC_LIBRARY
    AVFORMAT_INCLUDE_DIR AVFORMAT_LIBRARY
    AVUTIL_INCLUDE_DIR AVUTIL_LIBRARY
    SWSCALE_INCLUDE_DIR SWSCALE_LIBRARY
    SWRESAMPLE_INCLUDE_DIR SWRESAMPLE_LIBRARY
)
