# Mobile App Implementation Guide

## Overview
A cross-platform mobile application for DashDice enabling players to enjoy the full gaming experience on iOS and Android devices with native performance and mobile-optimized UI/UX.

## Technology Stack
- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit + React Context
- **Backend**: Firebase (shared with web app)
- **Navigation**: React Navigation v6
- **Authentication**: Firebase Auth with biometric support
- **Push Notifications**: Expo Notifications + Firebase FCM
- **Real-time**: Firebase Firestore real-time listeners
- **Storage**: AsyncStorage + Firebase Storage

## Project Structure
```
dashdice-mobile/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── game/
│   │   ├── chat/
│   │   ├── vault/
│   │   └── common/
│   ├── screens/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── game/
│   │   ├── vault/
│   │   ├── shop/
│   │   ├── tournaments/
│   │   └── profile/
│   ├── navigation/
│   ├── services/
│   ├── hooks/
│   ├── store/
│   ├── utils/
│   └── types/
├── assets/
│   ├── images/
│   ├── fonts/
│   ├── sounds/
│   └── animations/
└── config/
```

## Core Features

### Mobile-Specific Features
- **Touch Gestures**: Swipe to roll dice, tap to select
- **Haptic Feedback**: Vibration on dice rolls and wins
- **Offline Mode**: Local gameplay against AI when offline
- **Biometric Login**: Face ID / Touch ID authentication
- **Push Notifications**: Match invites, tournament updates
- **Background Sync**: Auto-sync when app returns to foreground
- **Native Animations**: Smooth 60fps animations
- **Device Orientation**: Portrait and landscape support

## Setup and Configuration

### Initial Project Setup
```bash
# Install Expo CLI
npm install -g @expo/cli

# Create new Expo project
npx create-expo-app dashdice-mobile --template

# Navigate to project
cd dashdice-mobile

# Install dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @reduxjs/toolkit react-redux
npm install firebase expo-notifications
npm install react-native-reanimated react-native-gesture-handler
npm install expo-haptics expo-local-authentication
npm install @react-native-async-storage/async-storage
npm install expo-av expo-linear-gradient
```

### Expo Configuration
```json
// app.json
{
  "expo": {
    "name": "DashDice",
    "slug": "dashdice-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1F2937"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.dashdice.mobile",
      "infoPlist": {
        "NSFaceIDUsageDescription": "Use Face ID to authenticate quickly and securely."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1F2937"
      },
      "package": "com.dashdice.mobile",
      "permissions": [
        "android.permission.VIBRATE",
        "android.permission.USE_FINGERPRINT",
        "android.permission.USE_BIOMETRIC"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-notifications",
      "expo-local-authentication",
      "expo-haptics"
    ]
  }
}
```

## Core Services

### Firebase Configuration
```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Same config as web app
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
```

### Authentication Service
```typescript
// src/services/authService.ts
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

export class AuthService {
  // Biometric authentication
  static async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return false;

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access DashDice',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  // Enable biometric login
  static async enableBiometricLogin(userId: string): Promise<void> {
    await AsyncStorage.setItem(`biometric_enabled_${userId}`, 'true');
  }

  // Check if biometric login is enabled
  static async isBiometricEnabled(userId: string): Promise<boolean> {
    const enabled = await AsyncStorage.getItem(`biometric_enabled_${userId}`);
    return enabled === 'true';
  }

  // Standard email/password authentication
  static async signIn(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  static async signUp(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  static async signOut(): Promise<void> {
    await signOut(auth);
  }

  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}
```

### Push Notifications Service
```typescript
// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  static async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
      alert('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  static async saveTokenToFirestore(userId: string, token: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        pushToken: token,
        lastTokenUpdate: new Date()
      });
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: trigger || null,
    });
  }

  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  static async clearAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
```

## Navigation Structure

### Root Navigator
```typescript
// src/navigation/RootNavigator.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthState } from '../hooks/useAuthState';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { GameNavigator } from './GameNavigator';
import { LoadingScreen } from '../screens/LoadingScreen';

const Stack = createStackNavigator();

export function RootNavigator() {
  const { user, loading } = useAuthState();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="Game" 
              component={GameNavigator}
              options={{ gestureEnabled: false }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Main Tab Navigator
```typescript
// src/navigation/MainTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { VaultScreen } from '../screens/vault/VaultScreen';
import { ShopScreen } from '../screens/shop/ShopScreen';
import { TournamentsScreen } from '../screens/tournaments/TournamentsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Vault':
              iconName = focused ? 'albums' : 'albums-outline';
              break;
            case 'Shop':
              iconName = focused ? 'storefront' : 'storefront-outline';
              break;
            case 'Tournaments':
              iconName = focused ? 'trophy' : 'trophy-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: '#374151',
        },
        headerStyle: {
          backgroundColor: '#1F2937',
        },
        headerTintColor: '#FFFFFF',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Vault" component={VaultScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen name="Tournaments" component={TournamentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

