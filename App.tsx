import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function App() {
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [permission, setPermission] = useState<boolean>(false);
  const [sound, setSound] = useState<any>(null);
  const [currentPlaying, setCurrentPlaying] = useState<any>(null);
  const [playbackPosition, setPlaybackPosition] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const getPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setPermission(status === 'granted');
  };

  const loadAudioFiles = async () => {
    if (!permission) return;

    try {
      let mediaFiles: any = [];
      let hasNextPage = true;
      let after = null;

      while (hasNextPage) {
        const result = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: 100,
          after: after,
        });

        mediaFiles = mediaFiles.concat(result.assets);
        hasNextPage = result.hasNextPage;
        after = result.endCursor;
      }

      const mp3Files = mediaFiles.filter((file: any) => file.uri.endsWith('.mp3'));

      const sortedFiles = mp3Files.sort((a: any, b: any) => {
        if (a.filename.toLowerCase() < b.filename.toLowerCase()) return -1;
        if (a.filename.toLowerCase() > b.filename.toLowerCase()) return 1;
        return 0;
      });

      setAudioFiles(sortedFiles);
    } catch (error) {
      console.error('Error loading audio files:', error);
    }
  };

  const reloadAudioFiles = async () => {
    if (permission) {
      loadAudioFiles(); // Ricarica i file
    } else {
      console.log("Permessi non concessi per la libreria multimediale.");
    }
  };

  useEffect(() => {
    getPermission();
  }, []);

  useEffect(() => {
    if (permission) {
      loadAudioFiles();
    }
  }, [permission]);

  const playAudio = async (file: any) => {
    if (sound) {
      await sound.unloadAsync();
    }

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: file.uri },
      { shouldPlay: true }
    );

    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        if (status.didJustFinish && !status.isLooping) {
          playNext(); // Riproduce la canzone successiva automaticamente
        }
      } else {
        console.error("Errore durante la riproduzione:", status);
      }
    });

    setSound(newSound);
    setCurrentPlaying(file);
    setPlaybackPosition(0);
    setIsPlaying(true);
  };

  const handlePlayPause = async () => {
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isPlaying) {
        setPlaybackPosition(status.positionMillis);
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playFromPositionAsync(playbackPosition);
        setIsPlaying(true);
      }
    }
  };

  const handlePreviousSong = () => {
    const currentIndex = audioFiles.findIndex((file) => file.id === currentPlaying.id);
    const previousIndex = currentIndex === 0 ? audioFiles.length - 1 : currentIndex - 1;
    playAudio(audioFiles[previousIndex]);
  };

  const playNext = () => {
    const currentIndex = audioFiles.findIndex((file) => file.id === currentPlaying.id);
    const nextIndex = currentIndex === audioFiles.length - 1 ? 0 : currentIndex + 1;
    playAudio(audioFiles[nextIndex]);
  };

  const resetAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.playFromPositionAsync(0);
      setIsPlaying(true);
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.listItem} onPress={() => playAudio(item)}>
      <Text style={styles.listItemText}>{item.filename}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.randomButton} onPress={() => playNext()}>
          <Text style={styles.randomButtonText}>Riproduzione Casuale</Text>
        </TouchableOpacity>

        {/* Bottone Refresh accanto a Riproduzione Casuale */}
        <TouchableOpacity style={styles.refreshButton} onPress={reloadAudioFiles}>
          <Ionicons name="refresh" size={24} color="#fff" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {currentPlaying && (
        <View style={styles.playerContainer}>
          {/* Titolo canzone centrato */}
          <Text style={styles.currentPlayingText}>{currentPlaying.filename}</Text>
          <View style={styles.controlsContainer}>
            <TouchableOpacity onPress={handlePreviousSong}>
              <Ionicons name="play-back" size={30} color="#0077B6" />
            </TouchableOpacity>
            <View style={styles.middleControlsContainer}>
              <TouchableOpacity onPress={handlePlayPause}>
                <Ionicons
                  name={isPlaying ? 'pause-circle' : 'play-circle'}
                  size={50}
                  color="#0077B6"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={resetAudio}>
              <Ionicons name="reload" size={30} color="#0077B6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={playNext}>
              <Ionicons name="play-forward" size={30} color="#0077B6" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={audioFiles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2A47',  // Colore di sfondo più scuro
    paddingTop: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginHorizontal: 20,
  },
  randomButton: {
    padding: 15,
    backgroundColor: '#0077B6',  // Blu scuro celeste
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  randomButtonText: {
    color: '#fff',
    fontSize: 12,  // Ridotto del 25%
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 15,
    backgroundColor: '#0077B6',  // Blu scuro celeste
    borderRadius: 5,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,  // Ridotto del 25%
    fontWeight: 'bold',
    marginLeft: 5,
  },
  playerContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginHorizontal: 20,
  },
  currentPlayingText: {
    fontSize: 12,  // Ridotto del 25%
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',  // Allinea il testo al centro
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  middleControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  listItemText: {
    fontSize: 12,  // Ridotto del 25%
    color: '#fff',
  },
});
