import  { useState, useEffect, useCallback, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useBackground } from '../context/BackgroundContext';
import { usePlayerBackground } from '../context/PlayerBackgroundContext';
import { useGameState } from '../hooks/useGameState';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
// ...existing code...
import { GAME_ACTIONS, shouldShowRoundCounter } from "../utils/gameLogic";
import {
  getUserEquippedBackground,
  loadUserData,
  loadUserDataFirestore,
  getUserEquippedBackgroundFirestore,
  getUserEquippedPlayerBackgroundFirestore,
  backgroundsDB,
} from "../utils/inventoryLogic";
import {
  gameInputValidator,
  requireEmailVerification,
  validateMultiplayerAccess,
} from "../utils/antiCheat";
import ConnectionStatus from "./ConnectionStatus";
import SlotMachineDice from "./SlotMachineDice";
import ScoreAnticipation from "./ScoreAnticipation";
import EnhancedButton from "./EnhancedButton";

import { style } from "framer-motion/client";
import { useAuth } from '../context/AuthContext';

// Enhanced hook for slot machine dice animation
const useSlotMachineDiceAnimation = () => {
  const [dice, setDice] = useState([null, null]);
  const [isRolling, setIsRolling] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('idle'); // 'idle', 'spinning', 'celebrating'
  const [celebrationLevel, setCelebrationLevel] = useState('normal');
  const [currentlyAnimating, setCurrentlyAnimating] = useState([false, false]);
  const completionCount = useRef(0);

  const getCelebrationLevel = (roll) => {
    const [d1, d2] = roll;
    if (d1 === 1 && d2 === 1) return 'epic'; // Double 1s
    if (d1 === 6 && d2 === 6) return 'epic'; // Double 6s
    if ((d1 === 1 && d2 !== 1) || (d1 !== 1 && d2 === 1)) return 'bust';
    if (d1 === d2) return 'double';
    if (d1 + d2 >= 9) return 'good';
    return 'normal';
  };

  const getGlowColors = (level) => {
    switch (level) {
      case 'epic': return ['gold', 'gold'];
      case 'double': return ['purple', 'purple'];
      case 'bust': return ['red', 'red'];
      case 'good': return ['blue', 'white'];
      default: return ['white', 'white'];
    }
  };

  const handleDiceAnimationComplete = useCallback((diceIndex) => {
    completionCount.current++;
    
    setCurrentlyAnimating(prev => {
      const newState = [...prev];
      newState[diceIndex] = false;
      return newState;
    });

    if (completionCount.current >= 2) {
      setTimeout(() => {
        setAnimationPhase('celebrating');
        setTimeout(() => {
          setAnimationPhase('idle');
          setIsRolling(false);
          completionCount.current = 0;
        }, 1200);
      }, 300);
    }
  }, []);

  const animateRoll = useCallback(async (finalRoll, onComplete) => {
    console.log("DiceGameNewExact: animateRoll called with:", finalRoll, "isRolling:", isRolling);
    console.log("DiceGameNewExact: Current dice state:", dice);
    console.log("DiceGameNewExact: Current currentlyAnimating state:", currentlyAnimating);
    
    if (isRolling) return;
    
    setIsRolling(true);
    setAnimationPhase('spinning');
    setCurrentlyAnimating([true, true]);
    
    const level = getCelebrationLevel(finalRoll);
    setCelebrationLevel(level);
    setDice(finalRoll);
    
    console.log("DiceGameNewExact: Set dice to:", finalRoll, "celebration level:", level);
    console.log("DiceGameNewExact: Set currentlyAnimating to [true, true]");
    
    completionCount.current = 0;
    
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 5000); // Safety timeout
  }, [isRolling, getCelebrationLevel]);

  return { 
    dice, 
    isRolling, 
    animationPhase,
    celebrationLevel,
    currentlyAnimating,
    glowColors: getGlowColors(celebrationLevel),
    animateRoll, 
    handleDiceAnimationComplete 
  };
};

