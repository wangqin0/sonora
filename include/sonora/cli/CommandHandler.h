#pragma once

#include <string>
#include <vector>
#include <functional>
#include <map>
#include <memory>

namespace sonora {
namespace cli {

class CommandHandler {
public:
    using CommandCallback = std::function<void(const std::vector<std::string>&)>;
    
    CommandHandler();
    ~CommandHandler() = default;
    
    void registerCommand(const std::string& command, const std::string& help, CommandCallback callback);
    bool executeCommand(const std::string& commandLine);
    void printHelp() const;
    
private:
    struct CommandInfo {
        std::string help;
        CommandCallback callback;
    };
    
    std::map<std::string, CommandInfo> mCommands;
    
    std::vector<std::string> parseCommandLine(const std::string& commandLine);
};

} // namespace cli
} // namespace sonora