## Game Implementation

### Game Screen
```typescript
// src/screens/game/GameScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Vibration
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiceComponent } from '../../components/game/DiceComponent';
import { ScoreBoard } from '../../components/game/ScoreBoard';
import { AbilitiesPanel } from '../../components/game/AbilitiesPanel';
import { GameTimer } from '../../components/game/GameTimer';
import { useGameState } from '../../hooks/useGameState';

const { width, height } = Dimensions.get('window');

export function GameScreen({ route, navigation }) {
  const { matchId } = route.params;
  const { gameState, rollDice, useAbility, endTurn } = useGameState(matchId);
  const [selectedDice, setSelectedDice] = useState<number[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Shake animation for dice rolling
  const createShakeAnimation = () => {
    return Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]);
  };

  // Gesture handler for dice rolling
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 20;
    },
    onPanResponderRelease: async (evt, gestureState) => {
      // Check if it's a swipe gesture
      if (Math.abs(gestureState.dx) > 50 || Math.abs(gestureState.dy) > 50) {
        await handleDiceRoll();
      }
    },
  });

  const handleDiceRoll = async () => {
    if (!gameState.isMyTurn) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Shake animation
    createShakeAnimation().start();

    // Roll dice
    const result = await rollDice();
    
    if (result.success) {
      // Success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDiceSelect = (diceIndex: number) => {
    if (!gameState.isMyTurn) return;

    setSelectedDice(prev => {
      const newSelected = prev.includes(diceIndex)
        ? prev.filter(i => i !== diceIndex)
        : [...prev, diceIndex];
      
      // Light haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      return newSelected;
    });
  };

  const handleAbilityUse = async (abilityId: string) => {
    const result = await useAbility(abilityId);
    
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading game...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        {/* Game content would use selected background */}
      </View>

      {/* Score Board */}
      <ScoreBoard 
        playerScore={gameState.playerScore}
        opponentScore={gameState.opponentScore}
        round={gameState.round}
        maxRounds={gameState.maxRounds}
      />

      {/* Timer */}
      <GameTimer 
        timeLeft={gameState.timeLeft}
        isMyTurn={gameState.isMyTurn}
      />

      {/* Dice Area */}
      <Animated.View 
        style={[
          styles.diceContainer,
          {
            transform: [{ translateX: shakeAnimation }]
          }
        ]}
        {...panResponder.panHandlers}
      >
        {gameState.dice.map((value, index) => (
          <DiceComponent
            key={index}
            value={value}
            isSelected={selectedDice.includes(index)}
            onPress={() => handleDiceSelect(index)}
            disabled={!gameState.isMyTurn}
          />
        ))}
      </Animated.View>

      {/* Abilities Panel */}
      <AbilitiesPanel
        matchId={matchId}
        gameState={gameState}
        onAbilityUse={handleAbilityUse}
        isMyTurn={gameState.isMyTurn}
      />

      {/* Turn Controls */}
      {gameState.isMyTurn && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.rollButton}
            onPress={handleDiceRoll}
          >
            <Text style={styles.rollButtonText}>
              Swipe to Roll
            </Text>
          </TouchableOpacity>
          
          {selectedDice.length > 0 && (
            <TouchableOpacity
              style={styles.holdButton}
              onPress={() => {/* Handle hold */}}
            >
              <Text style={styles.holdButtonText}>
                Hold Selected
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: height * 0.4,
  },
  diceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.25,
    paddingHorizontal: 20,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  rollButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 10,
  },
  rollButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  holdButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  holdButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
```

