# Sonora Music Player

Sonora is a cross-platform music player app built with React Native and Expo that allows you to play music from both local storage and OneDrive.

## Features

- Play music from local device storage
- Connect to Microsoft OneDrive to stream music from the cloud
- Create and manage playlists
- Full-featured music player with play/pause, skip, and seek controls
- Background audio playback
- Search functionality
- Modern, responsive UI

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- For OneDrive integration: Microsoft App Registration with appropriate permissions

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure OneDrive integration:
   - Create a Microsoft App Registration at https://portal.azure.com
   - Set the redirect URI to `sonora://auth/onedrive`
   - Update the client ID in `src/config/onedrive.ts`

### Running the App

```
npm start
```

This will start the Expo development server. You can run the app on:
- iOS simulator
- Android emulator
- Physical device using the Expo Go app

## Project Structure

- `/src/components` - Reusable UI components
- `/src/navigation` - Navigation configuration
- `/src/screens` - App screens
- `/src/services` - Business logic and external services
- `/src/store` - State management with Zustand
- `/src/types` - TypeScript type definitions
- `/src/utils` - Utility functions

## Storage Providers

Sonora supports multiple storage providers:

1. **Local Storage** - Access music files stored on your device
2. **OneDrive** - Stream music from your Microsoft OneDrive account

## License

MIT