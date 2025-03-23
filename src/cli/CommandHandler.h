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

// src/cli/CommandHandler.cpp
#pragma once

// This file should include the actual header file from the include directory
#include "sonora/cli/CommandHandler.h"

#include <iostream>
#include <sstream>

namespace sonora {
namespace cli {

CommandHandler::CommandHandler() {
    // Register built-in commands
    registerCommand("help", "Display available commands", 
        [this](const std::vector<std::string>&) {
            this->printHelp();
        }
    );
    
    registerCommand("exit", "Exit the application", 
        [](const std::vector<std::string>&) {
            exit(0);
        }
    );
    
    registerCommand("quit", "Exit the application", 
        [](const std::vector<std::string>&) {
            exit(0);
        }
    );
}

void CommandHandler::registerCommand(const std::string& command, const std::string& help, CommandCallback callback) {
    CommandInfo info;
    info.help = help;
    info.callback = callback;
    mCommands[command] = info;
}

bool CommandHandler::executeCommand(const std::string& commandLine) {
    auto args = parseCommandLine(commandLine);
    
    if (args.empty()) {
        return false;
    }
    
    auto it = mCommands.find(args[0]);
    if (it == mCommands.end()) {
        std::cout << "Unknown command: " << args[0] << std::endl;
        std::cout << "Type 'help' for a list of available commands." << std::endl;
        return false;
    }
    
    // Remove the command name from args
    args.erase(args.begin());
    
    // Execute the command
    it->second.callback(args);
    return true;
}

void CommandHandler::printHelp() const {
    std::cout << "Available commands:" << std::endl;
    for (const auto& cmd : mCommands) {
        std::cout << "  " << cmd.first << std::string(15 - cmd.first.length(), ' ') << cmd.second.help << std::endl;
    }
}

std::vector<std::string> CommandHandler::parseCommandLine(const std::string& commandLine) {
    std::vector<std::string> args;
    std::istringstream iss(commandLine);
    std::string arg;
    
    while (iss >> arg) {
        args.push_back(arg);
    }
    
    return args;
}

} // namespace cli
} // namespace sonora