### Dice Component
```typescript
// src/components/game/DiceComponent.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const DICE_SIZE = width * 0.15;

interface DiceComponentProps {
  value: number;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function DiceComponent({ value, isSelected, onPress, disabled }: DiceComponentProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation when value changes
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [value]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getDotPositions = (value: number) => {
    const positions = {
      1: [{ row: 1, col: 1 }],
      2: [{ row: 0, col: 0 }, { row: 2, col: 2 }],
      3: [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }],
      4: [
        { row: 0, col: 0 }, { row: 0, col: 2 },
        { row: 2, col: 0 }, { row: 2, col: 2 }
      ],
      5: [
        { row: 0, col: 0 }, { row: 0, col: 2 },
        { row: 1, col: 1 },
        { row: 2, col: 0 }, { row: 2, col: 2 }
      ],
      6: [
        { row: 0, col: 0 }, { row: 0, col: 2 },
        { row: 1, col: 0 }, { row: 1, col: 2 },
        { row: 2, col: 0 }, { row: 2, col: 2 }
      ],
    };
    return positions[value] || [];
  };

  const renderDots = () => {
    const dots = getDotPositions(value);
    const grid = Array(3).fill(null).map(() => Array(3).fill(false));
    
    dots.forEach(({ row, col }) => {
      grid[row][col] = true;
    });

    return grid.map((row, rowIndex) =>
      row.map((hasDot, colIndex) => (
        <View
          key={`${rowIndex}-${colIndex}`}
          style={[
            styles.dotPosition,
            {
              top: rowIndex * (DICE_SIZE / 4),
              left: colIndex * (DICE_SIZE / 4),
            }
          ]}
        >
          {hasDot && <View style={styles.dot} />}
        </View>
      ))
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { scale: scaleAnim },
              { rotate: spin }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={isSelected ? ['#3B82F6', '#1D4ED8'] : ['#F3F4F6', '#D1D5DB']}
          style={styles.dice}
        >
          <View style={styles.dotsContainer}>
            {renderDots()}
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 8,
  },
  dice: {
    width: DICE_SIZE,
    height: DICE_SIZE,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  dotsContainer: {
    width: DICE_SIZE * 0.8,
    height: DICE_SIZE * 0.8,
    position: 'relative',
  },
  dotPosition: {
    position: 'absolute',
    width: DICE_SIZE / 4,
    height: DICE_SIZE / 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
});
```

## Chat Integration

### Mobile Chat Component
```typescript
// src/components/chat/MobileChatComponent.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../../hooks/useChat';

export function MobileChatComponent({ isVisible, onClose }) {
  const {
    messages,
    currentRoom,
    sendMessage,
    isLoading
  } = useChat();
  
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentRoom) return;

    const success = await sendMessage(currentRoom, messageText.trim());
    if (success) {
      setMessageText('');
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item: message }) => (
    <View style={[
      styles.messageContainer,
      message.isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      {!message.isOwnMessage && (
        <Text style={styles.senderName}>{message.username}</Text>
      )}
      <Text style={styles.messageText}>{message.content}</Text>
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  );

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [600, 0],
            }),
          }],
        },
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages[currentRoom] || []}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.textInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: messageText.trim() ? 1 : 0.5 }
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1F2937',
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#374151',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  senderName: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#374151',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

## Performance Optimizations

### Image Optimization
```typescript
// src/components/common/OptimizedImage.tsx
import React, { useState } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';

interface OptimizedImageProps {
  source: { uri: string };
  style?: any;
  placeholder?: React.ReactNode;
}

export function OptimizedImage({ source, style, placeholder }: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        style={[styles.image, style]}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        resizeMode="cover"
      />
      
      {loading && (
        <View style={styles.overlay}>
          {placeholder || <ActivityIndicator size="small" color="#3B82F6" />}
        </View>
      )}
      
      {error && (
        <View style={[styles.overlay, styles.errorOverlay]}>
          <Text style={styles.errorText}>Failed to load</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  errorOverlay: {
    backgroundColor: '#991B1B',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});
```

## App Store Deployment

### iOS Configuration
```typescript
// ios/dashdice/Info.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSCameraUsageDescription</key>
  <string>DashDice needs camera access for profile pictures</string>
  <key>NSFaceIDUsageDescription</key>
  <string>Use Face ID to authenticate quickly and securely</string>
  <key>NSUserNotificationsUsageDescription</key>
  <string>DashDice sends notifications for match invites and updates</string>
  <key>UIBackgroundModes</key>
  <array>
    <string>fetch</string>
    <string>remote-notification</string>
  </array>
</dict>
</plist>
```

### Build Scripts
```json
// package.json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "submit:android": "eas submit --platform android",
    "submit:ios": "eas submit --platform ios",
    "preview": "expo install --fix && expo start",
    "test": "jest"
  }
}
```

### EAS Build Configuration
```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "bundleIdentifier": "com.dashdice.mobile"
      },
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account-key.json",
        "track": "production"
      }
    }
  }
}
```

## Implementation Phases

### Phase 1: Core Setup (Weeks 1-2)
- Project initialization and basic navigation
- Firebase integration and authentication
- Basic UI components and styling

### Phase 2: Game Implementation (Weeks 3-4)
- Core game mechanics with touch controls
- Dice animations and haptic feedback
- Real-time multiplayer integration

### Phase 3: Feature Integration (Weeks 5-6)
- Chat system integration
- Vault and shop functionality
- Push notifications setup

### Phase 4: Polish & Deployment (Weeks 7-8)
- Performance optimization
- App store assets and compliance
- Beta testing and deployment

This mobile implementation provides a native-feeling experience while maintaining feature parity with the web application, leveraging platform-specific capabilities like haptic feedback, biometric authentication, and push notifications.
