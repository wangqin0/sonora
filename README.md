# Sonora Music Player

Sonora is a cross-platform, open-source music player built with C++ and FFmpeg.

## Features

- Play local music files with support for various formats (MP3, FLAC, OGG, WAV)
- Simple command-line interface
- Cross-platform support (Linux, macOS, Windows)
- Extensible provider architecture for supporting different file sources

## Building from Source

### Prerequisites

- CMake 3.14 or newer
- C++17 compatible compiler
- Dependencies:
  - Boost (filesystem, program_options)
  - FFmpeg
  - SQLite3

### Building

```bash
# Clone the repository
git clone https://github.com/yourusername/sonora.git
cd sonora

# Create build directory
mkdir build
cd build

# Configure and build
cmake ..
cmake --build .
```

### Running Tests

```bash
cd build
ctest
```

## Usage

```bash
# Basic usage
./bin/sonora

# Specify music library location
./bin/sonora -l /path/to/music

# Scan library
./bin/sonora -s

# For more options
./bin/sonora --help
```

## Command Reference

Once the application is running, the following commands are available:

- `play <filename>` - Play a file
- `pause` - Pause playback
- `resume` - Resume playback
- `stop` - Stop playback
- `next` - Play next track in queue
- `ls [directory]` - List files in directory
- `enqueue <filename>` - Add file to playback queue
- `clearqueue` - Clear playback queue
- `repeat <none|single|all>` - Set repeat mode
- `shuffle <on|off>` - Set shuffle mode
- `help` - Show available commands
- `exit` or `quit` - Exit the application

## License

This project is licensed under the MIT License - see the LICENSE file for details.