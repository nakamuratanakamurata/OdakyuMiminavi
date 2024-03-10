import { useEffect } from 'react';

export const useAudioPlayer = (audioUrl1: string, audioUrl2: string) => {
  useEffect(() => {
    const audio1 = new Audio(audioUrl1);
    const audio2 = new Audio(audioUrl2);

    audio1.play().then(() => {
      setTimeout(() => {
        audio2.play().catch((error) => console.error("Audio2 Error:", error));
      }, 2000);
    }).catch((error) => console.error("Audio1 Error:", error));

    return () => {
      audio1.pause(); 
      audio2.pause();
    };
  }, [audioUrl1, audioUrl2]);
};