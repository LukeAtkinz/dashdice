import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'r  return (
    <GlobalBackgroundWrapper>
      <View style={styles.content}>
        {/* Game Mode Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.gameMode, { fontFamily: 'Audiowide_400Regular' }]}>
            {displayGameMode}
          </Text>
          <Text style={[styles.sessionType, { fontFamily: 'Audiowide_400Regular' }]}>
            {sessionType.toUpperCase()}
          </Text>
        </View>import {
  useFonts,
  Audiowide_400Regular,
} from '@expo-google-fonts/audiowide';
import { useUser } from '../../context/UserContext';
import { GlobalBackgroundWrapper } from '../../context/BackgroundContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WaitingRoomScreenProps {
  gameMode: string;
  sessionType: 'casual' | 'ranked';
  onCancel: () => void;
  onMatchFound: (matchData: any) => void;
}

export const WaitingRoomScreen: React.FC<WaitingRoomScreenProps> = ({
  gameMode,
  sessionType,
  onCancel,
  onMatchFound,
}) => {
  const { userData } = useUser();
  const [searchText, setSearchText] = useState('Searching for opponents...');
  const [playerCount, setPlayerCount] = useState(1);
  const [opponentFound, setOpponentFound] = useState(false);
  const [vsCountdown, setVsCountdown] = useState<number | null>(null);
  const [matchStarting, setMatchStarting] = useState(false);

  const [fontsLoaded] = useFonts({
    Audiowide_400Regular,
  });

  // Simulate matchmaking process exactly like web version
  useEffect(() => {
    let searchTimer: NodeJS.Timeout;
    let matchTimer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    const searchPhrases = [
      'Searching for opponents...',
      'Finding skilled players...',
      'Matching skill levels...',
      'Almost there...',
    ];
    let phraseIndex = 0;

    // Update search text every 2 seconds
    const updateSearchText = () => {
      searchTimer = setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % searchPhrases.length;
        setSearchText(searchPhrases[phraseIndex]);
        updateSearchText();
      }, 2000);
    };

    updateSearchText();

    // Simulate finding opponent after 3-7 seconds
    matchTimer = setTimeout(() => {
      setOpponentFound(true);
      setPlayerCount(2);
      setSearchText('Opponent found!');
      
      // Start VS countdown
      setTimeout(() => {
        setVsCountdown(3);
        
        // Countdown from 3 to 1
        countdownTimer = setTimeout(() => {
          setVsCountdown(2);
          setTimeout(() => {
            setVsCountdown(1);
            setTimeout(() => {
              setVsCountdown(null);
              setMatchStarting(true);
              onMatchFound({
                gameMode,
                sessionType,
                roomId: `room_${Date.now()}`,
                opponent: {
                  displayName: 'Challenger',
                  stats: {
                    matchWins: Math.floor(Math.random() * 50),
                    gamesPlayed: Math.floor(Math.random() * 100),
                  }
                }
              });
            }, 1000);
          }, 1000);
        }, 1000);
      }, 1500);
    }, Math.random() * 4000 + 3000);

    return () => {
      clearTimeout(searchTimer);
      clearTimeout(matchTimer);
      clearTimeout(countdownTimer);
    };
  }, [gameMode, sessionType, onMatchFound]);
  if (!fontsLoaded) {
    return null;
  }

  // Get user stats exactly like web version
  const playerStats = {
    matchWins: userData?.stats?.matchWins || 0,
    gamesPlayed: userData?.stats?.gamesPlayed || 0,
    currentStreak: userData?.stats?.currentStreak || 0,
    bestStreak: userData?.stats?.bestStreak || 0,
  };

  const opponentStats = opponentFound ? {
    matchWins: Math.floor(Math.random() * 50),
    gamesPlayed: Math.floor(Math.random() * 100),
    currentStreak: Math.floor(Math.random() * 10),
    bestStreak: Math.floor(Math.random() * 20),
  } : null;

  // Get display name
  const displayName = userData?.displayName || 'Player';

  // Game mode display names exactly like web version
  const gameModeNames: {[key: string]: string} = {
    'quickfire': 'QUICK FIRE',
    'classic': 'CLASSIC MODE',
    'zero-hour': 'ZERO HOUR',
    'last-line': 'LAST LINE',
    'true-grit': 'TRUE GRIT'
  };

  const displayGameMode = gameModeNames[gameMode] || gameMode.toUpperCase();

  return (
    <View style={styles.container}>
      {/* Background gradient exactly like web version */}
      <View style={styles.backgroundGradient} />
      
      <View style={styles.content}>
        {/* Game Mode Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.gameMode, { fontFamily: 'Audiowide_400Regular' }]}>
            {displayGameMode}
          </Text>
          <Text style={[styles.sessionType, { fontFamily: 'Audiowide_400Regular' }]}>
            {sessionType.toUpperCase()} MATCH
          </Text>
        </View>

        {/* Main matchmaking area exactly like web version */}
        <View style={styles.matchingArea}>
          {/* Host Profile and Stats */}
          <View style={styles.playerSection}>
            <View style={styles.playerBackground}>
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, { fontFamily: 'Audiowide_400Regular' }]}>
                  {displayName}
                </Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { fontFamily: 'Audiowide_400Regular' }]}>
                    WINS
                  </Text>
                  <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
                    {playerStats.matchWins}
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { fontFamily: 'Audiowide_400Regular' }]}>
                    MATCHES
                  </Text>
                  <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
                    {playerStats.gamesPlayed}
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { fontFamily: 'Audiowide_400Regular' }]}>
                    STREAK
                  </Text>
                  <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
                    {playerStats.currentStreak}
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text style={[styles.statLabel, { fontFamily: 'Audiowide_400Regular' }]}>
                    BEST
                  </Text>
                  <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
                    {playerStats.bestStreak}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* VS Section */}
          <View style={styles.vsSection}>
            {vsCountdown !== null ? (
              <Text style={[styles.countdown, { fontFamily: 'Audiowide_400Regular' }]}>
                {vsCountdown}
              </Text>
            ) : (
              <Text style={[styles.vsText, { fontFamily: 'Audiowide_400Regular' }]}>
                VS
              </Text>
            )}
          </View>

          {/* Opponent Section */}
          <View style={styles.playerSection}>
            {opponentFound && opponentStats ? (
              <View style={styles.playerBackground}>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { fontFamily: 'Audiowide_400Regular' }]}>
                    CHALLENGER
                  </Text>
                </View>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { fontFamily: 'Audiowide_400Regular' }]}>
                      WINS
                    </Text>
                    <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
                      {opponentStats.matchWins}
                    </Text>
                  </View>
                  
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { fontFamily: 'Audiowide_400Regular' }]}>
                      MATCHES
                    </Text>
                    <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
                      {opponentStats.gamesPlayed}
                    </Text>
                  </View>
                  
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { fontFamily: 'Audiowide_400Regular' }]}>
                      STREAK
                    </Text>
                    <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
                      {opponentStats.currentStreak}
                    </Text>
                  </View>
                  
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { fontFamily: 'Audiowide_400Regular' }]}>
                      BEST
                    </Text>
                    <Text style={[styles.statValue, { fontFamily: 'Audiowide_400Regular' }]}>
                      {opponentStats.bestStreak}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.searchingContainer}>
                <Text style={[styles.searchingText, { fontFamily: 'Audiowide_400Regular' }]}>
                  {searchText}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Cancel Button exactly like web version */}
        <TouchableOpacity
          style={[styles.cancelButton, {
            backgroundColor: (vsCountdown !== null || matchStarting) ? '#666666' : '#FF0080',
            opacity: (vsCountdown !== null || matchStarting) ? 0.5 : 1,
          }]}
          onPress={onCancel}
          disabled={vsCountdown !== null || matchStarting}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelButtonText, { fontFamily: 'Audiowide_400Regular' }]}>
            {(vsCountdown !== null || matchStarting) ? 'STARTING...' : 'CANCEL'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#3533CD',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 50,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 50,
  },
  titleContainer: {
    alignItems: 'center',
    gap: 10,
  },
  gameMode: {
    color: '#E2E2E2',
    fontSize: 48,
    fontWeight: '400',
    lineHeight: 56,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  sessionType: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 28,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  matchingArea: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    alignSelf: 'stretch',
  },
  playerSection: {
    height: 200,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    gap: 20,
    alignSelf: 'stretch',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerBackground: {
    flex: 1,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    borderRadius: 15,
    backgroundColor: 'rgba(87, 78, 120, 0.3)',
  },
  playerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  playerName: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  statsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    maxWidth: 250,
    alignSelf: 'stretch',
  },
  statBox: {
    display: 'flex',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 100,
    borderRadius: 18,
    backgroundColor: 'rgba(87, 78, 120, 0.3)',
  },
  statLabel: {
    color: '#E2E2E2',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#E2E2E2',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  vsSection: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  vsText: {
    color: '#E2E2E2',
    fontSize: 48,
    fontWeight: '400',
    lineHeight: 56,
    textTransform: 'uppercase',
  },
  countdown: {
    color: '#FFD700',
    fontSize: 72,
    fontWeight: '400',
    lineHeight: 80,
    textAlign: 'center',
  },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  searchingText: {
    color: '#E2E2E2',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 24,
    textTransform: 'uppercase',
  },
  cancelButton: {
    display: 'flex',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 30,
    textTransform: 'uppercase',
});