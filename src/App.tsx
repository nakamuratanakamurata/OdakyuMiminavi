import { useState, useEffect } from 'react';
import './App.css';
import VoiceCourse from './VoiceCourse';
import useSound from 'use-sound';
import logo from './assets/logo.png';
import clickedSound from './SE/miminavi_opening.mp3';
import trainSound from './SE/Train.mp3';

function App() {
  const [showVoiceCourse, setShowVoiceCourse] = useState(false);
  //const [playClickedSound] = useSound(clickedSound);
  const [playTrainSound] = useSound(trainSound, { volume: 0.3 });

  const [playClickedSound] = useSound(clickedSound, {
    onend: () => {
    }
  });

  useEffect(() => {
    let interval: number | null = null;

    if (showVoiceCourse) {
      playTrainSound();
      interval = window.setInterval(() => {
        playTrainSound();
      }, 3 * 60 * 1000);
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [showVoiceCourse, playTrainSound]);

  const handleVoiceClick = () => {

    playClickedSound();
    setShowVoiceCourse(true);
  };

  return (
    <div className="App">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo" />
      </div>
      <div className="button-container">
        <button disabled>カフェモード</button>
        <button onClick={() => handleVoiceClick(0)}>新宿行きVoiceコース</button>
        <button onClick={() => handleVoiceClick(2)}>小田原行きVoiceコース</button>
        <button onClick={handleVoiceClick}>Voiceコース</button>
      </div>
      {showVoiceCourse && <VoiceCourse />}
    </div>
  );
}

export default App;
