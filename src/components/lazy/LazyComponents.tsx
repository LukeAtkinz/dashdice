import dynamic from 'next/dynamic'

// Lazy load heavy animation components
export const LazyGameModeSelector = dynamic(
  () => import('@/components/ui/GameModeSelector').then(mod => ({ default: mod.GameModeSelector })),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }
)

export const LazyVideoTransition = dynamic(
  () => import('@/components/transitions/VideoTransition').then(mod => ({ default: mod.VideoTransition })),
  { 
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-black/50" />
  }
)

export const LazyVideoOverlay = dynamic(
  () => import('@/components/transitions/VideoOverlay').then(mod => ({ default: mod.VideoOverlay })),
  { 
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-black/80 z-50" />
  }
)

export const LazyAchievementsMini = dynamic(
  () => import('@/components/achievements/AchievementsMini'),
  { 
    ssr: false,
    loading: () => (
      <div className="p-4">
        <div className="animate-pulse bg-gray-700 h-6 w-32 rounded mb-2" />
        <div className="animate-pulse bg-gray-700 h-4 w-24 rounded" />
      </div>
    )
  }
)

export const LazyPowerTab = dynamic(
  () => import('@/components/vault/PowerTab'),
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center text-gray-400">Loading powers...</div>
  }
)

export const LazyUnifiedChatWindow = dynamic(
  () => import('@/components/chat/UnifiedChatWindow'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse bg-gray-700 h-12 w-32 rounded mb-4 mx-auto" />
          <div className="animate-pulse bg-gray-700 h-6 w-48 rounded mx-auto" />
        </div>
      </div>
    )
  }
)

export const LazyFriendsDashboard = dynamic(
  () => import('@/components/friends/FriendsDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-gray-400">Loading friends...</div>
    )
  }
)

export const LazySplashScreen = dynamic(
  () => import('@/components/layout/SplashScreen'),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-32 h-32 object-cover rounded"
        >
          <source src="/splash.mp4" type="video/mp4" />
        </video>
      </div>
    )
  }
)

export const LazySwipeUpChat = dynamic(
  () => import('@/components/chat/SwipeUpChat'),
  { 
    ssr: false,
    loading: () => <div />
  }
)

export const LazyImprovedSwipeUpChat = dynamic(
  () => import('@/components/chat/ImprovedSwipeUpChat'),
  { 
    ssr: false,
    loading: () => <div />
  }
)

// Lazy load other heavy components
export const LazyInventoryReference = dynamic(
  () => import('@/components/dashboard/InventoryReference'),
  { 
    ssr: false,
    loading: () => (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }
)

export const LazyAbilitiesPanel = dynamic(
  () => import('@/components/match/AbilitiesPanel'),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-700 rounded w-1/2" />
          <div className="h-8 bg-gray-700 rounded" />
        </div>
      </div>
    )
  }
)