export default function Match({
  onBack,
  multiplayerGameId = null,
  isMultiplayer = false,
  onGoldUpdate = null,
  refreshKey = 0,
  gameMode = "classic",
}) {
  const { currentUser } = useAuth();
  const { setGameId, openChat, closeChat } = useChat();
  // Use DisplayBackgroundEquip and MatchBackgroundEquip from context for backgrounds
  const { DisplayBackgroundEquip, MatchBackgroundEquip } = useBackground();
  // Use equippedPlayerBackground from PlayerBackgroundContext
  const { equippedPlayerBackground } = require('../context/PlayerBackgroundContext').usePlayerBackground();

  // Debug logging
  console.log("Match: Component mounted with props:", {
    multiplayerGameId,
    isMultiplayer,
    gameMode,
    refreshKey,
    currentUser: currentUser?.uid,
  });

  // Always call both hooks to avoid React hooks rule violations
  const singlePlayerResult = useGameState(currentUser?.uid, gameMode);
  const multiplayerResult = useMultiplayerGame(
    isMultiplayer ? multiplayerGameId : null
  );

  console.log("Match: Hook results:", {
    singlePlayerLoading: singlePlayerResult.loading,
    singlePlayerError: singlePlayerResult.error,
    singlePlayerState: singlePlayerResult.state ? "exists" : "null",
    multiplayerLoading: multiplayerResult.loading,
    multiplayerError: multiplayerResult.error,
    multiplayerGameSession: multiplayerResult.gameSession ? "exists" : "null",
    multiplayerGameState: multiplayerResult.gameState ? "exists" : "null",
  });

  // Extract all values from the appropriate hook
  let state, dispatch, loading, error;

  if (isMultiplayer) {
    state = multiplayerResult.gameState; // Use gameState from multiplayer hook
    dispatch = null; // Multiplayer doesn't use dispatch directly
    loading = multiplayerResult.loading;
    error = multiplayerResult.error;
  } else {
    state = singlePlayerResult.state;
    dispatch = singlePlayerResult.dispatch;
    loading = singlePlayerResult.loading;
    error = singlePlayerResult.error;
  }

  // For multiplayer, extract additional multiplayer-specific values
  const { gameSession, isMyTurn, playerIndex, makeMove, leaveGame } =
    isMultiplayer ? multiplayerResult : {};

  // Use gameSubMode from session for multiplayer, fallback to gameMode prop
  const actualGameMode = isMultiplayer && gameSession?.gameSubMode 
    ? gameSession.gameSubMode 
    : gameMode;

  console.log("Match: Game mode resolution:", {
    isMultiplayer,
    gameModeProp: gameMode,
    sessionGameSubMode: gameSession?.gameSubMode,
    actualGameMode
  });

  // Enhanced dice animation
  const { 
    dice, 
    isRolling, 
    animationPhase,
    celebrationLevel,
    currentlyAnimating,
    glowColors,
    animateRoll, 
    handleDiceAnimationComplete 
  } = useSlotMachineDiceAnimation();

  // State for UI elements
  // Multiplayer: randomly assign odd/even chooser when 2 players join and pregame
  useEffect(() => {
    if (
      isMultiplayer &&
      state?.isPregame &&
      state?.players?.length === 2 &&
      state?.chooserPlayerIndex == null &&
      makeMove
    ) {
      // Randomly assign chooser (0 or 1)
      const chooserIndex = Math.floor(Math.random() * 2);
      makeMove('ASSIGN_ODD_EVEN_CHOOSER', { chooserPlayerIndex: chooserIndex });
    }
  }, [isMultiplayer, state?.isPregame, state?.players, state?.chooserPlayerIndex, makeMove]);

  // Enhanced: Force exit pregame if stuck for more than 5 seconds (multiplayer only)
  useEffect(() => {
    if (isMultiplayer && state?.isPregame && state?.players?.length === 2) {
      // If chooser not assigned after 5 seconds, force assign
      if (state?.chooserPlayerIndex == null && makeMove) {
        const chooserIndex = Math.floor(Math.random() * 2);
        setTimeout(() => {
          if (state?.isPregame && state?.chooserPlayerIndex == null) {
            makeMove('ASSIGN_ODD_EVEN_CHOOSER', { chooserPlayerIndex: chooserIndex });
          }
        }, 5000);
      }
      // If chooser assigned but not resolved after 10 seconds, force resolve
      if (state?.chooserPlayerIndex != null && typeof state?.oddEvenDieValue !== 'number' && makeMove) {
        setTimeout(() => {
          if (state?.isPregame && state?.chooserPlayerIndex != null && typeof state?.oddEvenDieValue !== 'number') {
            // Randomly pick odd/even
            const choice = Math.random() < 0.5 ? 'CHOOSE_ODD' : 'CHOOSE_EVEN';
            const dieValue = Math.floor(Math.random() * 6) + 1;
            const isOdd = dieValue % 2 === 1;
            const playerChoseOdd = choice === 'CHOOSE_ODD';
            let firstPlayerIndex;
            if ((isOdd && playerChoseOdd) || (!isOdd && !playerChoseOdd)) {
              firstPlayerIndex = state?.chooserPlayerIndex;
            } else {
              firstPlayerIndex = 1 - state?.chooserPlayerIndex;
            }
            makeMove('RESOLVE_ODD_EVEN_CHOICE', { dieValue, firstPlayerIndex });
          }
        }, 10000);
      }
    }
  }, [isMultiplayer, state?.isPregame, state?.players, state?.chooserPlayerIndex, state?.oddEvenDieValue, makeMove]);
  const [showOddEven, setShowOddEven] = useState(false);
  const [flashColor, setFlashColor] = useState("");
  const [roundWinFlash, setRoundWinFlash] = useState([false, false]);
  // Always show current user's background on left, opponent's on right
  const [playerBackgrounds, setPlayerBackgrounds] = useState([null, null]);
  const [currentWins, setCurrentWins] = useState([]);
  const [diceGlow, setDiceGlow] = useState("");
  const [backgroundShift, setBackgroundShift] = useState(false);
  const carouselRef = useRef(null);

  // Debug current game state
  console.log("DiceGameNewExact: Current game state:", {
    isPregame: state?.isPregame,
    gamePhase: state?.gamePhase,
    currentPlayerIndex: state?.currentPlayerIndex,
    isMultiplayer,
    gameMode: actualGameMode,
    winner: state?.winner,
    isRolling
  });

  // Initialize single-player game state if needed
  useEffect(() => {
    if (!isMultiplayer && !state && !loading && dispatch) {
      console.log("DiceGameNewExact: Initializing single-player game state with mode:", actualGameMode);
      console.log("DiceGameNewExact: Current state before initialization:", state);
      dispatch({ type: GAME_ACTIONS.NEW_GAME, gameMode: actualGameMode });
    }
  }, [isMultiplayer, state, loading, dispatch, actualGameMode]);

  // Set game ID for multiplayer chat
  useEffect(() => {
    if (isMultiplayer && multiplayerGameId && setGameId) {
      setGameId(multiplayerGameId);
    }
  }, [isMultiplayer, multiplayerGameId, setGameId]);

  // Check if Tag Team mode
  const isTagTeam = actualGameMode === "tagteam";

  // Player data - Modified to always show current user on left side
  const getPlayerName = (playerIndex) => {
    if (isMultiplayer && gameSession) {
      // Player 0 (left side) should always be the current user
      // Player 1 (right side) should always be the opponent
      if (playerIndex === 0) {
        // Left side = current user
        if (gameSession.host?.userId === currentUser?.uid) {
          return gameSession.host?.displayName || "Player 1";
        } else {
          return gameSession.guest?.displayName || "Player 1";
        }
      } else {
        // Right side = opponent
        if (gameSession.host?.userId === currentUser?.uid) {
          return gameSession.guest?.displayName || "Player 2";
        } else {
          return gameSession.host?.displayName || "Player 2";
        }
      }
    }

    if (actualGameMode === "tagteam") {
      const names = ["You", "Partner", "Computer 1", "Computer 2"];
      return names[playerIndex] || `Player ${playerIndex + 1}`;
    }

    return playerIndex === 0
      ? currentUser?.email?.split("@")[0] || "Player"
      : "Computer";
  };

  const getIsCurrentPlayer = (playerIndex) => {
    if (!isMultiplayer) return playerIndex === 0;
    if (!gameSession) return false;

    // Check if the given playerIndex corresponds to the current user
    if (gameSession.host?.userId === currentUser?.uid) {
      // Current user is host (gameStateIndex 0)
      return playerIndex === 0;
    } else {
      // Current user is guest (gameStateIndex 1) 
      return playerIndex === 1;
    }
  };

  // Helper functions to map between display indices and game state indices
  const getDisplayIndexFromGameStateIndex = (gameStateIndex) => {
    if (!isMultiplayer || !gameSession) return gameStateIndex;
    
    // If current user is host (gameStateIndex 0), they display as 0 (left)
    // If current user is guest (gameStateIndex 1), they display as 0 (left)
    if (gameSession.host?.userId === currentUser?.uid) {
      return gameStateIndex; // Host: 0->0, Guest: 1->1
    } else {
      return gameStateIndex === 0 ? 1 : 0; // Host: 0->1, Guest: 1->0
    }
  };

  const getGameStateIndexFromDisplayIndex = (displayIndex) => {
    if (!isMultiplayer || !gameSession) return displayIndex;
    
    if (gameSession.host?.userId === currentUser?.uid) {
      return displayIndex; // Host: 0->0, Guest: 1->1
    } else {
      return displayIndex === 0 ? 1 : 0; // Current user: 0->1, Opponent: 1->0
    }
  };

  // Helper functions to get scores from the correct player perspective
  const getPlayerScore = (displayIndex) => {
    if (!isMultiplayer || !gameSession || !state?.playerTotals) return 0;
    
    const gameStateIndex = getGameStateIndexFromDisplayIndex(displayIndex);
    return state.playerTotals[gameStateIndex] || 0;
  };

  const getCurrentPlayerScore = () => {
    if (!isMultiplayer) return state?.playerTotals?.[0] || 0;
    return getPlayerScore(0); // Current player is always displayed on the left (index 0)
  };

  const getOpponentScore = () => {
    if (!isMultiplayer) return state?.playerTotals?.[1] || 0;
    return getPlayerScore(1); // Opponent is always displayed on the right (index 1)
  };

  // Helper function to check if flash should be applied to a display index
  const shouldFlashPlayer = (displayIndex) => {
    if (!roundWinFlash || state?.lastWinnerIndex === undefined) return false;
    
    // Convert the game state winner index to display index
    const winnerDisplayIndex = getDisplayIndexFromGameStateIndex(state.lastWinnerIndex);
    return winnerDisplayIndex === displayIndex && roundWinFlash[state.lastWinnerIndex];
  };

  // Helper function to check if a display position is the current player
  const isCurrentPlayerAtDisplay = (displayIndex) => {
    if (!isMultiplayer || state?.currentPlayerIndex === undefined) {
      return displayIndex === (state?.currentPlayerIndex || 0);
    }
    
    // Convert game state current player index to display index
    const currentPlayerDisplayIndex = getDisplayIndexFromGameStateIndex(state.currentPlayerIndex);
    return currentPlayerDisplayIndex === displayIndex;
  };

  // Load player backgrounds
  useEffect(() => {
    // Skip loading if we're in multiplayer but don't have complete game session data
    if (isMultiplayer && (!gameSession?.host?.userId || !gameSession?.guest?.userId)) {
      console.log('DiceGameNewExact: Waiting for complete game session before loading backgrounds');
      console.log('DiceGameNewExact: Host userId:', gameSession?.host?.userId);
      console.log('DiceGameNewExact: Guest userId:', gameSession?.guest?.userId);
      return;
    }

    let isMounted = true;
    const MAX_RETRIES = 4;
    const RETRY_DELAY = 700; // ms
    const loadPlayerBackgrounds = async (retry = 0) => {
      try {
        console.log('DiceGameNewExact: loadPlayerBackgrounds called');
        console.log('DiceGameNewExact: currentUser?.uid:', currentUser?.uid);
        console.log('DiceGameNewExact: equippedPlayerBackground:', equippedPlayerBackground);
        const numPlayers = actualGameMode === "tagteam" ? 4 : 2;
        const newBackgrounds = {};

        // For the current user (player 0), use their equipped player background
        if (currentUser?.uid && equippedPlayerBackground) {
          console.log('DiceGameNewExact: Using equipped player background for user:', equippedPlayerBackground);
          newBackgrounds[0] = equippedPlayerBackground;
        } else {
          console.log('DiceGameNewExact: Using fallback background for player 0');
          newBackgrounds[0] = {
            url: "/backgrounds/Relax.png",
            isGradient: false,
            isVideo: false,
            rarity: "Common",
          };
        }

        // For other players
        for (let i = 1; i < numPlayers; i++) {
          if (isMultiplayer && gameSession && i === 1) {
            // Player 1 is the opponent - load their background
            let opponentUserId;
            console.log('DiceGameNewExact: Determining opponent for player 1');
            console.log('DiceGameNewExact: Current user ID:', currentUser?.uid);
            console.log('DiceGameNewExact: Host user ID:', gameSession.host?.userId);
            console.log('DiceGameNewExact: Guest user ID:', gameSession.guest?.userId);
            if (gameSession.host?.userId === currentUser?.uid) {
              opponentUserId = gameSession.guest?.userId;
              console.log('DiceGameNewExact: Current user is host, opponent is guest:', opponentUserId);
            } else {
              opponentUserId = gameSession.host?.userId;
              console.log('DiceGameNewExact: Current user is guest, opponent is host:', opponentUserId);
            }
            console.log('DiceGameNewExact: Final opponent user ID:', opponentUserId);
            if (opponentUserId) {
              try {
                console.log(`DiceGameNewExact: [Attempt ${retry+1}] Loading opponent background for user:`, opponentUserId);
                await loadUserDataFirestore(opponentUserId);
                const opponentBackground = await getUserEquippedPlayerBackgroundFirestore(opponentUserId);
                console.log('DiceGameNewExact: Raw opponent background result:', opponentBackground);
                if (isMounted && opponentBackground && (opponentBackground.url || opponentBackground.file)) {
                  newBackgrounds[i] = {
                    ...opponentBackground,
                    isGradient: opponentBackground.isGradient || false,
                    isVideo: opponentBackground.isVideo || false,
                    rarity: opponentBackground.rarity || "Common"
                  };
                  console.log('DiceGameNewExact: Successfully set opponent background:', newBackgrounds[i]);
                } else if (retry < MAX_RETRIES) {
                  console.warn(`DiceGameNewExact: Opponent background not found, retrying in ${RETRY_DELAY}ms... (Attempt ${retry+2})`);
                  setTimeout(() => loadPlayerBackgrounds(retry + 1), RETRY_DELAY);
                  return;
                } else {
                  console.error('DiceGameNewExact: Failed to load opponent background after retries, using fallback.');
                  newBackgrounds[i] = {
                    url: "/backgrounds/Long Road Ahead.jpg",
                    isGradient: false,
                    isVideo: false,
                    rarity: "Epic",
                  };
                }
              } catch (error) {
                console.error('DiceGameNewExact: Error loading opponent background:', error);
                if (retry < MAX_RETRIES) {
                  setTimeout(() => loadPlayerBackgrounds(retry + 1), RETRY_DELAY);
                  return;
                } else {
                  newBackgrounds[i] = {
                    url: "/backgrounds/Long Road Ahead.jpg",
                    isGradient: false,
                    isVideo: false,
                    rarity: "Epic",
                  };
                }
              }
            } else {
              newBackgrounds[i] = {
                url: "/backgrounds/Long Road Ahead.jpg",
                isGradient: false,
                isVideo: false,
                rarity: "Epic",
              };
            }
          } else {
            newBackgrounds[i] = {
              url: "/backgrounds/Relax.png",
              isGradient: false,
              isVideo: false,
              rarity: "Common",
            };
          }
        }

        for (let i = 0; i < numPlayers; i++) {
          if (!newBackgrounds[i] || !newBackgrounds[i].url) {
            console.warn(`DiceGameNewExact: Player ${i} background is invalid, setting fallback`);
            newBackgrounds[i] = {
              url: i === 0 ? "/backgrounds/Relax.png" : "/backgrounds/Long Road Ahead.jpg",
              isGradient: false,
              isVideo: false,
              rarity: i === 0 ? "Common" : "Epic",
            };
          }
        }

        setPlayerBackgrounds(newBackgrounds);
        console.log(
          "DiceGameNewExact: Final loaded player backgrounds:",
          newBackgrounds
        );
        console.log("DiceGameNewExact: Player 0 background:", newBackgrounds[0]);
        console.log("DiceGameNewExact: Player 1 background:", newBackgrounds[1]);
        console.log("DiceGameNewExact: Player 1 background URL:", newBackgrounds[1]?.url);
        console.log("DiceGameNewExact: Is multiplayer:", isMultiplayer);
        console.log("DiceGameNewExact: Game session:", gameSession ? "exists" : "null");
        if (newBackgrounds[1]?.url) {
          console.log("DiceGameNewExact: Opponent background URL set to:", newBackgrounds[1].url);
        } else {
          console.warn("DiceGameNewExact: WARNING - No opponent background URL!");
        }
      } catch (error) {
        console.error("Error loading player backgrounds:", error);
        const numPlayers = actualGameMode === "tagteam" ? 4 : 2;
        const fallbackBg = {
          url: "/backgrounds/Relax.png",
          isGradient: false,
          isVideo: false,
          rarity: "Common",
        };
        const fallbackBackgrounds = {};
        for (let i = 0; i < numPlayers; i++) {
          fallbackBackgrounds[i] = fallbackBg;
        }
        setPlayerBackgrounds(fallbackBackgrounds);
        console.log(
          "DiceGameNewExact: Using fallback backgrounds:",
          fallbackBackgrounds
        );
      }
    };
    loadPlayerBackgrounds();
    return () => { isMounted = false; };
  }, [isMultiplayer, gameSession, currentUser?.uid, actualGameMode, equippedPlayerBackground]);

  // Handle background shift animation on button clicks
  const triggerBackgroundShift = useCallback(() => {
    setBackgroundShift(true);
    setTimeout(() => setBackgroundShift(false), 800);
  }, []);

  // Handle dice roll
  const handleRoll = useCallback(async () => {
    try {
      // Trigger background shift
      triggerBackgroundShift();

      // Validate user permissions
      if (!gameInputValidator.validateUserPermissions(currentUser)) {
        console.error("User permissions validation failed");
        return;
      }

      // Validate action
      if (
        !gameInputValidator.validateGameAction(
          GAME_ACTIONS.ROLL,
          state,
          isMultiplayer,
          isMyTurn
        )
      ) {
        console.error("Roll action validation failed");
        return;
      }

      if (state?.winner || isRolling || state?.isPregame) return;
      if (isMultiplayer && !isMyTurn) return;
      if (
        actualGameMode === "laststand" &&
        state?.playersFinished?.[
          isMultiplayer
            ? playerIndex // Use actual game state index for playersFinished
            : state?.currentPlayerIndex
        ]
      )
        return;

      const roll = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ];

      // Validate dice roll
      if (!gameInputValidator.validateDiceRoll(roll)) {
        console.error("Invalid dice roll generated");
        return;
      }

      if (isMultiplayer) {
        // Validate multiplayer access
        try {
          validateMultiplayerAccess(currentUser);
        } catch (error) {
          console.error("Multiplayer access validation failed:", error);
          return;
        }

        // For multiplayer, send the move immediately and let the subscription handle the animation
        try {
          console.log(
            "DiceGameNewExact: Making multiplayer roll move with:",
            roll
          );
          await makeMove(GAME_ACTIONS.ROLL, { roll });
          // Don't animate here - let the state update trigger the animation
        } catch (error) {
          console.error("Error making multiplayer roll:", error);
        }
      } else {
        // For single player, animate then dispatch
        await animateRoll(roll, () => {
          dispatch({ type: GAME_ACTIONS.ROLL, roll });
        });
      }
    } catch (error) {
      console.error("Error in handleRoll:", error);
    }
  }, [
    triggerBackgroundShift,
    state?.winner,
    isRolling,
    state?.isPregame,
    isMultiplayer,
    isMyTurn,
    actualGameMode,
    state?.playersFinished,
    getIsCurrentPlayer,
    state?.currentPlayerIndex,
    animateRoll,
    dispatch,
    makeMove,
    currentUser,
  ]);

  // Handle banking
  const handleBank = useCallback(async () => {
    try {
      // Trigger background shift
      triggerBackgroundShift();
      
      // Set white glow for banking
      setDiceGlow("white");
      setTimeout(() => setDiceGlow(""), 2000);

      // Validate user permissions
      if (!gameInputValidator.validateUserPermissions(currentUser)) {
        console.error("User permissions validation failed");
        return;
      }

      // Validate action
      if (
        !gameInputValidator.validateGameAction(
          GAME_ACTIONS.BANK,
          state,
          isMultiplayer,
          isMyTurn
        )
      ) {
        console.error("Bank action validation failed");
        return;
      }

      if (isRolling || state?.roundPoints === 0 || state?.isPregame)
        return;
      if (isMultiplayer && !isMyTurn) return;
      if (
        actualGameMode === "laststand" &&
        state?.playersFinished?.[
          isMultiplayer
            ? playerIndex // Use actual game state index for playersFinished
            : state?.currentPlayerIndex
        ]
      )
        return;

      if (isMultiplayer) {
        // Validate multiplayer access
        try {
          validateMultiplayerAccess(currentUser);
        } catch (error) {
          console.error("Multiplayer access validation failed:", error);
          return;
        }

        try {
          console.log("DiceGameNewExact: Making multiplayer bank move");
          await makeMove(GAME_ACTIONS.BANK);
        } catch (error) {
          console.error("Error making multiplayer bank:", error);
        }
      } else {
        dispatch({ type: GAME_ACTIONS.BANK });
      }
    } catch (error) {
      console.error("Error in handleBank:", error);
    }
  }, [
    triggerBackgroundShift,
    isRolling,
    state?.roundPoints,
    state?.isPregame,
    isMultiplayer,
    isMyTurn,
    actualGameMode,
    state?.playersFinished,
    getIsCurrentPlayer,
    state?.currentPlayerIndex,
    dispatch,
    makeMove,
    currentUser,
  ]);

  // Handle odd/even choice
  const handleOddEven = useCallback(
    async (choice) => {
      try {
        // Debug: log when function is called and key values
        console.log('handleOddEven called!', {
          choice,
          isMultiplayer,
          chooserPlayerIndex: state?.chooserPlayerIndex,
          playerIndex,
          isPregame: state?.isPregame,
          isRolling,
          winner: state?.winner
        });
        // Only allow the assigned chooser to pick in multiplayer pregame
        if (
          isMultiplayer &&
          (state?.chooserPlayerIndex !== playerIndex || !state?.isPregame)
        ) {
          console.log('handleOddEven: Not allowed to pick (chooserPlayerIndex mismatch or not pregame)', {
            chooserPlayerIndex: state?.chooserPlayerIndex,
            playerIndex,
            isPregame: state?.isPregame
          });
          return;
        }
        if (isRolling) {
          console.log('handleOddEven: Ignored because isRolling is true');
          return;
        }
        // Roll a single die
        // Pregame state should only end after this roll is resolved
        // Set rolling state for UI feedback
        if (isMultiplayer && makeMove) {
          // Set rolling state for UI feedback
          // (optional: could use a local state for animation)
        }
        const dieValue = Math.floor(Math.random() * 6) + 1;
        const isOdd = dieValue % 2 === 1;
        const playerChoseOdd = choice === "CHOOSE_ODD";
        let firstPlayerIndex;
        console.log('handleOddEven: Die rolled', { dieValue, isOdd, playerChoseOdd });
        if ((isOdd && playerChoseOdd) || (!isOdd && !playerChoseOdd)) {
          firstPlayerIndex = playerIndex;
          console.log('handleOddEven: Player wins odd/even pick', { firstPlayerIndex });
        } else {
          firstPlayerIndex = 1 - playerIndex;
          console.log('handleOddEven: Player loses odd/even pick', { firstPlayerIndex });
        }
        // Multiplayer: send move to server and only exit pregame after Firestore sync
        if (isMultiplayer && makeMove) {
          console.log('handleOddEven: Sending move to server', { dieValue, firstPlayerIndex });
          await makeMove("RESOLVE_ODD_EVEN_CHOICE", { dieValue, firstPlayerIndex });
          // Pregame state will end after Firestore sync updates state
        } else if (dispatch) {
          console.log('handleOddEven: Dispatching action', { dieValue, firstPlayerIndex });
          dispatch({ type: "RESOLVE_ODD_EVEN_CHOICE", dieValue, firstPlayerIndex });
          // After resolving, update local state to start the match
          dispatch({
            type: "START_MATCH",
            currentPlayerIndex: firstPlayerIndex,
            isPregame: false,
            chooserPlayerIndex: null,
            oddEvenDieValue: dieValue
          });
        }
      } catch (error) {
        console.error("Error in handleOddEven:", error);
      }
    }, [isMultiplayer, state?.chooserPlayerIndex, state?.isPregame, playerIndex, isRolling, makeMove, dispatch]);

  // Handle new game
  const handleNewGame = useCallback(() => {
    if (isMultiplayer) {
      if (leaveGame) leaveGame();
      onBack();
    } else {
      dispatch({ type: GAME_ACTIONS.NEW_GAME });
    }
  }, [isMultiplayer, leaveGame, onBack, dispatch]);

  // Handle chat toggle
  const handleChatToggle = useCallback(() => {
    if (isMultiplayer && multiplayerGameId) {
      setGameId(multiplayerGameId);
      openChat("game");
    } else {
      openChat("general");
    }
  }, [isMultiplayer, multiplayerGameId, setGameId, openChat]);

  // Check when to show odd/even overlay - No longer needed since we use buttons
  useEffect(() => {
    // Multiplayer: always show current user's background on left, opponent's on right
    if (isMultiplayer && gameSession && currentUser) {
      let leftBg = null;
      let rightBg = null;
      // If current user is host, left is host, right is guest
      if (gameSession.host?.userId === currentUser.uid) {
        leftBg = equippedPlayerBackground;
        rightBg = gameSession.guest?.equippedPlayerBackground || null;
      } else {
        // Current user is guest
        leftBg = equippedPlayerBackground;
        rightBg = gameSession.host?.equippedPlayerBackground || null;
      }
      setPlayerBackgrounds([leftBg, rightBg]);
    } else {
      // Single player: just use equippedPlayerBackground for left
      setPlayerBackgrounds([equippedPlayerBackground, null]);
    }
  }, [isMultiplayer, gameSession, currentUser?.uid, equippedPlayerBackground]);

  // Flash effect for round win
  useEffect(() => {
    if (state?.lastWinnerIndex !== undefined && state?.lastWinnerIndex !== null) {
      setRoundWinFlash((prev) => {
        const newFlash = [...prev];
        newFlash[state.lastWinnerIndex] = true;
        return newFlash;
      });

      setTimeout(() => {
        setFlashColor("");
        setRoundWinFlash([false, false]);
      }, 600);
    }
  }, [state?.lastWinnerIndex]);

  // Flash effect for "out" (single 1 roll)
  useEffect(() => {
    // Only trigger if state and lastRoll exist
    if (!state?.lastRoll || !Array.isArray(state.lastRoll)) return;
    // Only one die is 1, the other is not 1
    const [d1, d2] = state.lastRoll;
    // Find which player just rolled (currentPlayerIndex before update)
    // If roundPoints just went to 0, and one die is 1 and the other is not 1
    if (
      ((d1 === 1 && d2 !== 1) || (d2 === 1 && d1 !== 1)) &&
      state.roundPoints === 0 &&
      !state.winner &&
      !state.isPregame
    ) {
      setFlashColor("red");
      setTimeout(() => setFlashColor(""), 400);
    }
  }, [state?.lastRoll, state?.roundPoints, state?.winner, state?.isPregame]);

  // Store last roll reference
  const lastRollRef = useRef("");

  // Handle real-time dice updates for multiplayer
  useEffect(() => {
    if (!isMultiplayer || !state?.lastRoll) return;

    // Only animate if this is a new roll (compare with previous state)
    const currentRollString = JSON.stringify(state.lastRoll);

    if (
      currentRollString !== lastRollRef.current &&
      state.lastRoll &&
      state.lastRoll[0] &&
      state.lastRoll[1]
    ) {
      console.log(
        "DiceGameNewExact: Animating multiplayer dice roll:",
        state.lastRoll
      );
      animateRoll(state.lastRoll, () => {
        // Animation complete
      });
      lastRollRef.current = currentRollString;
    }
  }, [isMultiplayer, state?.lastRoll, animateRoll]);

  // Handle enhanced dice glow effects based on roll results
  useEffect(() => {
    if (dice[0] !== null && dice[1] !== null && animationPhase === 'celebrating') {
      const dice1 = dice[0];
      const dice2 = dice[1];
      
      // Clear any existing glow
      setDiceGlow("");
      
      // Set glow based on dice combination with enhanced effects
      if (dice1 === 1 && dice2 === 1) {
        // Double 1s - epic gold glow
        setDiceGlow("gold");
        setTimeout(() => setDiceGlow(""), 4000);
      } else if (dice1 === 6 && dice2 === 6) {
        // Double 6s - epic red glow  
        setDiceGlow("red");
        setTimeout(() => setDiceGlow(""), 4000);
      } else if (dice1 === 1 || dice2 === 1) {
        // Any 1 (bust) - warning red glow
        setDiceGlow("red");
        setTimeout(() => setDiceGlow(""), 3000);
      } else if (dice1 === dice2) {
        // Any double - purple glow
        setDiceGlow("purple");
        setTimeout(() => setDiceGlow(""), 3000);
      } else if (dice1 + dice2 >= 9) {
        // High roll - blue glow
        setDiceGlow("blue");
        setTimeout(() => setDiceGlow(""), 2500);
      } else {
        // Normal roll - white glow
        setDiceGlow("white");
        setTimeout(() => setDiceGlow(""), 2000);
      }
    }
  }, [dice, animationPhase]);

  // Debug logging for game mode
  console.log("DiceGameNewExact: Game state check:", {
    gameMode: state?.gameMode,
    gameModeConfig: state?.gameModeConfig,
    targetScore: state?.targetScore,
    targetRounds: state?.targetRounds,
    shouldShowRoundCounter: state ? shouldShowRoundCounter(state) : "no state",
    roundsWon: state?.roundsWon,
    playerTotals: state?.playerTotals
  });

  console.log("DiceGameNewExact: Current state check:", {
    loading,
    error: error?.message,
    hasState: !!state,
    stateType: typeof state,
    stateKeys: state ? Object.keys(state) : "none",
    playerTotals: state?.playerTotals,
    roundPoints: state?.roundPoints,
    currentPlayerIndex: state?.currentPlayerIndex,
    lastRoll: state?.lastRoll,
    isMultiplayer,
    hasGameSession: !!gameSession,
    currentUser: !!currentUser,
    isMyTurn: isMyTurn,
  });

  // Loading state with better debugging
  if (loading) {
    console.log("DiceGameNewExact: Showing loading state");
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    console.error("DiceGameNewExact: Error state:", error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">Error loading game</div>
          <div className="text-red-400 text-lg">
            {error.message || "Unknown error"}
          </div>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // No state fallback with retry option
  if (!state && !loading) {
    console.warn(
      "DiceGameNewExact: No state available, attempting to retry..."
    );

    // For single player, try to create a new game
    const handleRetry = () => {
      if (!isMultiplayer && dispatch) {
        dispatch({ type: GAME_ACTIONS.NEW_GAME, gameMode });
      } else {
        onBack();
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">
            Failed to load game state
          </div>
          <div className="text-gray-300 mb-4">
            {isMultiplayer
              ? "The multiplayer game could not be loaded."
              : "Single player game failed to initialize."}
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {isMultiplayer ? "Reconnect" : "Retry"}
            </button>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wait for multiplayer session if needed
  if (isMultiplayer && !gameSession && !loading) {
    console.log("DiceGameNewExact: Waiting for multiplayer session");
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">Connecting to game...</div>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Show waiting for opponent if we're the host and no guest has joined yet
  if (
    isMultiplayer &&
    gameSession &&
    !gameSession.guest &&
    gameSession.host?.userId === currentUser?.uid
  ) {
    console.log("DiceGameNewExact: Host waiting for opponent");
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-3xl mb-4">
            🎲 Waiting for Opponent
          </div>
          <div className="text-white/70 text-lg mb-6">
            {gameSession.roomCode
              ? `Room Code: ${gameSession.roomCode}`
              : "Looking for players..."}
          </div>
          <div className="animate-pulse text-white/60 mb-8">
            ⏳ Stand by for matchmaking...
          </div>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Cancel Game
          </button>
        </div>
      </div>
    );
  }

  console.log("DiceGameNewExact: Rendering main game UI");

  // Player styles
  const playerStyles = {
    player1: {
      nameColor: "#fff",
      numberColor: "#fff",
      roundCounterColor: "#fff",
    },
    player2: {
      nameColor: "#fff",
      numberColor: "#fff",
      roundCounterColor: "#fff",
    },
  };

  // Get arena background - use DisplayBackgroundEquip from context or fallback
  const arenaBg = DisplayBackgroundEquip || {
    url: "/backgrounds/Long Road Ahead.jpg",
    isGradient: false,
    isVideo: false,
  };
  console.log("DiceGameNewExact: Arena background:", arenaBg);
  
  // Use MatchBackgroundEquip for player backgrounds if available
  // For single player, use MatchBackgroundEquip for both players
  const renderPlayerBackgrounds = isMultiplayer ? playerBackgrounds : [MatchBackgroundEquip, MatchBackgroundEquip];
  console.log("DiceGameNewExact: PlayerBackgrounds at render:", renderPlayerBackgrounds);
  console.log("DiceGameNewExact: Player 0 background at render:", renderPlayerBackgrounds[0]);
  console.log("DiceGameNewExact: Player 1 background at render:", renderPlayerBackgrounds[1]);

  // Navigation icons
  const navIcons = [
    {
      key: "home",
      label: "Home",
      svg: (
        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      key: "profile",
      label: "Profile",
      svg: (
        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      ),
    },
    {
      key: "chat",
      label: "Chat",
      onClick: handleChatToggle,
      svg: (
        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      ),
    },
    {
      key: "shop",
      label: "Shop",
      svg: (
        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <main
      className={`w-full h-screen relative overflow-hidden flex flex-col items-center justify-start bg-cover bg-no-repeat bg-center text-white font-title ${
        backgroundShift ? "background-shift" : ""
      }`}
            style={{
        background: arenaBg?.isVideo
          ? "rgba(0,0,0,0.5)"
          : arenaBg?.isGradient
          ? arenaBg.url
          : `url('${arenaBg?.url}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Video background for arena */}
      {arenaBg?.isVideo && arenaBg?.videoUrl && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover z-0"
          style={{ zIndex: -1 }}
        >
          <source src={arenaBg.videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Game Mode Display - Top Left Corner */}
          <div
        className="absolute top-4 left-4 z-50"
            style={{
          background: "linear-gradient(135deg, #FF0080, #FF4DB8)",
          borderRadius: "12px",
          padding: "8px 16px",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 4px 15px rgba(255, 0, 128, 0.3)",
        }}
      >
        <span
          style={{
            color: "#FFF",
            fontFamily: "Audiowide",
            fontSize: "14px",
            fontWeight: 600,
            textTransform: "uppercase",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            letterSpacing: "1px",
          }}
        >
          {(() => {
            // Game mode display logic
            switch (actualGameMode?.toLowerCase()) {
              case 'quickfire':
                return 'Quick Fire';
              case 'classic':
                return 'Classic';
              case 'suddendeath':
                return 'Sudden Death';
              case 'laststand':
                return 'Last Stand';
              case 'zerohour':
                return 'Zero Hour';
              case 'truegrit':
                return 'True Grit';
              case 'lastline':
                return 'Last Line';
              case 'tagteam':
                return 'Tag Team';
              default:
                return 'Quick Fire';
            }
          })()}
        </span>
      </div>

      {/* Styles */}
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");
        @font-face {
          font-family: "Becham";
          src: url("/fonts/Becham.ttf") format("truetype");
          font-weight: normal;
        }
        .font-body {
          font-family: "Inter", "Segoe UI", Arial, sans-serif;
        }
        .dice-flash-red {
          animation: dice-flash-red 0.4s;
        }
        .dice-flash-gold {
          animation: dice-flash-gold 0.4s;
        }
        .dice-glow-gold {
          animation: dice-glow-gold 2s ease-in-out;
        }
        .dice-glow-red {
          animation: dice-glow-red 2s ease-in-out;
        }
        .dice-glow-orange {
          animation: dice-glow-orange 2s ease-in-out;
        }
        .dice-glow-white {
          animation: dice-glow-white 2s ease-in-out;
        }
        .background-shift {
          animation: background-shift 0.8s ease-in-out;
        }
        .player-flash-gold {
          animation: player-flash-gold 0.6s;
        }
        @keyframes dice-flash-red {
          0% {
            box-shadow: 0 0 0 0 #ff3b3b;
          }
          50% {
            box-shadow: 0 0 32px 8px #ff3b3b;
          }
          100% {
            box-shadow: 0 0 0 0 #ff3b3b;
          }
        }
        @keyframes dice-flash-gold {
          0% {
            box-shadow: 0 0 0 0 gold;
          }
          50% {
            box-shadow: 0 0 32px 8px gold;
          }
          100% {
            box-shadow: 0 0 0 0 gold;
          }
        }
        @keyframes dice-glow-gold {
          0% {
            box-shadow: 0 0 0 0 gold;
          }
          25% {
            box-shadow: 0 0 40px 12px gold, 0 0 80px 24px rgba(255, 215, 0, 0.3);
          }
          75% {
            box-shadow: 0 0 40px 12px gold, 0 0 80px 24px rgba(255, 215, 0, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 gold;
          }
        }
        @keyframes dice-glow-red {
          0% {
            box-shadow: 0 0 0 0 #ff3b3b;
          }
          25% {
            box-shadow: 0 0 40px 12px #ff3b3b, 0 0 80px 24px rgba(255, 59, 59, 0.3);
          }
          75% {
            box-shadow: 0 0 40px 12px #ff3b3b, 0 0 80px 24px rgba(255, 59, 59, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 #ff3b3b;
          }
        }
        @keyframes dice-glow-orange {
          0% {
            box-shadow: 0 0 0 0 #ff8c00;
          }
          25% {
            box-shadow: 0 0 40px 12px #ff8c00, 0 0 80px 24px rgba(255, 140, 0, 0.3);
          }
          75% {
            box-shadow: 0 0 40px 12px #ff8c00, 0 0 80px 24px rgba(255, 140, 0, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 #ff8c00;
          }
        }
        @keyframes dice-glow-white {
          0% {
            box-shadow: 0 0 0 0 #ffffff;
          }
          25% {
            box-shadow: 0 0 40px 12px #ffffff, 0 0 80px 24px rgba(255, 255, 255, 0.3);
          }
          75% {
            box-shadow: 0 0 40px 12px #ffffff, 0 0 80px 24px rgba(255, 255, 255, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 #ffffff;
          }
        }
        @keyframes background-shift {
          0% {
            filter: hue-rotate(0deg) brightness(1);
          }
          50% {
            filter: hue-rotate(30deg) brightness(1.2);
          }
          100% {
            filter: hue-rotate(0deg) brightness(1);
          }
        }
        @keyframes player-flash-gold {
          0% {
            box-shadow: 0 0 0 0 gold;
          }
          40% {
            box-shadow: 0 0 32px 12px gold;
          }
          100% {
            box-shadow: 0 0 0 0 gold;
          }
        }
        .live-wins-carousel {
          display: flex;
          overflow-x: auto;
          gap: 1.5rem;
          align-items: center;
          scrollbar-width: none;
          scroll-behavior: smooth;
          white-space: nowrap;
          width: 700px;
          max-width: 100vw;
        }
        .live-wins-carousel::-webkit-scrollbar {
          display: none;
        }
        .live-win-card {
          background: #2d2340;
          color: #fff;
          border-radius: 1rem;
          padding: 0.5rem 1.2rem;
          min-width: 160px;
          display: flex;
          align-items: center;
          gap: 0.7rem;
          box-shadow: 0 2px 8px 0 rgba(124, 60, 237, 0.1);
          font-size: 1.1rem;
          font-family: "Becham", "Segoe UI", Arial, sans-serif;
          white-space: nowrap;
        }
        .days-winnings-box {
          background: #f8b51b;
          color: #212121;
          border-radius: 0.7rem;
          padding: 0.5rem 1.2rem;
          display: flex;
          align-items: center;
          gap: 0.7rem;
          font-family: "Becham", "Segoe UI", Arial, sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
        }
      `}</style>

      {/* Content overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Header */}
      <header></header>

      {/* Game Section */}
      <section
        className="flex-1 flex flex-row items-center justify-center p-4 text-white overflow-hidden min-h-0 min-w-0 font-body"
        tyle={{
          fontSize: "2.5rem",
          color: "#fff",
          fontWeight: 700,
          gap: "163px",
          marginTop: "-1.5rem",
          marginBottom: "2rem",

        }}
      >
        {/* Game Mode Information */}
        {isMultiplayer && gameSession?.settings && (
          <div
            style={{
              fontSize: "1.5rem",
              color: "#ffd700",
              fontWeight: 600,
              textAlign: "center",
              marginTop: "-1rem",
              marginBottom: "1rem",
              padding: "0.5rem",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255, 215, 0, 0.3)",
              
            }}
          >
            {gameSession.modeType === "quickfire" && (
              <>
                🔥 Quick Fire - First to{" "}
                {gameSession.settings.targetScore || 50}
              </>
            )}
            {gameSession.modeType === "classic" && (
              <>
                👑 Classic Mode - First to{" "}
                {gameSession.settings.targetScore || 100}
              </>
            )}
            {gameSession.modeType === "suddendeath" && (
              <>💀 Sudden Death - First to 50, Best of 1</>
            )}
            {gameSession.modeType === "laststand" && (
              <>⚔️ Last Stand - One Turn Each, Highest Score Wins</>
            )}
            {gameSession.modeType === "zerohour" && (
              <>⏰ Zero Hour - Start at 100, Race to 0</>
            )}
            {gameSession.modeType === "tagteam" && (
              <>🤝 Tag Team - 2v2 Team Battle</>
            )}
          </div>
        )}

        {/* Game winner display */}
        {state?.matchWinner !== null && (
          <div className="text-center mb-4">
            <div className="text-6xl font-title text-yellow-400 mb-4">
              🏆 {getPlayerName(state.matchWinner)} Wins! 🏆
            </div>
            {isMultiplayer && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleNewGame}
                  className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-title text-xl transition-colors"
                >
                  Return to Lobby
                </button>
              </div>
            )}
          </div>
        )}

        {/* Regular Game Layout */}
        <div
          className="w-full min-h-0 min-w-0"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            paddingBottom: "20px",
            gap: "10px",
            flex: "1 0 0",
           
          }}
        >
          {/* Player 1 */}
          <div
          className={`relative transition-all flex-shrink-0 min-h-0 min-w-0${
            isCurrentPlayerAtDisplay(0) ? " scale-105" : " opacity-80"
          }`}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingBottom: "20px",
           
            gap: "16px",
            height: "fit-content",
            width: "470px",
            opacity: (isMultiplayer && !getIsCurrentPlayer(0) && state?.currentPlayerIndex !== 0) ? 0.7 : 1,
            filter: (isMultiplayer && !getIsCurrentPlayer(0) && state?.currentPlayerIndex !== 0) ? "blur(1px)" : "none",
            transform: (isMultiplayer && !getIsCurrentPlayer(0) && state?.currentPlayerIndex !== 0) ? "scale(0.95)" : "scale(1)",
            transition: "all 0.3s ease-in-out",
         
          }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "row",
                alignItems: "space-between",
                justifyContent: "space-between",
                position: "relative",
                gap: "10px",
                
              }}
            >
              <h2
                className="font-title font-semibold"
                style={{
                  width: "100%",
                  fontFamily: "Orbitron",
                  fontSize: "32px",
                  fontWeight: "500",
                  lineHeight: "42px",
                  textTransform: "uppercase",
                  color: playerStyles.player1.nameColor,
                  textAlign: "center",
                  marginBottom: "8px",
                  textAlign: "left",
                }}
              >
                {getPlayerName(0)}
              </h2>
              {/* Round counter - only show when appropriate */}
              {shouldShowRoundCounter(state) && (
                <div
                  className="rounded-lg shadow font-title border-1 border-white/20 z-30"
                  style={{
                    width: "100px",
                    height: "100px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    minWidth: "100px",
                    textAlign: "center",
                    borderRadius: "20px",
                    fontSize: "2.5rem",
                    fontFamily: "Orbitron",
                    color: playerStyles.player1.roundCounterColor,
                    background: (state?.roundsWon?.[0] || 0) >= 1
                      ? "linear-gradient(336deg, rgba(255, 215, 0, 0.8) 40.05%, rgba(255, 165, 0, 0.3) 161.18%)"
                      : "linear-gradient(336deg, rgba(80, 93, 113, 0.30) 40.05%, rgba(143, 142, 43, 0.00) 161.18%)",
                    fontWeight: 900,
                    border: (state?.roundsWon?.[0] || 0) >= 1 ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.2)",
                    boxShadow: (state?.roundsWon?.[0] || 0) >= 1 ? "0 0 20px rgba(255, 215, 0, 0.5)" : "none"
                  }}
                >
                  {/* Visual indicator - dots for round wins */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {Array.from({ length: Math.min(state?.roundsWon?.[0] || 0, 2) }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: '#FFD700',
                          boxShadow: '0 0 8px rgba(255, 215, 0, 0.8)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

              {/* Round counter - only show when appropriate */}
              {shouldShowRoundCounter(state) && (
                <div
                  className="  rounded-lg shadow font-title border-1 border-white/20 z-30"
                  style={{
                    width: "100px",
                    height: "100px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    minWidth: "100px",
                    textAlign: "center",
                    borderRadius: "20px",
                    fontSize: "2.5rem",
                    fontFamily: "Orbitron",
                    color: playerStyles.player1.roundCounterColor,
                    background: (state?.roundsWon?.[0] || 0) >= 1
                      ? "linear-gradient(336deg, rgba(255, 215, 0, 0.8) 40.05%, rgba(255, 165, 0, 0.3) 161.18%)" // Gold when player has won a round
                      : "linear-gradient(336deg, rgba(80, 93, 113, 0.30) 40.05%, rgba(143, 142, 43, 0.00) 161.18%)",
                    fontWeight: 900,
                    border: (state?.roundsWon?.[0] || 0) >= 1 ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.2)",
                    boxShadow: (state?.roundsWon?.[0] || 0) >= 1 ? "0 0 20px rgba(255, 215, 0, 0.5)" : "none"
                  }}
                >
                  {/* Visual indicator - dots for round wins */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {Array.from({ length: Math.min(state?.roundsWon?.[0] || 0, 2) }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: '#FFD700',
                          boxShadow: '0 0 8px rgba(255, 215, 0, 0.8)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Player info */}

            <div
              style={{
                width: "469px",
                height: "399px",
                borderRadius: "20px",
                background: playerBackgrounds[0]?.isGradient 
                  ? playerBackgrounds[0].url
                  : playerBackgrounds[0]?.url
                  ? `url('${playerBackgrounds[0].url}')`
                  : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "center",
                flexShrink: 0,
                color: "white",
                fontSize: "1.5rem",
                fontWeight: "bold",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Video background for player 1 card */}
              {playerBackgrounds[0]?.isVideo && playerBackgrounds[0]?.videoUrl && (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ borderRadius: "20px" }}
                >
                  <source src={playerBackgrounds[0].videoUrl} type="video/mp4" />
                </video>
              )}
              {/* Score display */}
              <div
                className="flex items-center justify-center w-full relative z-10"
                style={{
                  borderRadius: "1.2rem",
                  position: "relative",
                  alignItems: "center",
                  height: "100%",
                  textAlign: "center",
                  justifyContent: "center",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <h3
                  className={`font-title${shouldFlashPlayer(0) ? " player-flash-gold" : ""}`}
                  style={{
                    fontSize: "15rem",
                    color: playerStyles.player1.numberColor,
                    width: "100%",
                    position: "relative",
                    fontFamily: "Orbitron",
                    alignItems: "center",
                    textAlign: "center",
                    justifyContent: "center",
                    fontWeight: 100,
                    lineHeight: 1,
                    textShadow:
                      "0 2px 12px rgba(0,0,0,0.5), 0 4px 24px rgba(124,60,237,0.18), 0 1px 0 #fff",
                  }}
                >
                  {getCurrentPlayerScore()}
                </h3>
              </div>
            </div>
            {/* Background rarity */}
            <div
              className="relative"
              style={{
                display: "flex",
                width: "fit-content",
                height: "45px",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                borderRadius: "10px",
                padding: "0 40px",
                background: "rgba(255, 255, 255, 0.09)",
                backdropFilter: "blur(5.5px)",
              }}
            >
              <p
                style={{
                  fontSize: "20px",
                  color: "#fff",
                  width: "100%",
                  fontFamily: "Orbitron",
                  alignItems: "center",
                  textAlign: "Center",
                  justifyContent: "center",

                  fontWeight: 500,
                  lineHeight: "24px",
                  textShadow:
                    "0 2px 12px rgba(0,0,0,0.18), 0 4px 24px rgba(124,60,237,0.18), 0 1px 0 #fff",
                  leadingTrim: "both",
                  textEdge: "cap",
                  fontStyle: "normal",
                  textTransform: "uppercase",
                }}
              >
                {playerBackgrounds[0]?.rarity || arenaBg?.rarity}
              </p>
            </div>
          </div>

          {/* Dice & Controls - Center Console */}
          <div
            className="center-console"
            style={{
              display: 'flex',
              width: '350px',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '-20px',
              position: 'relative',
            }}
          >
            {/* Dice Container */}
            <div
              className="dice-container"
              style={{
                display: 'flex',
                height: '706px',
                padding: '110px 0px',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                alignSelf: 'stretch',
                borderRadius: '30px',
                border: '1px solid rgba(255, 255, 255, 0.00)',
                backdropFilter: 'blur(20px)',
                background: 'rgba(30,30,60,0.10)',
                boxShadow: '0 8px 32px 0 rgba(124,60,237,0.08)',
              }}
            >
              {/* Dice rendering logic */}
              {state?.isPregame ? (
                // Only show one die
                <div
                  className="single-die"
                  style={{
                    color: '#000',
                    fontFamily: 'Orbitron',
                    fontSize: '250px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '42px',
                    textTransform: 'uppercase',
                    width: '180px',
                    height: '153px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                  }}
                >
                  {typeof state?.oddEvenDieValue === 'number' ? state.oddEvenDieValue : '?'}
                </div>
              ) : (
                // Normal game: show two dice
                <div
                  className="dice-row"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '24px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="dice-item"
                      style={{
                        color: '#000',
                        fontFamily: 'Orbitron',
                        fontSize: '250px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: '42px',
                        textTransform: 'uppercase',
                        width: '180px',
                        height: '153px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '20px',
                        boxShadow: '0 2px 8px 0 rgba(124, 60, 237, 0.08)',
                      }}
                    >
                      {dice[i] !== null ? dice[i] : '?'}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Score Anticipation Overlay */}
            {state?.roundPoints > 0 && (
              <ScoreAnticipation
                currentScore={state?.playerTotals[isMultiplayer ? playerIndex : state?.currentPlayerIndex] || 0}
                roundPoints={state?.roundPoints}
                targetScore={state?.targetScore}
                isVisible={!isRolling}
                isReverseScoring={state?.gameMode === 'zerohour'}
                celebrationLevel={celebrationLevel}
                showPointsAnimation={animationPhase === 'celebrating'}
                lastRoll={dice}
              />
            )}
            {/* Playing buttons below dice container */}
            {state?.isPregame ? (
              <div
                className="odd-even-buttons"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '40px',
                  marginTop: '40px',
                }}
              >
                <button
                  disabled={state?.winner || isRolling || state?.chooserPlayerIndex !== playerIndex}
                  style={{
                    display: 'flex',
                    padding: '20px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 0, 0, 0.00)',
                    gap: '10px',
                    color: '#FFF',
                    fontFamily: 'Audiowide',
                    fontSize: '96px',
                    fontWeight: 400,
                    lineHeight: '42px',
                    textTransform: 'uppercase',
                    background: '#FFD700',
                    boxShadow: '0 2px 8px 0 rgba(124, 60, 237, 0.08)',
                    cursor: state?.winner || isRolling || state?.chooserPlayerIndex !== playerIndex ? 'not-allowed' : 'pointer',
                    opacity: state?.winner || isRolling || state?.chooserPlayerIndex !== playerIndex ? 0.4 : 1,
                  }}
                  onClick={() => handleOddEven('CHOOSE_ODD')}
                >
                  ODD
                </button>
                <button
                  disabled={state?.winner || isRolling || state?.chooserPlayerIndex !== playerIndex}
                  style={{
                    display: 'flex',
                    padding: '20px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 0, 0, 0.00)',
                    gap: '10px',
                    color: '#FFF',
                    fontFamily: 'Audiowide',
                    fontSize: '96px',
                    fontWeight: 400,
                    lineHeight: '42px',
                    textTransform: 'uppercase',
                    background: '#8e44ad',
                    boxShadow: '0 2px 8px 0 rgba(124, 60, 237, 0.08)',
                    cursor: state?.winner || isRolling || state?.chooserPlayerIndex !== playerIndex ? 'not-allowed' : 'pointer',
                    opacity: state?.winner || isRolling || state?.chooserPlayerIndex !== playerIndex ? 0.4 : 1,
                  }}
                  onClick={() => handleOddEven('CHOOSE_EVEN')}
                >
                  EVEN
                </button>
              </div>
            ) : (
              <div
                className="play-save-buttons"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '40px',
                  marginTop: '40px',
                }}
              >
                <button
                  disabled={state?.winner || isRolling}
                  onClick={handleRoll}
                  style={{
                    display: 'flex',
                    padding: '20px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 0, 0, 0.00)',
                    gap: '10px',
                    color: '#FFF',
                    fontFamily: 'Audiowide',
                    fontSize: '96px',
                    fontWeight: 400,
                    lineHeight: '42px',
                    textTransform: 'uppercase',
                    background: '#27ae60',
                    boxShadow: '0 2px 8px 0 rgba(124, 60, 237, 0.08)',
                    cursor: state?.winner || isRolling ? 'not-allowed' : 'pointer',
                  }}
                >
                  PLAY
                </button>
                <button
                  disabled={state?.winner || isRolling || state?.roundPoints === 0}
                  onClick={handleBank}
                  style={{
                    display: 'flex',
                    padding: '20px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 0, 0, 0.00)',
                    gap: '10px',
                    color: '#FFF',
                    fontFamily: 'Audiowide',
                    fontSize: '96px',
                    fontWeight: 400,
                    lineHeight: '42px',
                    textTransform: 'uppercase',
                    background: '#f8b51b',
                    boxShadow: '0 2px 8px 0 rgba(124, 60, 237, 0.08)',
                    cursor: state?.winner || isRolling || state?.roundPoints === 0 ? 'not-allowed' : 'pointer',
                    opacity: state?.roundPoints === 0 ? 0.4 : 1,
                  }}
                >
                  SAVE
                </button>
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div
            className={`relative transition-all flex-shrink-0 min-h-0 min-w-0${
              isCurrentPlayerAtDisplay(1) ? "scale-105" : "opacity-80"
            }`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              paddingBottom: "20px",
              gap: "16px",
              height: "fit-content",
              width: "470px",
              opacity: (isMultiplayer && !getIsCurrentPlayer(1) && state?.currentPlayerIndex !== 1) ? 0.7 : 1,
              filter: (isMultiplayer && !getIsCurrentPlayer(1) && state?.currentPlayerIndex !== 1) ? "blur(1px)" : "none",
              transform: (isMultiplayer && !getIsCurrentPlayer(1) && state?.currentPlayerIndex !== 1) ? "scale(0.95)" : "scale(1)",
              transition: "all 0.3s ease-in-out",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "fit-content",
                display: "flex",
                alignItems: "flex-end",
                flexDirection: "row",
                position: "relative",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "fit-content",
                  display: "flex",
                  alignItems: "bottom",
                  justifyContent: "flex-end",
                  flexDirection: "row",
                  position: "relative",
                  gap: "10px",
                  flex: "1 0 0",
                }}
              >
                {/* Round counter - only show when appropriate */}
                {shouldShowRoundCounter(state) && (
                  <div
                    className="  rounded-lg shadow font-title border-1 border-white/20 z-30"
                    style={{
                      width: "100px",
                      height: "100px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      minWidth: "100px",
                      textAlign: "center",
                      borderRadius: "20px",
                      fontSize: "2.5rem",
                      fontFamily: "Orbitron",
                      color: playerStyles.player2.roundCounterColor,
                      background: (state?.roundsWon?.[1] || 0) >= 1
                        ? "linear-gradient(336deg, rgba(255, 215, 0, 0.8) 40.05%, rgba(255, 165, 0, 0.3) 161.18%)" // Gold when player has won a round
                        : "linear-gradient(336deg, rgba(80, 93, 113, 0.30) 40.05%, rgba(143, 142, 43, 0.00) 161.18%)",
                      fontWeight: 900,
                      border: (state?.roundsWon?.[1] || 0) >= 1 ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.2)",
                      boxShadow: (state?.roundsWon?.[1] || 0) >= 1 ? "0 0 20px rgba(255, 215, 0, 0.5)" : "none"
                    }}
                  >
                    {/* Visual indicator - dots for round wins */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {Array.from({ length: Math.min(state?.roundsWon?.[1] || 0, 2) }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: '#FFD700',
                            boxShadow: '0 0 8px rgba(255, 215, 0, 0.8)'
                          }}
                        />
                                           ))}
                    </div>
                  </div>
                )}
                <h2
                  className="font-title font-semibold"
                  style={{
                    leadingTrim: "both",
                    width: "100%",
                    fontFamily: "Orbitron",
                    textEdge: "cap",
                    fontSize: "32px",
                    fontStyle: "normal",
                    fontWeight: "500",
                    textAlign: "right",
                    lineHeight: "42px",
                    textTransform: "uppercase",
                    color: playerStyles.player2.nameColor,
                  }}
                >
                  {getPlayerName(1)}
                  {getIsCurrentPlayer(1) ? "" : ""}
                </h2>
              </div>
            </div>

            {/* Player info */}
            <div
              style={{
                width: "469px",
                height: "399px",
                borderRadius: "20px",
                background: playerBackgrounds[1]?.isGradient 
                  ? playerBackgrounds[1].url
                  : playerBackgrounds[1]?.url
                  ? `url('${playerBackgrounds[1].url}')`
                  : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              }}
            >
              {/* Video background for player 2 card */}
              {playerBackgrounds[1]?.isVideo && playerBackgrounds[1]?.videoUrl && (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ borderRadius: "20px" }}
                >
                  <source src={playerBackgrounds[1].videoUrl} type="video/mp4" />
                </video>
              )}
              {/* Score display */}
              <div
                className="flex items-center justify-center w-full relative z-10"
                style={{
                  borderRadius: "1.2rem",
                  position: "relative",

                  alignItems: "center",
                  height: "100%",
                  textAlign: "right",
                }}
              >
                <h3
                  className={`font-title${shouldFlashPlayer(1) ? " player-flash-gold" : ""}`}
                  style={{
                    fontSize: "15rem",
                    color: playerStyles.player2.numberColor,
                    width: "100%",

                    position: "relative",
                    fontFamily: "Orbitron",
                    alignItems: "center",
                    textAlign: "center",
                    justifyContent: "center",
                    fontWeight: 100,
                    lineHeight: 1,
                    textShadow:
                      "0 2px 12px rgba(0,0,0,0.5), 0 4px 24px rgba(124,60,237,0.18), 0 1px 0 #fff",
                  }}
                >
                  {getOpponentScore()}
                </h3>
              </div>
            </div>
            {/* Background rarity */}
            <div
              className="relative"
              style={{
                display: "flex",
                width: "fit-content",
                height: "45px",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                borderRadius: "10px",
                padding: "0 40px",
                background: "rgba(255, 255, 255, 0.09)",
                backdropFilter: "blur(5.5px)",
              }}
            >
              <p
                style={{
                  fontSize: "20px",
                  color: "#fff",
                  width: "100%",
                  fontFamily: "Orbitron",
                  alignItems: "center",
                  textAlign: "Center",
                  justifyContent: "center",
                  fontWeight: 500,
                  lineHeight: "24px",
                  textShadow:
                    "0 2px 12px rgba(0,0,0,0.18), 0 4px 24px rgba(124,60,237,0.18), 0 1px 0 #fff",
                  leadingTrim: "both",
                  textEdge: "cap",
                  fontStyle: "normal",
                  textTransform: "uppercase",
                }}
              >
                {playerBackgrounds[1]?.rarity || arenaBg?.rarity}
              </p>
            </div>
          </div>

        
      {/* End main flex row */}
      {/* Connection Status for Multiplayer */}
      {isMultiplayer && (
        <ConnectionStatus
          connected={gameSession && gameSession.status !== "disconnected"}
          error={error}
        />
      )}
        </section>
      </main>
  )}
