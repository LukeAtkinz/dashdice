# DashDice - Multiplayer Dice Game

A modern, real-time multiplayer dice game built with Next.js 14, TypeScript, Tailwind CSS, and Firebase.

## 🎲 Features

- **Real-time Multiplayer**: Play with friends in real-time using Firebase Firestore
- **User Authentication**: Secure email/password authentication with Firebase Auth
- **Background System**: 6 pre-configured backgrounds (3 images, 3 videos) automatically granted to new users
- **Orbitron Font**: Futuristic font integrated globally for game UI elements
- **Inventory System**: Collect and equip dice, backgrounds, avatars, and effects
- **Protected Routes**: Secure pages that require authentication
- **Responsive Design**: Beautiful UI that works on desktop and mobile
- **Modern Tech Stack**: Built with latest Next.js 14, TypeScript, and Tailwind CSS

## 🎨 Background System

### Available Backgrounds

All new users automatically receive 6 backgrounds in their inventory:

#### Image Backgrounds
- **All For Glory** - Epic battle scene with dramatic lighting
- **Long Road Ahead** - Scenic road stretching into the distance
- **Relax** - Calming and peaceful environment

#### Video Backgrounds  
- **New Day** - Animated sunrise bringing hope and new beginnings
- **On A Mission** - Dynamic action sequence for intense gaming
- **Underwater** - Serene underwater scene with flowing currents

### Background Management

- **Automatic Assignment**: All backgrounds granted to users on registration
- **Easy Selection**: Use the BackgroundSelector component in inventory
- **Real-time Updates**: Background changes sync immediately to Firebase
- **Type Support**: Both static images and video backgrounds supported

## 🎯 Orbitron Font

The Orbitron font is configured globally and available throughout the application:

### Usage
```jsx
<h1 className="font-orbitron text-4xl font-bold">Game Title</h1>
```

### Font Weights
- Light (300), Regular (400), Medium (500)
- Semi-bold (600), Bold (700), Extra-bold (800), Black (900)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- Firebase service account key

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Firebase configuration:**
   - Copy `.env.local.example` to `.env.local`
   - Add your Firebase configuration values
   - Replace `serviceAccountKey.json` with your actual Firebase service account key

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Firebase Setup

1. Create a new Firebase project
2. Enable Authentication and Firestore
3. Add your domain to authorized domains
4. Create a service account and download the JSON key
5. Replace `serviceAccountKey.json` with your key file

## 📁 Project Structure

```
src/
├── app/                    # Next.js 14 App Router pages
│   ├── dashboard/         # Single-page dashboard route
│   ├── inventory/         # Inventory management (legacy)
│   ├── login/            # Authentication pages
│   ├── match/            # Game lobby and match (legacy)
│   └── register/         # User registration
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard section components
│   │   ├── DashboardSection.tsx    # Main dashboard content
│   │   ├── MatchSection.tsx        # Match/game section
│   │   ├── InventorySection.tsx    # Inventory management
│   │   ├── ProfileSection.tsx      # User profile section
│   │   └── SettingsSection.tsx     # User settings section
│   ├── game/             # Game-related components
│   ├── layout/           # Layout components
│   │   ├── SinglePageDashboard.tsx # Main dashboard wrapper
│   │   ├── DashboardNavigation.tsx # Top navigation bar
│   │   └── SectionTransition.tsx   # Animation wrapper
│   └── ui/               # Reusable UI components
├── context/              # React Context providers
│   ├── AuthContext.tsx   # Authentication state
│   ├── GameContext.tsx   # Game state management
│   ├── InventoryContext.tsx # Inventory management
│   ├── NavigationContext.tsx # Dashboard navigation state
│   └── Providers.tsx     # Combined providers
├── hooks/                # Custom React hooks
├── services/             # Firebase and API services
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## � Single Page Dashboard

The dashboard uses a modern single-page application (SPA) architecture with smooth animated transitions between sections. All main sections (Dashboard, Match, Inventory, Profile, Settings) are contained within a single page component with internal navigation.

### Architecture Overview

- **SinglePageDashboard**: Main wrapper component that orchestrates all sections
- **NavigationContext**: React Context for managing current section state
- **SectionTransition**: Animated wrapper using Framer Motion for smooth transitions
- **DashboardNavigation**: Top navigation bar with animated indicators
- **Individual Sections**: Modular components for each dashboard section

### Adding New Sections

To add a new section to the dashboard:

1. **Define the section in types:**
   ```typescript
   // src/context/NavigationContext.tsx
   export type DashboardSection = 
     | 'dashboard' 
     | 'match' 
     | 'inventory' 
     | 'profile' 
     | 'settings'
     | 'your-new-section'; // Add your new section here
   ```

2. **Create the section component:**
   ```typescript
   // src/components/dashboard/YourNewSection.tsx
   'use client';
   
   export function YourNewSection() {
     return (
       <div className="space-y-6">
         <h1 className="font-orbitron text-3xl font-bold">Your New Section</h1>
         {/* Your section content */}
       </div>
     );
   }
   ```

3. **Add navigation item:**
   ```typescript
   // src/components/layout/DashboardNavigation.tsx
   const navigationItems = [
     // ... existing items
     { key: 'your-new-section', label: 'Your Section', icon: '🎯' },
   ];
   ```

4. **Add to SinglePageDashboard:**
   ```typescript
   // src/components/layout/SinglePageDashboard.tsx
   import { YourNewSection } from '@/components/dashboard/YourNewSection';
   
   // In the render section:
   {currentSection === 'your-new-section' && (
     <SectionTransition variant="fade">
       <YourNewSection />
     </SectionTransition>
   )}
   ```

### Available Transition Types

The dashboard supports four different transition animations:

#### 1. Fade Transition
```typescript
<SectionTransition variant="fade">
  <YourComponent />
