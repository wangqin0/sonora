#include <iostream>
#include <string>
#include <memory>
#include <boost/program_options.hpp>

#include "sonora/cli/CommandHandler.h"
#include "sonora/core/playback/BasicMusicPlayer.h"
#include "sonora/providers/local/LocalFileProvider.h"

namespace po = boost::program_options;

class SonoraApp {
private:
    std::unique_ptr<sonora::cli::CommandHandler> mCommandHandler;
    std::shared_ptr<sonora::playback::BasicMusicPlayer> mMusicPlayer;
    std::shared_ptr<sonora::providers::LocalFileProvider> mFileProvider;
    std::string mLibraryPath;
    bool mVerbose;

public:
    SonoraApp(const std::string& libraryPath, bool verbose)
        : mLibraryPath(libraryPath)
        , mVerbose(verbose)
    {
        initialize();
    }

    void initialize() {
        // Create components
        mCommandHandler = std::make_unique<sonora::cli::CommandHandler>();
        mMusicPlayer = std::make_shared<sonora::playback::BasicMusicPlayer>();
        mFileProvider = std::make_shared<sonora::providers::LocalFileProvider>(mLibraryPath);

        // Register commands
        registerCommands();
    }

    void registerCommands() {
        // Music control commands
        mCommandHandler->registerCommand("play", "Play a file (play <filename>)", 
            [this](const std::vector<std::string>& args) {
                if (args.empty()) {
                    std::cout << "Usage: play <filename>" << std::endl;
                    return;
                }
                mMusicPlayer->play(args[0]);
                std::cout << "Playing: " << args[0] << std::endl;
            }
        );

        mCommandHandler->registerCommand("pause", "Pause playback", 
            [this](const std::vector<std::string>&) {
                mMusicPlayer->pause();
                std::cout << "Playback paused" << std::endl;
            }
        );

        mCommandHandler->registerCommand("resume", "Resume playback", 
            [this](const std::vector<std::string>&) {
                mMusicPlayer->resume();
                std::cout << "Playback resumed" << std::endl;
            }
        );

        mCommandHandler->registerCommand("stop", "Stop playback", 
            [this](const std::vector<std::string>&) {
                mMusicPlayer->stop();
                std::cout << "Playback stopped" << std::endl;
            }
        );

        mCommandHandler->registerCommand("next", "Play next track", 
            [this](const std::vector<std::string>&) {
                mMusicPlayer->next();
                std::cout << "Playing next track" << std::endl;
            }
        );

        // File system commands
        mCommandHandler->registerCommand("ls", "List files in directory", 
            [this](const std::vector<std::string>& args) {
                std::string dir = args.empty() ? "" : args[0];
                auto files = mFileProvider->listFiles(dir);
                
                std::cout << "Contents of " << (dir.empty() ? "root directory" : dir) << ":" << std::endl;
                for (const auto& file : files) {
                    std::cout << (file.isDirectory ? "[DIR] " : "      ")
                              << file.name << std::endl;
                }
                
                if (files.empty()) {
                    std::cout << "  (empty directory)" << std::endl;
                }
            }
        );

        // Queue management
        mCommandHandler->registerCommand("enqueue", "Add file to playback queue", 
            [this](const std::vector<std::string>& args) {
                if (args.empty()) {
                    std::cout << "Usage: enqueue <filename>" << std::endl;
                    return;
                }
                
                mMusicPlayer->enqueue(args[0]);
                std::cout << "Added to queue: " << args[0] << std::endl;
            }
        );

        mCommandHandler->registerCommand("clearqueue", "Clear playback queue", 
            [this](const std::vector<std::string>&) {
                mMusicPlayer->clearQueue();
                std::cout << "Queue cleared" << std::endl;
            }
        );

        // Player settings
        mCommandHandler->registerCommand("repeat", "Set repeat mode (none|single|all)", 
            [this](const std::vector<std::string>& args) {
                if (args.empty()) {
                    std::cout << "Usage: repeat <none|single|all>" << std::endl;
                    return;
                }
                
                if (args[0] == "none") {
                    mMusicPlayer->setRepeatMode(sonora::playback::RepeatMode::None);
                } else if (args[0] == "single") {
                    mMusicPlayer->setRepeatMode(sonora::playback::RepeatMode::Single);
                } else if (args[0] == "all") {
                    mMusicPlayer->setRepeatMode(sonora::playback::RepeatMode::All);
                } else {
                    std::cout << "Invalid repeat mode: " << args[0] << std::endl;
                    return;
                }
                
                std::cout << "Repeat mode set to: " << args[0] << std::endl;
            }
        );

        mCommandHandler->registerCommand("shuffle", "Set shuffle mode (on|off)", 
            [this](const std::vector<std::string>& args) {
                if (args.empty()) {
                    std::cout << "Usage: shuffle <on|off>" << std::endl;
                    return;
                }
                
                bool shuffle = (args[0] == "on");
                mMusicPlayer->setShuffleMode(shuffle);
                std::cout << "Shuffle mode: " << (shuffle ? "on" : "off") << std::endl;
            }
        );
    }

    void run() {
        std::cout << "Sonora Music Player" << std::endl;
        std::cout << "Type 'help' for available commands" << std::endl;
        
        std::string commandLine;
        while (true) {
            std::cout << "sonora> ";
            std::getline(std::cin, commandLine);
            
            if (!mCommandHandler->executeCommand(commandLine)) {
                // Command not found or empty line
            }
        }
    }
};

int main(int argc, char* argv[]) {
    try {
        // Set up command line options
        po::options_description desc("Sonora - Cross-platform Music Player\nOptions");
        desc.add_options()
            ("help,h", "Show help message")
            ("version,v", "Show version information")
            ("library,l", po::value<std::string>()->default_value("./music"), "Specify library path")
            ("scan,s", "Scan library for new files")
            ("verbose", "Enable verbose output");
            
        po::variables_map vm;
        po::store(po::parse_command_line(argc, argv, desc), vm);
        po::notify(vm);
        
        // Handle basic options
        if (vm.count("help")) {
            std::cout << desc << std::endl;
            return 0;
        }
        
        if (vm.count("version")) {
            std::cout << "Sonora v0.1.0" << std::endl;
            return 0;
        }
        
        // Extract options
        std::string libraryPath = vm["library"].as<std::string>();
        bool verbose = vm.count("verbose") > 0;
        bool scan = vm.count("scan") > 0;
        
        // Start application
        SonoraApp app(libraryPath, verbose);
        
        if (scan) {
            std::cout << "Scanning library at: " << libraryPath << std::endl;
            // In a real implementation, this would scan and index the music library
        }
        
        app.run();
    }
    catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}