import { useState, useEffect } from 'react';
import useSound from 'use-sound';
import { useGNSS } from './useGNSS';
import stations from './json/Station.json';
import spotlist from './json/spotlist.json';

type Station = {
  id: string;
  name: string;
  coordinates: [number, number];
  'Is Onvoice': string;
  Voice_vol_ID: string;
  Voice_url: string;
};

type Spotlist = {
  vol: number;
  id: number;
  title: string;
  main_img: {
    url: string;
    width: number;
    height: number;
    Caption: string;
  };
  explanation: string;
  description: {
    access: string;
    address: string;
    time: string;
    off: string;
    call: string;
    url: string;
    instagram: string;
    note: string;
    googlemap: string;
  };
  sub_img: string[];
};

const VoiceCourse: React.FC = () => {
  const [isHeadToOdawara, setIsHeadToOdawara] = useState<0 | 1 | 2>(1);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [initLat, setInitLat] = useState<number | null>(null);
  const [initLng, setInitLng] = useState<number | null>(null);
  const [previousStation, setPreviousStation] = useState<Station | null>(null);
  const [nextStation, setNextStation] = useState<Station | null>(null);
  const [shopList, setShopList] = useState<Spotlist[]>([]);
  const [fileExistShopID, setFileExistShopID] = useState<number[]>([]);
  const [playGameStart] = useSound('/SE/gamestart.mp3');
  const [currentSpot, setCurrentSpot] = useState<Spotlist | null>(null);
  const position = useGNSS();

  useEffect(() => {
    console.log('useEffect triggered');
    const timer = setInterval(() => {
      if (position?.latitude && position?.longitude) {
        console.log('Current position:', position.latitude, position.longitude);
        const station = stations.find(
          (s) =>
            Math.abs(s.coordinates[1] - position.latitude!) < 0.003 &&
            Math.abs(s.coordinates[0] - position.longitude!) < 0.003
        );

        if (station && !isGameStarted) {
          console.log('Game started');
          playGameStart();
          setIsGameStarted(true);
          setInitLat(position.latitude);
          setInitLng(position.longitude);
          setPreviousStation(station as Station);

          if (station.id === '1') {
            console.log('Heading to Shinjuku');
            setIsHeadToOdawara(0);
          } else if (station.id === '47') {
            console.log('Heading to Odawara');
            setIsHeadToOdawara(2);
          }
        }

        if (initLat && initLng && isHeadToOdawara === 1) {
          if (position.latitude - initLat < -0.003 && position.longitude - initLng < -0.003) {
            console.log('Direction changed to Odawara');
            setIsHeadToOdawara(2);
          } else if (position.latitude - initLat > 0.003 && position.longitude - initLng > 0.003) {
            console.log('Direction changed to Shinjuku');
            setIsHeadToOdawara(0);
          }
        }
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [position, isGameStarted, initLat, initLng, isHeadToOdawara, playGameStart]);

  useEffect(() => {
    console.log('useEffect triggered for previousStation and isHeadToOdawara');
    if (previousStation && isHeadToOdawara !== 1) {
      const nextStationId =
        isHeadToOdawara === 0 ? String(Number(previousStation.id) - 1) : String(Number(previousStation.id) + 1);
      const nextStation = stations.find((s) => s.id === nextStationId);

      if (nextStation) {
        console.log('Next station:', nextStation.name);
        setNextStation(nextStation as Station);

        const shopList = spotlist.filter((spot) => spot.vol === Number(nextStation.Voice_vol_ID));
        const typedShopList = shopList as Spotlist[];
        setShopList(typedShopList);

        const baseURL = 'https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/';
        const fileExistShopID: number[] = [];

        for (let i = 1; i <= 9; i++) {
          const url = `${baseURL}${nextStation.Voice_vol_ID}/${nextStation.Voice_vol_ID}_${i}.mp3`;
          fetch(url)
            .then((response) => {
              if (response.ok) {
                console.log(`File exists: ${nextStation.Voice_vol_ID}_${i}.mp3`);
                fileExistShopID.push(i);
              }
            })
            .catch((error) => {
              console.error('Error checking file existence:', error);
            });
        }

        setFileExistShopID(fileExistShopID);
      }
    }
  }, [previousStation, isHeadToOdawara]);

  const playVoice = (volume: string, shopId?: number) => {
    console.log('playVoice function called');
    const baseURL = 'https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/';
    let audioUrl = `${baseURL}${volume}/${volume}.mp3`;

    if (shopId) {
      audioUrl = `${baseURL}${volume}/${volume}_${shopId}.mp3`;
      const spot = shopList.find((s) => s.id === shopId);
      setCurrentSpot(spot || null);
      console.log('Current spot:', spot?.title);
    } else {
      setCurrentSpot(null);
    }

    const [playAudio, { stop: _stop }] = useSound(audioUrl, {
      onend: () => {
        console.log('Audio ended');
        setTimeout(() => {
          setCurrentSpot(null);
          if (fileExistShopID.length > 0) {
            const randomIndex = Math.floor(Math.random() * fileExistShopID.length);
            const selectedShopId = fileExistShopID[randomIndex];
            setFileExistShopID(fileExistShopID.filter((id) => id !== selectedShopId));
            setTimeout(() => {
              if (
                nextStation &&
                position?.latitude &&
                position?.longitude &&
                Math.abs(nextStation.coordinates[1] - position.latitude) >= 0.003 &&
                Math.abs(nextStation.coordinates[0] - position.longitude) >= 0.003
              ) {
                console.log('Playing voice for next spot');
                playVoice(nextStation.Voice_vol_ID, selectedShopId);
              }
            }, 5000);
          }
        }, 3000);
      },
    });

    console.log('Playing audio:', audioUrl);
    playAudio();
  };

  useEffect(() => {
    console.log('useEffect triggered for nextStation');
    if (nextStation) {
      console.log('Playing voice for next station');
      playVoice(nextStation.Voice_vol_ID);
    }
  }, [nextStation]);

  return (
    <div>
      <h2>Debug Information:</h2>
      <p>Is game started: {isGameStarted.toString()}</p>
      <p>Is heading to Odawara: {isHeadToOdawara.toString()}</p>
      <p>Previous station: {previousStation?.name}</p>
      <p>Next station: {nextStation?.name}</p>
      <p>Current spot: {currentSpot?.title}</p>
      <p>Current latitude: {position?.latitude}</p>
      <p>Current longitude: {position?.longitude}</p>
      <h2>Spot Information:</h2>
      {currentSpot && (
        <div>
          <h1>{currentSpot.title}</h1>
          {currentSpot.main_img && currentSpot.main_img.url && (
            <img
              src={`${stations.find((s) => s.Voice_vol_ID === String(currentSpot.vol))?.Voice_url}${
                currentSpot.main_img.url
              }`}
              alt={currentSpot.title}
              style={{ width: '50%', height: 'auto' }}
            />
          )}
          <div>
            {currentSpot.description.access && <p>アクセス: {currentSpot.description.access}</p>}
            {currentSpot.description.address && <p>住所: {currentSpot.description.address}</p>}
            {currentSpot.description.time && <p>営業時間: {currentSpot.description.time}</p>}
            {currentSpot.description.off && <p>休業日: {currentSpot.description.off}</p>}
            {currentSpot.description.call && <p>電話番号: {currentSpot.description.call}</p>}
            {currentSpot.description.url && (
              <p>
                URL: <a href={currentSpot.description.url}>{currentSpot.description.url}</a>
              </p>
            )}
            {currentSpot.description.instagram && (
              <p>
                Instagram: <a href={currentSpot.description.instagram}>{currentSpot.description.instagram}</a>
              </p>
            )}
            {currentSpot.description.note && <p>備考: {currentSpot.description.note}</p>}
            {currentSpot.description.googlemap && (
              <p>
                Google Map: <a href={currentSpot.description.googlemap}>{currentSpot.description.googlemap}</a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceCourse;
/*
import { useState, useEffect } from 'react';
import useSound from 'use-sound';
import { useGNSS } from './useGNSS';
import stations from './json/Station.json';
import spotlist from './json/spotlist.json';

type Station = {
  id: string;
  name: string;
  coordinates: [number, number];
  'Is Onvoice': string;
  Voice_vol_ID: string;
  Voice_url: string;
};

type Spotlist = {
  vol: number;
  id: number;
  title: string;
  main_img: {
    url: string;
    width: number;
    height: number;
    Caption: string;
  };
  explanation: string;
  description: {
    access: string;
    address: string;
    time: string;
    off: string;
    call: string;
    url: string;
    instagram: string;
    note: string;
    googlemap: string;
  };
  sub_img: string[];
};

const VoiceCourse: React.FC = () => {
  const [isHeadToOdawara, setIsHeadToOdawara] = useState<0 | 1 | 2>(1);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [initLat, setInitLat] = useState<number | null>(null);
  const [initLng, setInitLng] = useState<number | null>(null);
  const [previousStation, setPreviousStation] = useState<Station | null>(null);
  const [nextStation, setNextStation] = useState<Station | null>(null);
  const [shopList, setShopList] = useState<Spotlist[]>([]);
  const [fileExistShopID, setFileExistShopID] = useState<number[]>([]);
  const [playGameStart] = useSound('/SE/gamestart.mp3');
  const [currentSpot, setCurrentSpot] = useState<Spotlist | null>(null);
  const position = useGNSS();

  useEffect(() => {
    const timer = setInterval(() => {
      if (position?.latitude && position?.longitude) {
        const station = stations.find(
          (s) =>
            Math.abs(s.coordinates[1] - position.latitude!) < 0.003 &&
            Math.abs(s.coordinates[0] - position.longitude!) < 0.003
        );

        if (station && !isGameStarted) {
          playGameStart();
          setIsGameStarted(true);
          setInitLat(position.latitude);
          setInitLng(position.longitude);
          setPreviousStation(station as Station);

          if (station.id === '1') {
            setIsHeadToOdawara(0);
          } else if (station.id === '47') {
            setIsHeadToOdawara(2);
          }
        }

        if (initLat && initLng && isHeadToOdawara === 1) {
          if (position.latitude - initLat < -0.003 && position.longitude - initLng < -0.003) {
            setIsHeadToOdawara(2);
            playMiminavi(2, previousStation);
          } else if (position.latitude - initLat > 0.003 && position.longitude - initLng > 0.003) {
            setIsHeadToOdawara(0);
            playMiminavi(0, previousStation);
          }
        }
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [position, isGameStarted, initLat, initLng, isHeadToOdawara, playGameStart, previousStation]);

  const playMiminavi = (direction: 0 | 2, prevStation: Station | null) => {
    if (!prevStation) return;

    const nextStationId = direction === 0 ? String(Number(prevStation.id) - 1) : String(Number(prevStation.id) + 1);
    const nextStation = stations.find((s) => s.id === nextStationId);

    if (nextStation) {
      setNextStation(nextStation);

      //const shopList = spotlist.filter((spot) => spot.vol === Number(nextStation.Voice_vol_ID));
      //setShopList(shopList);
      const shopList = spotlist.filter((spot) => spot.vol === Number(nextStation.Voice_vol_ID));
      const typedShopList = shopList as Spotlist[];
      setShopList(typedShopList);


      const baseURL = 'https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/';
      const fileExistShopID: number[] = [];

      for (let i = 1; i <= 9; i++) {
        const url = `${baseURL}${nextStation.Voice_vol_ID}/${nextStation.Voice_vol_ID}_${i}.mp3`;
        fetch(url)
          .then((response) => {
            if (response.ok) {
              fileExistShopID.push(i);
            }
          })
          .catch((error) => {
            console.error('Error checking file existence:', error);
          });
      }

      setFileExistShopID(fileExistShopID);
    }
  };

  const playVoice = (volume: string, shopId?: number) => {
    const baseURL = 'https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/';
    let audioUrl = `${baseURL}${volume}/${volume}.mp3`;

    if (shopId) {
      audioUrl = `${baseURL}${volume}/${volume}_${shopId}.mp3`;
      const spot = shopList.find((s) => s.id === shopId);
      setCurrentSpot(spot || null);
    } else {
      setCurrentSpot(null);
    }

    const [playAudio, { stop: _stop }] = useSound(audioUrl, {
      onend: () => {
        setTimeout(() => {
          setCurrentSpot(null);
          if (fileExistShopID.length > 0) {
            const randomIndex = Math.floor(Math.random() * fileExistShopID.length);
            const selectedShopId = fileExistShopID[randomIndex];
            setFileExistShopID(fileExistShopID.filter((id) => id !== selectedShopId));
            setTimeout(() => {
              if (
                nextStation &&
                position?.latitude &&
                position?.longitude &&
                Math.abs(nextStation.coordinates[1] - position.latitude) >= 0.003 &&
                Math.abs(nextStation.coordinates[0] - position.longitude) >= 0.003
              ) {
                playVoice(nextStation.Voice_vol_ID, selectedShopId);
              }
            }, 5000);
          }
        }, 3000);
      },
    });

    playAudio();
  };

  useEffect(() => {
    if (nextStation) {
      playVoice(nextStation.Voice_vol_ID);
    }
  }, [nextStation]);

  return (
    <div>
      {... }
      {currentSpot && (
        <div>
          <h1>{currentSpot.title}</h1>
          {currentSpot.main_img && currentSpot.main_img.url && (
            <img
              src={`${stations.find((s) => s.Voice_vol_ID === String(currentSpot.vol))?.Voice_url}${
                currentSpot.main_img.url
              }`}
              alt={currentSpot.title}
              style={{ width: '50%', height: 'auto' }}
            />
          )}
          <div>
            {currentSpot.description.access && <p>アクセス: {currentSpot.description.access}</p>}
            {currentSpot.description.address && <p>住所: {currentSpot.description.address}</p>}
            {currentSpot.description.time && <p>営業時間: {currentSpot.description.time}</p>}
            {currentSpot.description.off && <p>休業日: {currentSpot.description.off}</p>}
            {currentSpot.description.call && <p>電話番号: {currentSpot.description.call}</p>}
            {currentSpot.description.url && (
              <p>
                URL: <a href={currentSpot.description.url}>{currentSpot.description.url}</a>
              </p>
            )}
            {currentSpot.description.instagram && (
              <p>
                Instagram: <a href={currentSpot.description.instagram}>{currentSpot.description.instagram}</a>
              </p>
            )}
            {currentSpot.description.note && <p>備考: {currentSpot.description.note}</p>}
            {currentSpot.description.googlemap && (
              <p>
                Google Map: <a href={currentSpot.description.googlemap}>{currentSpot.description.googlemap}</a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceCourse;

*/



/*import { useState, useEffect } from 'react';
import useSound from 'use-sound';
import { useGNSS } from './useGNSS';
import stations from './json/Station.json';
import spotlist from './json/spotlist.json';

const VoiceCourse: React.FC = () => {
  const [isHeadToOdawara, setIsHeadToOdawara] = useState<0 | 1 | 2>(1);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [initLat, setInitLat] = useState<number | null>(null);
  const [initLng, setInitLng] = useState<number | null>(null);
  const [previousStation, setPreviousStation] = useState<Station | null>(null);
  const [nextStation, setNextStation] = useState<Station | null>(null);
  const [shopList, setShopList] = useState<Spotlist[]>([]);
  const [fileExistShopID, setFileExistShopID] = useState<number[]>([]);
  const [playGameStart] = useSound('/SE/gamestart.mp3');
  const position = useGNSS();

  useEffect(() => {
    const timer = setInterval(() => {
      if (position.latitude && position.longitude) {
        const station = stations.find(
          (s) =>
            Math.abs(s.coordinates[1] - position.latitude) < 0.003 &&
            Math.abs(s.coordinates[0] - position.longitude) < 0.003
        );

        if (station && !isGameStarted) {
          playGameStart();
          setIsGameStarted(true);
          setInitLat(position.latitude);
          setInitLng(position.longitude);
          setPreviousStation(station);

          if (station.id === '1') {
            setIsHeadToOdawara(0);
          } else if (station.id === '47') {
            setIsHeadToOdawara(2);
          }
        }

        if (initLat && initLng && isHeadToOdawara === 1) {
          if (position.latitude - initLat < -0.003 && position.longitude - initLng < -0.003) {
            setIsHeadToOdawara(2);
            playMiminavi(2, previousStation);
          } else if (position.latitude - initLat > 0.003 && position.longitude - initLng > 0.003) {
            setIsHeadToOdawara(0);
            playMiminavi(0, previousStation);
          }
        }
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [position, isGameStarted, initLat, initLng, isHeadToOdawara, playGameStart, previousStation]);

  const playMiminavi = (direction: 0 | 2, prevStation: Station | null) => {
    if (!prevStation) return;

    const nextStationId = direction === 0 ? String(Number(prevStation.id) - 1) : String(Number(prevStation.id) + 1);
    const nextStation = stations.find((s) => s.id === nextStationId);

    if (nextStation) {
      setNextStation(nextStation);

      const shopList = spotlist.filter((spot) => spot.vol === nextStation.Voice_vol_ID);
      setShopList(shopList);

      const baseURL = 'https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/';
      const fileExistShopID: number[] = [];

      for (let i = 1; i <= 9; i++) {
        const url = `${baseURL}${nextStation.Voice_vol_ID}/${nextStation.Voice_vol_ID}_${i}.mp3`;
        fetch(url)
          .then((response) => {
            if (response.ok) {
              fileExistShopID.push(i);
            }
          })
          .catch((error) => {
            console.error('Error checking file existence:', error);
          });
      }

      setFileExistShopID(fileExistShopID);
    }
  };

  const [currentSpot, setCurrentSpot] = useState<Spotlist | null>(null);
  const [playSpotAudio, setPlaySpotAudio] = useState(false);

  const playVoice = (volume: string, shopId?: number) => {
    const baseURL = 'https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/';
    let audioUrl = `${baseURL}${volume}/${volume}.mp3`;

    if (shopId) {
      audioUrl = `${baseURL}${volume}/${volume}_${shopId}.mp3`;
      const spot = shopList.find((s) => s.id === String(shopId));
      setCurrentSpot(spot || null);
    } else {
      setCurrentSpot(null);
    }

    const [playAudio, { stop }] = useSound(audioUrl, {
      onend: () => {
        setPlaySpotAudio(false);
        setTimeout(() => {
          setCurrentSpot(null);
          if (fileExistShopID.length > 0) {
            const randomIndex = Math.floor(Math.random() * fileExistShopID.length);
            const selectedShopId = fileExistShopID[randomIndex];
            setFileExistShopID(fileExistShopID.filter((id) => id !== selectedShopId));
            setTimeout(() => {
              if (
                nextStation &&
                Math.abs(nextStation.coordinates[1] - position.latitude) >= 0.003 &&
                Math.abs(nextStation.coordinates[0] - position.longitude) >= 0.003
              ) {
                playVoice(nextStation.Voice_vol_ID, selectedShopId);
              }
            }, 5000);
          }
        }, 3000);
      },
    });

    setPlaySpotAudio(true);
    playAudio();
  };

  useEffect(() => {
    if (nextStation) {
      playVoice(nextStation.Voice_vol_ID);
    }
  }, [nextStation]);

  return (
    <div>
      {}
      {currentSpot && (
        <div>
          <h1>{currentSpot.title}</h1>
          {currentSpot.main_img && currentSpot.main_img.url && (
            <img
              src={`${stations.find((s) => s.Voice_vol_ID === currentSpot.vol)?.Voice_url}${currentSpot.main_img.url}`}
              alt={currentSpot.title}
              style={{ width: '50%', height: 'auto' }}
            />
          )}
          <div>
            {currentSpot.description.access && <p>アクセス: {currentSpot.description.access}</p>}
            {currentSpot.description.address && <p>住所: {currentSpot.description.address}</p>}
            {currentSpot.description.time && <p>営業時間: {currentSpot.description.time}</p>}
            {currentSpot.description.off && <p>休業日: {currentSpot.description.off}</p>}
            {currentSpot.description.call && <p>電話番号: {currentSpot.description.call}</p>}
            {currentSpot.description.url && (
              <p>
                URL: <a href={currentSpot.description.url}>{currentSpot.description.url}</a>
              </p>
            )}
            {currentSpot.description.instagram && (
              <p>
                Instagram: <a href={currentSpot.description.instagram}>{currentSpot.description.instagram}</a>
              </p>
            )}
            {currentSpot.description.note && <p>備考: {currentSpot.description.note}</p>}
            {currentSpot.description.googlemap && (
              <p>
                Google Map: <a href={currentSpot.description.googlemap}>{currentSpot.description.googlemap}</a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceCourse; 

*/


/*
import { useState, useEffect } from 'react';
import useSound from 'use-sound';

const StationIdList = [2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23, 24, 25, 26, 28, 30, 31, 32, 34, 35, 37, 39, 41, 42, 44, 45, 47, 51, 52, 54, 55, 56, 57];

function VoiceCourse() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [returnedList, setReturnedList] = useState<number[]>([]);
  const [playAudio, setPlayAudio] = useState(false);
  const [initialDelay, setInitialDelay] = useState(true);

  const mainAudioPath = `${StationIdList[currentIndex]}/${StationIdList[currentIndex]}.mp3`;
  const [playMainAudio, { stop: stopMainAudio }] = useSound(`https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/${mainAudioPath}`);

  useEffect(() => {
    if (playAudio && currentIndex < StationIdList.length) {
      if (initialDelay) {
        setTimeout(() => {
          console.log('Playing main audio:', mainAudioPath);
          playMainAudio();
          setTimeout(() => {
            fetchReturnedList();
          }, 5000);
          setInitialDelay(false);
        }, 20000);
      } else {
        console.log('Playing main audio:', mainAudioPath);
        playMainAudio();
        setTimeout(() => {
          fetchReturnedList();
        }, 5000);
      }
    }
    */





    /*

    useEffect(() => {
      if (playAudio && currentIndex < StationIdList.length) {
        console.log('Playing main audio:', mainAudioPath);
        playMainAudio();
        setTimeout(() => {
          fetchReturnedList();
        }, 5000);
      }
    }, [playAudio, currentIndex, playMainAudio, mainAudioPath]);
    */



/*

  }, [playAudio, currentIndex, playMainAudio, mainAudioPath, initialDelay]);

  useEffect(() => {
    if (returnedList.length > 0) {
      const randomIndex = Math.floor(Math.random() * returnedList.length);
      const selectedAudio = returnedList[randomIndex];
      const subAudioPath = `${StationIdList[currentIndex]}/${StationIdList[currentIndex]}_${selectedAudio}.mp3`;
      const [playSubAudio, { stop: stopSubAudio }] = useSound(`https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/${subAudioPath}`, {
        onload: (error) => {
          if (error) {
            console.error('Error loading sub audio:', subAudioPath, error);
            setReturnedList(returnedList.filter((item) => item !== selectedAudio));
          } else {
            console.log('Playing sub audio:', subAudioPath);
            playSubAudio();
          }
        },
        onend: () => {
          stopSubAudio();
          setReturnedList(returnedList.filter((item) => item !== selectedAudio));
        },
      });
    } else {
      stopMainAudio();
      setTimeout(() => {
        if (currentIndex < StationIdList.length - 1) {
          setCurrentIndex((prevIndex) => prevIndex + 1);
          setPlayAudio(true);
        } else {
          setPlayAudio(false);
        }
      }, 7000);
    }
  }, [returnedList, currentIndex, stopMainAudio]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (returnedList.length > 0) {
        const randomIndex = Math.floor(Math.random() * returnedList.length);
        const selectedAudio = returnedList[randomIndex];
        const subAudioPath = `${StationIdList[currentIndex]}/${StationIdList[currentIndex]}_${selectedAudio}.mp3`;
        const [playSubAudio, { stop: stopSubAudio }] = useSound(`https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/${subAudioPath}`, {
          onload: (error) => {
            if (error) {
              console.error('Error loading sub audio:', subAudioPath, error);
              setReturnedList(returnedList.filter((item) => item !== selectedAudio));
            } else {
              console.log('Playing sub audio:', subAudioPath);
              playSubAudio();
            }
          },
          onend: () => {
            stopSubAudio();
            setReturnedList(returnedList.filter((item) => item !== selectedAudio));
          },
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [returnedList, currentIndex]);

  const fetchReturnedList = async () => {
    const tempList = [];
    for (let j = 1; j <= 10; j++) {
      const subAudioPath = `${StationIdList[currentIndex]}/${StationIdList[currentIndex]}_${j}.mp3`;
      try {
        const response = await fetch(`https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/${subAudioPath}`);
        if (response.ok) {
          tempList.push(j);
        }
      } catch (error) {
        console.error('Error fetching sub audio:', subAudioPath, error);
      }
    }
    setReturnedList(tempList);
  };

  return (
    <div>
      <button onClick={() => setPlayAudio(true)}>Start Audio</button>
    </div>
  );
}

export default VoiceCourse;
*/
/*
import React from 'react';
import { useState, useEffect } from 'react';
import { useGNSS } from './useGNSS';
import useSound from 'use-sound';
import { AudioPlayer } from './AudioPlayer';
import stations from './json/Station.json';

const VoiceCourse: React.FC = () => {
  const position = useGNSS();
  const baseUrl = "https://ebcnutyfbxzbndfdaoqd.supabase.co/storage/v1/object/public/Miminavi_Voice/";
  //var PreviousStation = "0";
  const [playSound] = useSound('');
  const [index, setIndex] = useState(1);

  const Voice_list: string[] = [];

  for (let i = 1; i <= 100; i++) { // 例として100までのファイルが存在すると仮定
    Voice_list.push(baseUrl + i + '.mp3');
  }

  useEffect(() => {
    if (position.latitude !== null && position.longitude !== null) {
      // 現在のインデックスの音声ファイルを再生
      playSound({ src: Voice_list[index] });
      setIndex(index + 1);
    }
  }, [position.latitude, position.longitude, playSound, index]);

  // 近くの駅情報を取得するロジック（必要に応じて追加）
  function findNearestStation(latitude: number, longitude: number) {
    for (const station of stations) {
      const [stationLat, stationLon] = station.coordinates;
      if (Math.abs(stationLat - latitude) <= 0.01 && Math.abs(stationLon - longitude) <= 0.01) {
        console.log(station);
        return station;
      }
    }
    return null;
  }

  let nearestStationMessage = null;
  if (position.latitude !== null && position.longitude !== null) {
    const nearestStation = findNearestStation(position.latitude, position.longitude);
    if (nearestStation) {
      //PreviousStation = nearestStation.Voice_vol_ID;
      nearestStationMessage = (
        <div>
          <p>今いる駅は : {nearestStation.name}</p>
          <p>IDは : {nearestStation.id}</p>
          <p>Voice_vol_IDは : {nearestStation.Voice_vol_ID}</p>
        </div>
      );
    }
  }

  return (
    <div>
      <h1>位置情報</h1>
      <p>緯度: {position.latitude}</p>
      <p>経度: {position.longitude}</p>
      <p>位置精度: {position.accuracy}</p>
      <p>取得時刻: {position.timestamp ? new Date(position.timestamp).toLocaleString() : null}</p>
      {nearestStationMessage}
      <AudioPlayer basePath={baseUrl} id={48} />
    </div>
  );
};

export default VoiceCourse;
*/
