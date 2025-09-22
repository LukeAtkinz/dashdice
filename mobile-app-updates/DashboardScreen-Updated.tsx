import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import {
  useFonts,
  Audiowide_400Regular,
} from '@expo-google-fonts/audiowide';
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';
import { useUser } from '../../context/UserContext';
import { WaitingRoomScreen } from '../game/WaitingRoomScreen';

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { userData } = useUser();
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [currentGameMode, setCurrentGameMode] = useState('');
  const [sessionType, setSessionType] = useState<'casual' | 'ranked'>('casual');

  const [fontsLoaded] = useFonts({
    Audiowide_400Regular,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
  });

  // Updated handleGameModeAction to navigate to WaitingRoom
  const handleGameModeAction = (mode: string, type: 'casual' | 'ranked' = 'casual') => {
    setCurrentGameMode(mode);
    setSessionType(type);
    setShowWaitingRoom(true);
  };

  const handleCancelMatchmaking = () => {
    setShowWaitingRoom(false);
    setCurrentGameMode('');
  };

  const handleMatchFound = (matchData: any) => {
    // Navigate to actual game screen when match is found
    setShowWaitingRoom(false);
    // TODO: Navigate to GameScreen with matchData
    console.log('Match found:', matchData);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (showWaitingRoom) {
    return (
      <WaitingRoomScreen
        gameMode={currentGameMode}
        sessionType={sessionType}
        onCancel={handleCancelMatchmaking}
        onMatchFound={handleMatchFound}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={require('../../../assets/profile-avatar.png')}
            style={styles.avatar}
          />
          <View>
            <Text style={[styles.username, { fontFamily: 'Audiowide_400Regular' }]}>
              {userData?.displayName || 'Player'}
            </Text>
            <Text style={[styles.rankPoints, { fontFamily: 'Montserrat_400Regular' }]}>
              RP: {userData?.rankedStats?.rankPoints || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Game Modes */}
      <View style={styles.gameModesContainer}>
        <Text style={[styles.sectionTitle, { fontFamily: 'Audiowide_400Regular' }]}>
          GAME MODES
        </Text>

        {/* Quick Match */}
        <TouchableOpacity
          style={styles.gameModeCard}
          onPress={() => handleGameModeAction('Quick Match', 'casual')}
        >
          <Image
            source={require('../../../assets/Quick_Match.png')}
            style={styles.gameModeIcon}
            resizeMode="contain"
          />
          <View style={styles.gameModeInfo}>
            <Text style={[styles.gameModeTitle, { fontFamily: 'Audiowide_400Regular' }]}>
              QUICK MATCH
            </Text>
            <Text style={[styles.gameModeDescription, { fontFamily: 'Montserrat_400Regular' }]}>
              Fast casual games
            </Text>
          </View>
        </TouchableOpacity>

        {/* Ranked Match */}
        <TouchableOpacity
          style={styles.gameModeCard}
          onPress={() => handleGameModeAction('Ranked Match', 'ranked')}
        >
          <Image
            source={require('../../../assets/Ranked_Match.png')}
            style={styles.gameModeIcon}
            resizeMode="contain"
          />
          <View style={styles.gameModeInfo}>
            <Text style={[styles.gameModeTitle, { fontFamily: 'Audiowide_400Regular' }]}>
              RANKED MATCH
            </Text>
            <Text style={[styles.gameModeDescription, { fontFamily: 'Montserrat_400Regular' }]}>
              Competitive gameplay
            </Text>
          </View>
        </TouchableOpacity>

        {/* Tournament */}
        <TouchableOpacity
          style={styles.gameModeCard}
          onPress={() => handleGameModeAction('Tournament', 'ranked')}
        >
          <Image
            source={require('../../../assets/Tournament.png')}
            style={styles.gameModeIcon}
            resizeMode="contain"
          />
          <View style={styles.gameModeInfo}>
            <Text style={[styles.gameModeTitle, { fontFamily: 'Audiowide_400Regular' }]}>
              TOURNAMENT
            </Text>
            <Text style={[styles.gameModeDescription, { fontFamily: 'Montserrat_400Regular' }]}>
              Multi-player competition
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={[styles.sectionTitle, { fontFamily: 'Audiowide_400Regular' }]}>
          QUICK STATS
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
              {userData?.statistics?.gamesPlayed || 0}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'Montserrat_400Regular' }]}>
              Games
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
              {userData?.statistics?.wins || 0}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'Montserrat_400Regular' }]}>
              Wins
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
              {userData?.rankedStats?.rankPoints || 0}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'Montserrat_400Regular' }]}>
              Rank Points
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 80, // Increased padding as requested
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  username: {
    fontSize: 18,
    color: '#FFD700',
    marginBottom: 4,
  },
  rankPoints: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  gameModesContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
  },
  gameModeCard: {
    backgroundColor: 'rgba(37, 37, 37, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  gameModeIcon: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  gameModeInfo: {
    flex: 1,
  },
  gameModeTitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  gameModeDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statsContainer: {
    backgroundColor: 'rgba(37, 37, 37, 0.9)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
