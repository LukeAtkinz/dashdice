import React, { useState, useEffect, useCallback, useMemo, memo, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useMultiplayerGame } from "../hooks/useMultiplayerGame";
import {
  trackUserActivity,
  getUserGold,
  hasEnoughGoldForGame,
  loadUserData,
} from "../services/userProfileService";
import Chat from "./Chat";
import {
  FriendNotificationProvider,
  useFriendNotifications,
} from "../context/FriendNotificationContext";
import { requireEmailVerification } from "../utils/antiCheat";
import { preloadResource, measurePerformance } from "../utils/performance";


// ...existing code...
// Lazy load heavy components for better performance
const Match = lazy(() => import("./Match"));
const Matchmaking = lazy(() => import("./Matchmaking"));
const GameLobby = lazy(() => import("./GameLobby"));
const GameWaitingRoom = lazy(() => import("./GameWaitingRoom"));
const Inventory = lazy(() => import("./Inventory"));
const Friends = lazy(() => import("./Friends"));
const FriendNotifications = lazy(() => import("./FriendNotifications"));
const AccountPage = lazy(() => import("./AccountPage"));

// Panel slide animations
const panelVariants = {
  enter: {
    x: "100%",
    opacity: 0
  },
  center: {
    x: 0,
    opacity: 1
  },
  exit: {
    x: "-100%",
    opacity: 0
  }
};

const panelTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.3
};

// Navigation menu items
const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: "🎯" },
  { id: "game", label: "Play Now", icon: "🎲" },
  { id: "testing", label: "TESTING", icon: "🧪" },
  { id: "matchmaking", label: "Multiplayer", icon: "⚔️" },
  { id: "lobby", label: "Game Lobby", icon: "🏟️" },
  { id: "inventory", label: "Inventory", icon: "🎒" },
  { id: "friends", label: "Friends", icon: "👥" },
  { id: "account", label: "Account", icon: "⚙️" }
];

