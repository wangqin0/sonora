declare module 'expo-music-info-2' {
  export interface MusicInfoOptions {
    title?: boolean;
    artist?: boolean;
    album?: boolean;
    genre?: boolean;
    picture?: boolean;
  }
  
  export interface MusicInfoPicture {
    description: string;
    pictureData: string;
  }
  
  export interface MusicInfoResponse {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    picture?: MusicInfoPicture;
  }
  
  const MusicInfo: {
    getMusicInfoAsync: (fileUri: string, options: MusicInfoOptions) => Promise<MusicInfoResponse | null>
  };
  
  export default MusicInfo;
} 