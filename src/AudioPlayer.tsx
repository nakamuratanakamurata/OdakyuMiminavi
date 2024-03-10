import React from 'react';
import { useAudioPlayer } from './useAudioPlayer';

interface AudioPlayerProps {
  basePath: string;
  id: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ basePath, id }) => {
const audioUrl1 = `${basePath}/${id}/${id}.mp3`;
const audioUrl2 = `${basePath}/${id}/${id}_e.mp3`

  useAudioPlayer(audioUrl1, audioUrl2);

  return <div>Audio Player for ID: {id}</div>;
};