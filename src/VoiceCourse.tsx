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

const VoiceCourse: React.FC<{ isHeadToOdawara: 0 | 1 | 2 }> = ({ isHeadToOdawara: initialDirection }) => {
  const [isHeadToOdawara, setIsHeadToOdawara] = useState<0 | 1 | 2>(initialDirection);
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

        for (let i = 1; i <= 5; i++) {
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
      console.log(nextStation)
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