</SectionTransition>
```
- **Effect**: Smooth opacity transition
- **Duration**: 0.3 seconds
- **Best for**: Simple content switches

#### 2. Slide Transition
```typescript
<SectionTransition variant="slide">
  <YourComponent />
</SectionTransition>
```
- **Effect**: Horizontal slide from right
- **Duration**: 0.4 seconds
- **Best for**: Sequential navigation

#### 3. Scale Transition
```typescript
<SectionTransition variant="scale">
  <YourComponent />
</SectionTransition>
```
- **Effect**: Scale up from center with opacity
- **Duration**: 0.4 seconds
- **Best for**: Modal-like sections

#### 4. Slide Up Transition
```typescript
<SectionTransition variant="slideUp">
  <YourComponent />
</SectionTransition>
```
- **Effect**: Vertical slide from bottom
- **Duration**: 0.5 seconds
- **Best for**: Form sections or detailed views

### Customizing Transitions

To create custom transition variants:

```typescript
// src/components/layout/SectionTransition.tsx

const variants = {
  // Add your custom variant
  customFade: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.6, ease: "easeInOut" }
  }
};
```

### Navigation Context Usage

Access navigation state in any component:

```typescript
import { useNavigation } from '@/context/NavigationContext';

function YourComponent() {
  const { currentSection, setCurrentSection, isTransitioning } = useNavigation();
  
  const handleSectionChange = () => {
    setCurrentSection('your-target-section');
  };
  
  return (
    <button 
      onClick={handleSectionChange}
      disabled={isTransitioning}
    >
      Go to Section
    </button>
  );
}
```

### Best Practices

1. **Performance**: Use `React.memo` for heavy section components
2. **State Management**: Keep section-specific state within each section component
3. **Transition Timing**: Choose appropriate transition types for content complexity
4. **Accessibility**: Ensure keyboard navigation works with section switching
5. **Loading States**: Handle loading states within individual sections

## �🎮 How to Play

## 🎮 Component Usage

### BackgroundSelector Component

Use the background selector in any page:

```tsx
import { BackgroundSelector } from '@/components/game/BackgroundSelector';

export default function InventoryPage() {
  return (
    <div>
      <BackgroundSelector 
        onBackgroundChange={(background) => {
          console.log('Background changed to:', background.name);
        }}
      />
    </div>
  );
}
```

### Background Service

Manage backgrounds programmatically:

```typescript
import { BackgroundService } from '@/services/backgroundService';

// Get user's owned backgrounds
const ownedBackgrounds = BackgroundService.getUserOwnedBackgrounds(user.ownedBackgrounds);

// Update equipped background
await BackgroundService.updateEquippedBackground(userId, backgroundId);

// Get background URL
const backgroundUrl = BackgroundService.getBackgroundUrl(background);
```

### Font Usage

Apply Orbitron font to any element:

```jsx
<h1 className="font-orbitron text-4xl font-bold">
  DashDice
</h1>

<p className="font-orbitron font-semibold text-lg">
  Game Status
</p>
```

## 🚀 How to Play

1. **Sign Up/Login**: Create an account or sign in
2. **Customize**: Visit inventory to select your preferred background
3. **Dashboard**: View your stats and quick actions
4. **Create/Join Game**: Start a new game or join with a Game ID
5. **Inventory**: Manage your backgrounds and other collected items
6. **Play**: Enjoy multiplayer dice games with friends!

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🏗️ Built With

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion for smooth transitions
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **State Management**: React Context
- **Deployment**: Vercel (recommended)

## 🔐 Security Features

- Protected routes with authentication
- Firebase security rules
- Input validation and sanitization
- Error handling and logging
- HTTPS enforced in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the console for error messages
2. Verify your Firebase configuration
3. Ensure all environment variables are set
4. Check that your Firebase project has the necessary services enabled

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in the Vercel dashboard
3. Deploy automatically on every push

### Manual Deployment

1. Build the project: `npm run build`
2. Upload the `.next` folder and other necessary files
3. Set environment variables on your hosting platform
4. Start the production server: `npm start`