function SinglePageDashboard() {
  const { currentUser, logout, resendEmailVerification } = useAuth();
  // Remove broken openChat, use local state for chat overlay
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { joinGame } = useMultiplayerGame();
  const { totalUnreadCount, friendRequests } = useFriendNotifications();
  
  // Core state
  const [activeView, setActiveView] = useState("dashboard");
  const [multiplayerGameId, setMultiplayerGameId] = useState(null);
  const [hostGameId, setHostGameId] = useState(null);
  const [userGold, setUserGold] = useState(0);
  const [gameMode, setGameMode] = useState("classic");
  const [dailyRewardNotification, setDailyRewardNotification] = useState(null);
  const [gameRefreshKey, setGameRefreshKey] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [hoveredGameMode, setHoveredGameMode] = useState(null);
  const [betAmount, setBetAmount] = useState(100);
  const [waitingRoomConfig, setWaitingRoomConfig] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);


  // Available backgrounds mapped by filename (for inventory/match use only)
  const availableBackgrounds = useMemo(() => [
    { name: "All For Glory", file: "/backgrounds/All For Glory.jpg", type: "image" },
    { name: "New Day", file: "/backgrounds/New Day.mp4", type: "video" },
    { name: "On A Mission", file: "/backgrounds/On A Mission.mp4", type: "video" },
    { name: "Relax", file: "/backgrounds/Relax.png", type: "image" },
    { name: "Underwater", file: "/backgrounds/Underwater.mp4", type: "video" },
    { name: "Long Road Ahead", file: "/backgrounds/Long Road Ahead.jpg", type: "image" }
  ], []);

  // Use DisplayBackgroundEquip and MatchBackgroundEquip from context
  const { DisplayBackgroundEquip, setDisplayBackgroundEquip, MatchBackgroundEquip, setMatchBackgroundEquip } = useBackground();

  // Load user data and check for daily rewards
  useEffect(() => {
    if (currentUser?.uid) {
      measurePerformance('User Data Loading', () => {
        loadUserData(currentUser.uid);
        const dailyReward = trackUserActivity(currentUser.uid);
        const currentGold = getUserGold(currentUser.uid);

        setUserGold(currentGold);
        setUserProfile({ gold: currentGold });

        if (dailyReward.awarded) {
          setDailyRewardNotification({
            message: `Daily Login Bonus: +${dailyReward.amount} Gold!`,
            show: true,
          });

          setTimeout(() => {
            setDailyRewardNotification(null);
          }, 5000);
        }
      });
    }

    // Preload critical resources for better performance
    preloadResource('/backgrounds/New Day.mp4', 'video');
    preloadResource('/Design Elements/logo.webm', 'video');
    preloadResource('/Design Elements/Delivery Man.webp', 'image');
    preloadResource('/Design Elements/Game Coins.webp', 'image');
  }, [currentUser]);

  // ...existing code...

  const gameIdToSubscribe =
    activeView === "waiting-for-guest" ? hostGameId : multiplayerGameId;
  const {
    findQuickMatch,
    gameSession,
    loading: gameLoading,
    error: gameError,
  } = useMultiplayerGame(gameIdToSubscribe);

  // Handle gameSession changes for automatic view transitions
  useEffect(() => {
    console.log('SinglePageDashboard: gameSession changed:', gameSession);
    
    if (gameSession) {
      // Check for game in progress - use both uppercase and lowercase for compatibility
      if (gameSession.status === 'playing' || gameSession.status === 'PLAYING' || 
          gameSession.status === 'in_progress' || gameSession.status === 'IN_PROGRESS' ||
          gameSession.status === 'GAME_PLAYING') {
        console.log('SinglePageDashboard: Game is playing, joining multiplayer game');
        setMultiplayerGameId(gameSession.id);
        setActiveView("multiplayer-game");
        return;
      }
      
      // If we're waiting for players and currently in matchmaking, switch to waiting room
      if (activeView === "matchmaking" && 
          (gameSession.status === 'waiting' || gameSession.status === 'WAITING_FOR_PLAYERS' ||
           gameSession.status === 'WAITING')) {
        console.log('SinglePageDashboard: Switching from matchmaking to waiting room');
        
        // Configure waiting room based on game mode
        const gameMode = gameSession.gameMode || gameSession.mode || 'quickfire';
        setWaitingRoomConfig({
          gameType: 'multiplayer',
          gameMode: gameMode,
          betAmount: gameSession.betAmount || 100,
          gameOptions: gameSession.gameOptions || {}
        });
        setMultiplayerGameId(gameSession.id);
        setActiveView("waiting-room");
      }
    }
  }, [gameSession, activeView, currentUser?.uid]);

  // Navigation handlers
  const handleNavigate = useCallback((viewId) => {
    setActiveView(viewId);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  // Game handlers
  const handlePlayNow = useCallback(() => {
    setActiveView("game");
    setMultiplayerGameId(null);
  }, []);

  const handleMultiplayer = useCallback(() => {
    setActiveView("matchmaking");
  }, []);

  const handleLobby = useCallback(() => {
    setActiveView("lobby");
  }, []);

  const handleInventory = useCallback(() => {
    setActiveView("inventory");
  }, []);

  const handleFriends = useCallback(() => {
    setActiveView("friends");
  }, []);

  // Show coming soon popup
  const showComingSoonPopup = useCallback(() => {
    setShowComingSoon(true);
    setTimeout(() => {
      setShowComingSoon(false);
    }, 2000);
  }, []);

  const handleAccount = useCallback(() => {
    setActiveView("account");
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setActiveView("dashboard");
    setMultiplayerGameId(null);
    setHostGameId(null);
  }, []);

  // Game mode action handler for waiting room
  const handleGameModeAction = useCallback(async (gameMode, actionType) => {
    try {
      console.log('SinglePageDashboard: handleGameModeAction called with:', { gameMode, actionType });
      
      // Check email verification for multiplayer
      try {
        requireEmailVerification(currentUser);
      } catch (error) {
        console.warn("Email verification warning:", error.message);
        // For now, let's continue even without email verification for testing
      }

      if (!hasEnoughGoldForGame(currentUser.uid)) {
        console.warn("Insufficient gold warning, but continuing for testing");
      }

      const gameConfigs = {
        quickfire: {
          bestOf: 3,
          targetScore: 50,
          bankingAllowed: true,
          mode: "quickfire",
          betAmount: 100,
        },
        classic: {
          bestOf: 3,
          targetScore: 100,
          bankingAllowed: true,
          mode: "classic",
          betAmount: 100,
        },
        zerohour: {
          bestOf: 1,
          targetRounds: 1,
          targetScore: 0,
          startingScore: 100,
          bankingAllowed: true,
          mode: "zerohour",
          betAmount: 100,
        },
        lastline: {
          bestOf: 1,
          targetRounds: 1,
          targetScore: 50,
          bankingAllowed: true,
          mode: "suddendeath",
          betAmount: 100,
        },
        truegrit: {
          bestOf: 1,
          targetRounds: 1,
          targetScore: null,
          bankingAllowed: false,
          oneTurnOnly: true,
          mode: "laststand",
          betAmount: 100,
        },
        tagteam: {
          bestOf: 3,
          targetScore: 100,
          bankingAllowed: true,
          mode: "tagteam",
          betAmount: 100,
        }
      };

      const config = gameConfigs[gameMode];
      if (!config) {
        throw new Error(`Unknown game mode: ${gameMode}`);
      }

      console.log('SinglePageDashboard: Game config for', gameMode, ':', config);

      if (actionType === 'live') {
        // Set up waiting room for live play
        const waitingConfig = {
          gameType: 'multiplayer',
          gameMode: gameMode,
          actionType: 'live',
          gameConfig: config
        };
        console.log('SinglePageDashboard: Setting waiting room config for live play:', waitingConfig);
        setWaitingRoomConfig(waitingConfig);
        setActiveView("waiting-room");
        console.log('SinglePageDashboard: Set active view to waiting-room');
      } else if (actionType === 'custom') {
        // Set up waiting room for custom game
        const waitingConfig = {
          gameType: 'multiplayer',
          gameMode: gameMode,
          actionType: 'custom',
          gameConfig: config
        };
        console.log('SinglePageDashboard: Setting waiting room config for custom game:', waitingConfig);
        setWaitingRoomConfig(waitingConfig);
        setActiveView("waiting-room");
        console.log('SinglePageDashboard: Set active view to waiting-room');
      }
    } catch (error) {
      console.error(`Failed to start ${gameMode} ${actionType}:`, error);
      alert(`Failed to start ${gameMode} ${actionType}. Please try again.`);
      setActiveView("dashboard");
    }
  }, [currentUser]);

  // Game session handlers
  const handleGameStart = useCallback((gameId) => {
    console.log("Game starting with ID:", gameId);
    setMultiplayerGameId(gameId);
    setActiveView("multiplayer-game");
  }, []);

  const handleGameFound = useCallback((gameId) => {
    console.log("Game found with ID:", gameId);
    setMultiplayerGameId(gameId);
    setActiveView("multiplayer-game");
  }, []);

  const handleRoomJoined = useCallback((gameId) => {
    console.log("Room joined with ID:", gameId);
    setMultiplayerGameId(gameId);
    setActiveView("multiplayer-game");
  }, []);

  const handleGameEnd = useCallback(() => {
    setMultiplayerGameId(null);
    setHostGameId(null);
    setActiveView("dashboard");
    setGameRefreshKey(prev => prev + 1);
  }, []);

  // Email verification check
  if (currentUser && !currentUser.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
      }}>
        <div className="bg-yellow-600 text-white p-8 rounded-2xl text-center">
          <div className="flex items-center justify-center gap-4">
            <span>⚠️ Please verify your email to access all features</span>
            <button
              onClick={async () => {
                try {
                  await resendEmailVerification();
                  alert("Verification email sent! Please check your email.");
                } catch (error) {
                  alert("Failed to send verification email: " + error.message);
                }
              }}
              className="bg-yellow-700 hover:bg-yellow-800 px-4 py-2 rounded text-sm transition-colors"
            >
              Resend Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading component for lazy-loaded components
  const LoadingSpinner = memo(() => (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
    }}>
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent"></div>
        <p className="text-white text-lg font-semibold">Loading...</p>
      </div>
    </div>
  ));

  // New renderPanel: pass background handlers and backgrounds to panels
  const renderPanel = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardPanel 
          userGold={userGold}
          gameMode={gameMode}
          setGameMode={setGameMode}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          hoveredGameMode={hoveredGameMode}
          setHoveredGameMode={setHoveredGameMode}
          onPlayNow={handlePlayNow}
          onMultiplayer={handleMultiplayer}
          onLobby={handleLobby}
          onInventory={handleInventory}
          onFriends={handleFriends}
          onAccount={handleAccount}
          handleGameModeAction={handleGameModeAction}
          showComingSoonPopup={showComingSoonPopup}
          availableBackgrounds={availableBackgrounds}
          DisplayBackgroundEquip={DisplayBackgroundEquip}
          setDisplayBackgroundEquip={handleSetDisplayBackgroundEquip}
          MatchBackgroundEquip={MatchBackgroundEquip}
          setMatchBackgroundEquip={handleSetMatchBackgroundEquip}
        />;

      case "waiting-room":
        if (waitingRoomConfig) {
          console.log('SinglePageDashboard: Rendering GameWaitingRoom with config:', waitingRoomConfig);
          return (
            <Suspense fallback={<LoadingSpinner />}>
              <GameWaitingRoom
                gameType={waitingRoomConfig.gameType}
                gameMode={waitingRoomConfig.gameMode}
                actionType={waitingRoomConfig.actionType}
                gameConfig={waitingRoomConfig.gameConfig}
                matchBackground={MatchBackgroundEquip}
                onGameStart={(gameId, session) => {
                  console.log('SinglePageDashboard: Game starting with ID:', gameId, 'Session:', session);
                  setMultiplayerGameId(gameId);
                  if (waitingRoomConfig?.gameMode) {
                    setGameMode(waitingRoomConfig.gameMode);
                  }
                  if (waitingRoomConfig?.gameConfig?.betAmount) {
                    setBetAmount(waitingRoomConfig.gameConfig.betAmount);
                  }
                  setActiveView("multiplayer-game");
                }}
                onGameSessionUpdate={(gameId, session) => {
                  setMultiplayerGameId(gameId);
                }}
                onBack={handleBackToDashboard}
                onBackToDashboard={handleBackToDashboard}
                key={gameRefreshKey}
              />
            </Suspense>
          );
        }
        return <div>Loading waiting room...</div>;

      // ...existing code for other cases...
      case "game":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Match 
              key={gameRefreshKey}
              gameMode={gameMode}
              betAmount={betAmount}
              userGold={userGold}
              setUserGold={setUserGold}
              isMultiplayer={false}
              onGameEnd={handleBackToDashboard}
              onBackToDashboard={handleBackToDashboard}
            />
          </Suspense>
        );
      case "testing":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Match 
              key={gameRefreshKey + 1000}
              gameMode="classic"
              betAmount={100}
              userGold={10000}
              setUserGold={setUserGold}
              isMultiplayer={false}
              onGameEnd={handleBackToDashboard}
              onBackToDashboard={handleBackToDashboard}
              onBack={handleBackToDashboard}
            />
          </Suspense>
        );
      case "matchmaking":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Matchmaking
              onGameStart={handleGameStart}
              onGameFound={handleGameFound}
              onBackToDashboard={handleBackToDashboard}
              gameMode={gameMode}
              betAmount={betAmount}
            />
          </Suspense>
        );
      case "multiplayer-game":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Match 
              key={`multiplayer-${multiplayerGameId}-${gameRefreshKey}`}
              gameMode={gameMode}
              betAmount={betAmount}
              userGold={userGold}
              setUserGold={setUserGold}
              isMultiplayer={true}
              multiplayerGameId={multiplayerGameId}
              onGameEnd={handleGameEnd}
              onBackToDashboard={handleBackToDashboard}
            />
          </Suspense>
        );
      case "lobby":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GameLobby
              onRoomJoined={handleRoomJoined}
              onBackToDashboard={handleBackToDashboard}
            />
          </Suspense>
        );
      case "inventory":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Inventory
              onBackToDashboard={handleBackToDashboard}
              availableBackgrounds={availableBackgrounds}
              setDisplayBackgroundEquip={handleSetDisplayBackgroundEquip}
              setMatchBackgroundEquip={handleSetMatchBackgroundEquip}
            />
          </Suspense>
        );
      case "friends":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Friends
              onBackToDashboard={handleBackToDashboard}
            />
          </Suspense>
        );
      case "account":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AccountPage
              onBack={handleBackToDashboard}
              onBackToDashboard={handleBackToDashboard}
            />
          </Suspense>
        );
      default:
        return <DashboardPanel 
          userGold={userGold}
          gameMode={gameMode}
          setGameMode={setGameMode}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          hoveredGameMode={hoveredGameMode}
          setHoveredGameMode={setHoveredGameMode}
          onPlayNow={handlePlayNow}
          onMultiplayer={handleMultiplayer}
          onLobby={handleLobby}
          onInventory={handleInventory}
          onFriends={handleFriends}
          onAccount={handleAccount}
          handleGameModeAction={handleGameModeAction}
          showComingSoonPopup={showComingSoonPopup}
          availableBackgrounds={availableBackgrounds}
          displayBackground={displayBackground}
          setDisplayBackground={handleSetDashboardBackground}
          matchBackground={matchBackground}
          setMatchBackground={handleSetMatchBackground}
        />;
    }
  };


      // Render dashboard background using DisplayBackgroundEquip
  return (
    <div className="min-h-screen max-h-screen overflow-hidden relative" style={{ paddingBottom: "20px" }}>
      {/* Add styles for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
        }
        @keyframes popAnimation {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1.05); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .game-button {
          transition: all 0.2s ease-out !important;
          cursor: pointer !important;
        }
        .game-button:hover {
          animation: popAnimation 0.3s ease-out forwards !important;
          cursor: pointer !important;
          transform: scale(1.05) !important;
        }
      `}</style>

      {/* Background Video/Image - DisplayBackgroundEquip for dashboard */}
      {DisplayBackgroundEquip.type === "video" ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover z-0"
          onLoadStart={() => console.log('🎬 Dashboard background video loading started')}
          onCanPlay={() => console.log('🎬 Dashboard background video ready to play')}
        >
          <source src={DisplayBackgroundEquip.file} type="video/mp4" />
        </video>
      ) : (
        <img
          src={DisplayBackgroundEquip.file}
          alt={DisplayBackgroundEquip.name}
          className="absolute inset-0 w-full h-full object-cover z-0"
          onLoad={() => console.log('🖼️ Dashboard background image loaded')}
        />
      )}
      {/* Fallback gradient if background doesn't load */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(50% 50% at 50% 50%, rgba(120, 119, 198, 0.30) 0%, rgba(255, 255, 255, 0.00) 100%), linear-gradient(180deg, #3533CD 0%, #7209B7 100%)"
      }}></div>

      {/* Overlay for better content visibility */}
      <div className="absolute inset-0 bg-black/30 z-10"></div>

      {/* Daily Reward Notification */}
      <AnimatePresence>
        {dailyRewardNotification?.show && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            {dailyRewardNotification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static Layout with animated center content */}
      <div className="relative z-20 h-screen flex flex-col">
        {/* Static Top Navigation */}
        {(activeView !== "game" && activeView !== "multiplayer-game") && (
          <header className="flex-shrink-0 w-full flex flex-row items-center justify-center gap-[1.25rem] relative z-30 px-[4rem] py-[2rem]">
            {/* Nav Component */}
            <div className="flex-1 flex flex-row items-center justify-between bg-gradient-to-br from-[#192E39] to-[#99999900] rounded-[30px] px-[30px] py-[15px]">
              {/* Left navigation */}
              <div className="flex flex-row items-center justify-start gap-[2rem] mq700:gap-[1rem]">              {/* Logo section */}
              <div className="flex flex-row items-center justify-start gap-[1rem]">
                  <video
                  className="w-6 h-6 max-w-[50px] max-h-[50px] object-contain relative shrink-0"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    alt="Logo"
                    style={{ width: "clamp(24px, 8vw, 40px)", height: "clamp(24px, 8vw, 40px)", background: "transparent" }}
                  >
                    <source src="/Design Elements/logo.webm.mp4" type="video/mp4" />
                  </video>
                  <div
                    onClick={handleBackToDashboard}
                  className="relative font-audiowide text-3xl bg-gradient-to-br from-[#ffd700] to-[#ffed4e] bg-clip-text text-transparent mq450:text-2xl cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                    fontSize: "clamp(24px, 8vw, 40px)",
                      fontStyle: "normal",
                      fontWeight: 400,
                    lineHeight: "clamp(28px, 8vw, 56px)",
                    }}
                  >
                    Dashdice.01
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <div
                    onClick={showComingSoonPopup}
                    className="flex flex-row items-center justify-start gap-[0.5rem] cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300"
                    style={{
                      display: "flex",
                      width: "fit-content",
                      height: "56px",
                      padding: "4px 16px",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "10px",
                      borderRadius: "18px",
                      background: "rgba(128, 128, 128, 0.5)",
                      opacity: 0.7,
                    }}
                  >
                    <img
                      className="w-4 h-4 max-w-[50px] max-h-[50px] object-contain relative shrink-0"
                      alt="Shop"
                      src="/Design Elements/discount tag.webp"
                      style={{ filter: "grayscale(100%)" }}
                    />
                    <div
                      className="relative font-medium text-white text-sm"
                      style={{
                        color: "#AAA",
                        fontFamily: "Audiowide",
                        fontSize: "clamp(24px, 8vw, 32px)",
                        fontStyle: "normal",
                        fontWeight: 400,
                        gap: "10px",
                        leadingTrim: "both",
                        lineHeight: "30px",
                        textTransform: "uppercase",
                      }}
                    >
                      SHOP
                    </div>
                  </div>
                  <div
                    onClick={handleInventory}
                    className="flex flex-row items-center justify-start gap-[0.5rem] cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                    style={{
                      display: "flex",
                      width: "fit-content",
                      height: "56px",
                      padding: "4px 16px",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "10px",
                      borderRadius: "18px",
                      background: "linear-gradient(135deg, #FF0080, #FF4DB8)",
                      boxShadow: "0 4px 15px rgba(255, 0, 128, 0.3)",
                    }}
                  >
                    <img
                      className="w-4 h-4 max-w-[50px] max-h-[50px] object-contain relative shrink-0"
                      alt="Vault"
                      src="/Design Elements/Gem Bucket.webp"
                    />
                    <div
                      className="relative font-medium text-white text-sm"
                      style={{
                        color: "#FFF",
                        fontFamily: "Audiowide",
                        fontSize: "clamp(24px, 8vw, 32px)",
                        fontStyle: "normal",
                        fontWeight: 400,
                        leadingTrim: "both",
                        lineHeight: "30px",
                        textTransform: "uppercase",
                      }}
                    >
                      VAULT
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="flex flex-row items-center justify-start gap-[6px]"
              style={{
                    
                    gap: "20px",
                    
                  }}>
                <div
                  onClick={handleFriends}
                  className="flex flex-row items-center justify-start gap-[0.5rem] cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    display: "flex",
                    width: "fit-content",
                    height: "56px",
                    padding: "4px 16px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px",
                    borderRadius: "18px",
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                  }}
                >
                  <img
                    className="w-4 h-4 max-w-[50px] max-h-[50px] object-contain relative shrink-0"
                    alt="Friends"
                    src="/Design Elements/friends.webp"
                  />
                  <div
                    className="relative font-medium text-white text-sm"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "clamp(24px, 8vw, 32px)",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "30px",
                      textTransform: "uppercase",
                    }}
                  >
                    FRIENDS
                  </div>
                </div>
                <div
                  onClick={() => setActiveView("testing")}
                  className="flex flex-row items-center justify-start gap-[0.5rem] cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    display: "flex",
                    width: "fit-content",
                    height: "56px",
                    padding: "4px 16px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px",
                    borderRadius: "18px",
                    background: "linear-gradient(135deg, #00FF80, #00A855)",
                    boxShadow: "0 4px 15px rgba(0, 255, 128, 0.3)",
                  }}
                >
                  <div
                    className="relative font-medium text-white text-sm"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "clamp(18px, 6vw, 24px)",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "30px",
                      textTransform: "uppercase",
                    }}
                  >
                    🧪 TESTING
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    width: "fit-content",
                    height: "56px",
                    padding: "4px 16px",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px",
                    borderRadius: "18px",
                    background: "#FF0080",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <img
                    className="w-4 h-4 max-w-[50px] max-h-[50px] object-contain relative shrink-0"
                    alt="Gold"
                    src="/Design Elements/Game Coins.webp"
                  />
                  <div
                    className="relative text-sm"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "40px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "30px",
                      textTransform: "uppercase",
                    }}
                  >
                    {userGold?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Account or Back Button */}
            <button
              onClick={(activeView === "dashboard") ? handleAccount : handleBackToDashboard}
              className="flex flex-row items-center justify-between rounded-[30px] px-[10px] py-[10px] object-cover cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                background:
                  "linear-gradient(0deg, rgba(37, 37, 37, 0.12) 0%, rgba(37, 37, 37, 0.12) 100%), linear-gradient(243deg, #1929B7 25.17%, rgba(153, 153, 153, 0.00) 109.89%)",
                dropShodow: "0px 4px 30px rgba(0, 0, 0, 0.0)",
                border: "0px",
              }}
            >
              {activeView === "dashboard" ? (
                <img
                  className="object-cover"
                  style={{
                    width: "60px",
                    height: "60px",
                    flexGrow: 1,
                  }}
                  loading="lazy"
                  alt="Account"
                  src="/Design Elements/Delivery Man.webp"
                />
              ) : (
                <div style={{
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  color: "white",
                  fontWeight: "bold"
                }}>
                  ←
                </div>
              )}
            </button>
          </header>
        )}

        {/* Main Content Area with center-only animations */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              variants={panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={panelTransition}
              className="w-full h-full flex items-center justify-center"
            >
              <div className="w-full h-full max-w-full max-h-full overflow-auto flex items-center justify-center">
                {renderPanel()}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Static Bottom Navigation */}
        {(activeView !== "game" && activeView !== "multiplayer-game") && (
          <footer className="flex-shrink-0 w-full flex flex-col items-center py-[2rem] px-[2rem] relative z-30">
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
                alignItems: "center",
                gap: "32px",
              }}
            >
              <div style={{ display: "flex", gap: "30px" }}>
                <button
                  onClick={() => alert("Leaderboard coming soon!")}
                  className=" rounded-[30px] overflow-hidden shrink-0 object-cover cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    width: "120px", height: "120px",

                    background: 0,
                    border: 0,
                    boxShadow: "0 4px 15px rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-2" style={{ padding: "1rem", height: "100%" }}>
                    <img
                      className="object-contain"
                      style={{ width: "80px", height: "80px" }}
                      alt="Leaderboard"
                      src="/Design Elements/financial success.webp"
                    />
                  </div>
                </button>

                <button
                  onClick={handleLobby}
                  className="rounded-[30px] overflow-hidden shrink-0 object-cover cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    background: 0,
                    border: 0,
                    boxShadow: "0 4px 15px rgba(0, 201, 255, 0.3)",
                    width: "120px",
                    height: "120px",

                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-2" style={{ padding: "1rem", height: "100%" }}>
                    <img
                      className="object-contain"
                      style={{ width: "80px", height: "80px" }}
                      alt="Find Match"
                      src="/Design Elements/hand holding magnifying glass.webp"
                    />
                  </div>
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Chat button clicked, setting isChatOpen to true');
                  setIsChatOpen(true);
                }}
                className=" rounded-[30px] overflow-hidden shrink-0 object-cover cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95 transition-all duration-300"
                style={{
                  background: 0,
                  border: 0,
                  boxShadow: "0 4px 15px rgba(255, 107, 107, 0.3)",
                  width: "120px", height: "120px"

                }}
              >
                <div className="flex flex-col items-center justify-center gap-2" style={{ padding: "1rem", height: "100%" }}>
                  <img
                    className="object-contain"
                    style={{ width: "80px", height: "80px" }}
                    alt="Chat"
                    src="/Design Elements/Satelite.webp"
                  />
                </div>
              </button>
      {/* Chat Overlay */}
      {isChatOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          onClick={(e) => {
            // Close chat if clicking on backdrop
            if (e.target === e.currentTarget) {
              setIsChatOpen(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => {
                console.log('Chat close button clicked');
                setIsChatOpen(false);
              }}
              className="absolute top-2 right-2 text-gray-700 hover:text-red-600 text-2xl font-bold z-10"
              aria-label="Close Chat"
            >
              ×
            </button>
            <Chat />
          </div>
        </div>
      )}
            </div>
          </footer>
        )}

        {/* Coming Soon Popup */}
        {showComingSoon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
              className="bg-black bg-opacity-80 text-white px-8 py-4 rounded-2xl shadow-2xl transform transition-all duration-500 ease-out animate-bounce"
              style={{
                fontFamily: 'Audiowide',
                fontSize: '32px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #FF0080 0%, #7209B7 100%)',
                border: '2px solid #FF0080',
                boxShadow: '0 0 30px rgba(255, 0, 128, 0.5)',
                animation: 'fadeIn 0.5s ease-out, fadeOut 0.5s ease-out 1.5s forwards'
              }}
            >
              <div className="flex items-center gap-3">
                <span>🚀</span>
                <span>COMING SOON!</span>
                <span>🚀</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Navigation Wrapper Component - now just provides content structure
function NavigationWrapper({ 
  children, 
  userGold, 
  onInventory, 
  onFriends, 
  onAccount, 
  onLobby,
  showBackButton = false,
  onBack = null
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-[2rem] py-[1rem] min-h-0">
      {/* Main Content */}
      <main className="w-full max-w-[100rem] flex flex-col items-center justify-center gap-[2rem] py-[2rem] flex-1 min-h-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// Dashboard Panel Component with debug background selection UI
function DashboardPanel({
  userGold,
  gameMode,
  setGameMode,
  betAmount,
  setBetAmount,
  hoveredGameMode,
  setHoveredGameMode,
  onPlayNow,
  onMultiplayer,
  onLobby,
  onInventory,
  onFriends,
  onAccount,
  handleGameModeAction,
  showComingSoonPopup,
  availableBackgrounds,
  displayBackground,
  setDisplayBackground,
  matchBackground,
  setMatchBackground
}) {
  // ...existing code...
  return (
    <NavigationWrapper
      userGold={userGold}
      onInventory={onInventory}
      onFriends={onFriends}
      onAccount={onAccount}
      onLobby={onLobby}
    >
      {/* Debug UI for background selection */}
      <div style={{ display: 'none', margin: '20px 0', padding: '10px', background: '#222', borderRadius: '12px', color: '#fff', maxWidth: '600px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Dashboard Background</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {availableBackgrounds.map(bg => (
            <button
              key={bg.file}
              style={{
                border: displayBackground.file === bg.file ? '2px solid #FFD700' : '1px solid #444',
                borderRadius: '8px',
                padding: '6px 12px',
                background: '#333',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: displayBackground.file === bg.file ? 'bold' : 'normal'
              }}
              onClick={() => setDisplayBackground(bg)}
            >
              {bg.name}
            </button>
          ))}
        </div>
        <h3 style={{ fontWeight: 'bold', margin: '16px 0 8px 0' }}>Match Background</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {availableBackgrounds.map(bg => (
            <button
              key={bg.file + '-match'}
              style={{
                border: matchBackground.file === bg.file ? '2px solid #FFD700' : '1px solid #444',
                borderRadius: '8px',
                padding: '6px 12px',
                background: '#333',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: matchBackground.file === bg.file ? 'bold' : 'normal'
              }}
              onClick={() => setMatchBackground(bg)}
            >
              {bg.name}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#aaa' }}>
          <div>Current Dashboard: <b>{displayBackground.name}</b></div>
          <div>Current Match: <b>{matchBackground.name}</b></div>
        </div>
      </div>
      {/* Game Mode Container */}
      <div className="w-[100%] overflow-hidden flex flex-row items-center justify-center flex-wrap content-center gap-x-[0.687rem] gap-y-[0.625rem]">
        {/* All 6 game mode cards here - keeping existing content */}
        {/* Quick Fire Card */}
        <div
          onMouseEnter={() => setHoveredGameMode('quickfire')}
          onMouseLeave={() => setHoveredGameMode(null)}
          className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
        >
            {/* Game mode card content... keeping original */}
            {hoveredGameMode === 'quickfire' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-[10px] p-[20px] animate-fade-in">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔥 QUICKFIRE LIVE BUTTON CLICKED!');
                    handleGameModeAction('quickfire', 'live');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                     alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    LIVE PLAY
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔥 QUICKFIRE CUSTOM BUTTON CLICKED!');
                    handleGameModeAction('quickfire', 'custom');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                     alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(255, 0, 128, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CUSTOM GAME
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                    }}
                  >
                    QUICK
                    <br />
                    FIRE
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    Speed Over Strategy
                  </div>
                </div>
                <img
                  className="w-[25.256rem] absolute top-[3rem] left-[-2rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[-70deg] transition-all duration-300"
                  alt="Sword"
                  src="/Design Elements/finance startup.webp"
                />
              </>
            )}
          </div>

          {/* Classic Mode Card */}
          <div
            onMouseEnter={() => setHoveredGameMode('classic')}
            onMouseLeave={() => setHoveredGameMode(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-left text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredGameMode === 'classic' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-[10px] p-[20px] animate-fade-in"
              
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('👑 CLASSIC LIVE BUTTON CLICKED!');
                    handleGameModeAction('classic', 'live');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                    alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    LIVE PLAY
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('👑 CLASSIC CUSTOM BUTTON CLICKED!');
                    handleGameModeAction('classic', 'custom');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                    alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(255, 0, 128, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CUSTOM GAME
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    CLASSIC
                    <br />
                    MODE
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    Only One Will Rise
                  </div>
                </div>
                <img
                  className="w-[18.256rem] absolute top-[4rem] left-[-3rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[-2deg] transition-all duration-300"
                  alt="Crown"
                  src="/Design Elements/Crown Mode.webp"
                />
              </>
            )}
          </div>

          {/* Zero Hour Card */}
          <div
            onMouseEnter={() => setHoveredGameMode('zerohour')}
            onMouseLeave={() => setHoveredGameMode(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredGameMode === 'zerohour' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-[10px] p-[20px] animate-fade-in">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('⏰ ZERO HOUR LIVE BUTTON CLICKED!');
                    handleGameModeAction('zerohour', 'live');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                    alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    LIVE PLAY
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('⏰ ZERO HOUR CUSTOM BUTTON CLICKED!');
                    handleGameModeAction('zerohour', 'custom');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                    alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(255, 0, 128, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CUSTOM GAME
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    ZERO
                    <br />
                    HOUR
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    Time Runs Backwards
                  </div>
                </div>
                <img
                  className="w-[22.256rem] absolute top-[1rem] left-[-5rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[0deg] transition-all duration-300"
                  alt="Clock"
                  src="/Design Elements/time out.webp"
                />
              </>
            )}
          </div>

          {/* Last Line Card (Sudden Death) */}
          <div
            onMouseEnter={() => setHoveredGameMode('lastline')}
            onMouseLeave={() => setHoveredGameMode(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredGameMode === 'lastline' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-[10px] p-[20px] animate-fade-in">
          <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('💀 LAST LINE LIVE BUTTON CLICKED!');
                    handleGameModeAction('lastline', 'live');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                     alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    LIVE PLAY
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGameModeAction('lastline', 'custom');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                     alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(255, 0, 128, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CUSTOM GAME
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    LAST
                    <br />
                    LINE
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    One Life, One Shot
                  </div>
                </div>
            <img
                  className="w-[22.256rem] absolute top-[-2rem] left-[-5rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[-2deg] transition-all duration-300"
                  alt="Skull"
                  src="/Design Elements/skull.webp"
            />
              </>
            )}
          </div>

          {/* True Grit Card (Last Stand) */}
          <div
            onMouseEnter={() => setHoveredGameMode('truegrit')}
            onMouseLeave={() => setHoveredGameMode(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredGameMode === 'truegrit' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-[10px] p-[20px] animate-fade-in">
          <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('💪 TRUE GRIT LIVE BUTTON CLICKED!');
                    handleGameModeAction('truegrit', 'live');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                     alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(25, 46, 57, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    LIVE PLAY
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGameModeAction('truegrit', 'custom');
                  }}
                  className="w-full flex flex-col justifyCenter items-center hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-300"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                     alignContent: 'center',
                    justifyContent: 'center',
                    border: 0,
                    boxShadow: '0 4px 15px rgba(255, 0, 128, 0.3)'
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '40px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CUSTOM GAME
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                    }}
                  >
                    TRUE
                    <br />
                    GRIT
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    No Banking, No Mercy
                  </div>
                </div>
                <img
                  className="w-[22.256rem] absolute top-[1rem] left-[-5rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[0deg] transition-all duration-300"
                  alt="Castle"
                  src="/Design Elements/Castle.webp"
                />
              </>
            )}
          </div>

          {/* Tag Team Card */}
          <div
            onClick={showComingSoonPopup}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer transition-all duration-300 opacity-50 grayscale"
            style={{ filter: "grayscale(100%)", opacity: 0.6, cursor: "not-allowed" }}
          >
            <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
              <h2
                className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                style={{
                  color: "#AAA",
                  fontFamily: "Audiowide",
                  fontSize: "64px",
                  fontStyle: "normal",
                  fontWeight: 400,
                  leadingTrim: "both",
                  lineHeight: "60px",
                  textTransform: "uppercase",
                  marginTop: "1rem",
                  marginBottom: "1rem",
                }}
              >
                TAG
                <br />
                TEAM
              </h2>
              <div
                className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                style={{
                  color: "#888",
                  fontFamily: "Montserrat",
                  fontSize: "24px",
                  fontStyle: "normal",
                  fontWeight: 300,
                  leadingTrim: "both",
                  lineHeight: "24px",
                  textTransform: "uppercase",
                  textAlign: "right",
                  opacity: 0.6,
                }}
              >
                Coming Soon
              </div>
            </div>
            <img
              className="w-[20.256rem] absolute top-[-2rem] left-[-2rem] max-h-none object-contain z-[1] opacity-[0.4] rotate-[-90deg] transition-all duration-300"
              alt="Cables Together"
              src="/Design Elements/lost connection.webp"
              style={{ filter: "grayscale(100%)" }}
            />
          </div>
        </div>
    </NavigationWrapper>
  );
}

// Account Settings Panel Component with Game Mode Selector Style
function AccountPanel({ userGold, onBack, onLobby }) {
  const [hoveredSetting, setHoveredSetting] = useState(null);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-[2rem] py-[1rem]">
      <div className="flex-1 flex flex-col items-center justify-center mt-[2rem] mb-[2rem]">
        {/* Settings Container */}
        <div className="w-[100rem] overflow-hidden flex flex-row items-center justifyCenter flex-wrap content-center gap-x-[0.687rem] gap-y-[0.625rem]">
          
          {/* Profile Settings Card */}
          <div
            onMouseEnter={() => setHoveredSetting('profile')}
            onMouseLeave={() => setHoveredSetting(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredSetting === 'profile' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-4 p-8 animate-fade-in">
                <button
                  onClick={() => alert("Profile settings coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    EDIT PROFILE
                  </span>
                </button>
                <button
                  onClick={() => alert("Avatar settings coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CHANGE AVATAR
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    PROFILE
                    <br />
                    SETTINGS
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    Your Identity
                  </div>
                </div>
                <img
                  className="w-[20.256rem] absolute top-[1rem] left-[-2rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[0deg] transition-all duration-300"
                  alt="Profile"
                  src="/Design Elements/Delivery Man.webp"
                />
              </>
            )}
          </div>

          {/* Security Settings Card */}
          <div
            onMouseEnter={() => setHoveredSetting('security')}
            onMouseLeave={() => setHoveredSetting(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredSetting === 'security' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-4 p-8 animate-fade-in">
                <button
                  onClick={() => alert("Password change coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CHANGE PASSWORD
                  </span>
                </button>
                <button
                  onClick={() => alert("2FA settings coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    TWO-FACTOR AUTH
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    SECURITY
                    <br />
                    SETTINGS
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    Stay Protected
                  </div>
                </div>
                <img
                  className="w-[22.256rem] absolute top-[1rem] left-[-3rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[0deg] transition-all duration-300"
                  alt="Security"
                  src="/Design Elements/security.png"
                />
              </>
            )}
          </div>

          {/* Game Preferences Card */}
          <div
            onMouseEnter={() => setHoveredSetting('preferences')}
            onMouseLeave={() => setHoveredSetting(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredSetting === 'preferences' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-4 p-8 animate-fade-in">
                <button
                  onClick={() => alert("Game settings coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    GAME SETTINGS
                  </span>
                </button>
                <button
                  onClick={() => alert("Betting limits coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    BETTING LIMITS
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    GAME
                    <br />
                    PREFS
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    Your Way To Play
                  </div>
                </div>
                <img
                  className="w-[22.256rem] absolute top-[1rem] left-[-3rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[0deg] transition-all duration-300"
                  alt="Preferences"
                  src="/Design Elements/Gear.png"
                />
              </>
            )}
          </div>

          {/* Notifications Card */}
          <div
            onMouseEnter={() => setHoveredSetting('notifications')}
            onMouseLeave={() => setHoveredSetting(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredSetting === 'notifications' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-4 p-8 animate-fade-in">
                <button
                  onClick={() => alert("Email preferences coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    EMAIL SETTINGS
                  </span>
                </button>
                <button
                  onClick={() => alert("Push notifications coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    PUSH ALERTS
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    NOTIFY
                    <br />
                    SETTINGS
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    Stay Informed
                  </div>
                </div>
                <img
                  className="w-[20.256rem] absolute top-[1rem] left-[-2rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[0deg] transition-all duration-300"
                  alt="Notifications"
                  src="/Design Elements/bell.png"
                />
              </>
            )}
          </div>

          {/* Privacy Settings Card */}
          <div
            onMouseEnter={() => setHoveredSetting('privacy')}
            onMouseLeave={() => setHoveredSetting(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredSetting === 'privacy' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-4 p-8 animate-fade-in">
                <button
                  onClick={() => alert("Profile visibility coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    PROFILE VISIBILITY
                  </span>
                </button>
                <button
                  onClick={() => alert("Data settings coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    DATA CONTROL
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    PRIVACY
                    <br />
                    CONTROL
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    Your Data, Your Rules
                  </div>
                </div>
                <img
                  className="w-[20.256rem] absolute top-[-2rem] left-[-2rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[0deg] transition-all duration-300"
                  alt="Privacy"
                  src="/Design Elements/invisible.png"
                />
              </>
            )}
          </div>

          {/* Support & Help Card */}
          <div
            onMouseEnter={() => setHoveredSetting('support')}
            onMouseLeave={() => setHoveredSetting(null)}
            className="h-[15.625rem] w-[31.25rem] rounded-[30px] [background:linear-gradient(rgba(37,_37,_37,_0.12),_rgba(37,_37,_37,_0.12)),_linear-gradient(242.59deg,_#192e39_30%,_rgba(153,_153,_153,_0))] overflow-hidden shrink-0 flex flex-row items-center justify-start relative text-right text-[4rem] text-gainsboro font-audiowide cursor-pointer hover:scale-105 transition-all duration-300"
          >
            {hoveredSetting === 'support' ? (
              <div className="w-full h-full flex flex-col justifyCenter items-center gap-4 p-8 animate-fade-in">
                <button
                  onClick={() => alert("Contact support coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #192E39 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CONTACT SUPPORT
                  </span>
                </button>
                <button
                  onClick={() => alert("FAQ coming soon!")}
                  className="w-full flex flex-col justifyCenter items-center transition-all duration-300 hover:scale-105"
                  style={{
                    borderRadius: '30px',
                    background: 'linear-gradient(243deg, #FF0080 25.17%, rgba(153, 153, 153, 0.00) 109.89%)',
                    height: '100px',
                  }}
                >
                  <span
                    style={{
                      color: '#E2E2E2',
                      textAlign: 'center',
                      fontFamily: 'Audiowide',
                      fontSize: '28px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '36px',
                      textTransform: 'uppercase',
                    }}
                  >
                    VIEW FAQ
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[100%] relative flex-1 flex flex-col items-end px-[2.25rem] z-[0] transition-all duration-300">
                  <h2
                    className="m-0 self-stretch relative text-[length:inherit] text-white uppercase font-normal font-[inherit]"
                    style={{
                      color: "#FFF",
                      fontFamily: "Audiowide",
                      fontSize: "64px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      leadingTrim: "both",
                      lineHeight: "60px",
                      textTransform: "uppercase",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    SUPPORT
                    <br />
                    & HELP
                  </h2>
                  <div
                    className="w-[50%] relative text-[1.5rem] font-light font-rubik text-gray inline-block"
                    style={{
                      color: "#FFF",
                      fontFamily: "Montserrat",
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 300,
                      leadingTrim: "both",
                      lineHeight: "24px",
                      textTransform: "uppercase",
                      textAlign: "right",
                      opacity: 0.8,
                    }}
                  >
                    We're Here For You
                  </div>
                </div>
                <img
                  className="w-[20.256rem] absolute top-[-2rem] left-[-2rem] max-h-none object-contain z-[1] opacity-[0.8] rotate-[0deg] transition-all duration-300"
                  alt="Support"
                  src="/Design Elements/chat icon.png"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WrappedSinglePageDashboard() {
  return (
    <FriendNotificationProvider>
      <SinglePageDashboard />
    </FriendNotificationProvider>
  );
}
