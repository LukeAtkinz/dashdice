export interface Background {
  id: string;
  name: string;
  filename: string;
  type: 'image' | 'video';
  thumbnail?: string;
  description?: string;
  tags?: string[];
}

export const AVAILABLE_BACKGROUNDS: Background[] = [
  {
    id: 'all-for-glory',
    name: 'All For Glory',
    filename: 'All For Glory.jpg',
    type: 'image',
    description: 'An epic battle scene with dramatic lighting',
    tags: ['epic', 'battle', 'dramatic']
  },
  {
    id: 'long-road-ahead',
    name: 'Long Road Ahead',
    filename: 'Long Road Ahead.jpg',
    type: 'image',
    description: 'A scenic road stretching into the distance',
    tags: ['scenic', 'journey', 'peaceful']
  },
  {
    id: 'relax',
    name: 'Relax',
    filename: 'Relax.png',
    type: 'image',
    description: 'A calming and peaceful environment',
    tags: ['calm', 'peaceful', 'zen']
  },
  {
    id: 'new-day',
    name: 'New Day',
    filename: 'New Day.mp4',
    type: 'video',
    description: 'Animated sunrise bringing hope and new beginnings',
    tags: ['animated', 'sunrise', 'hope']
  },
  {
    id: 'on-a-mission',
    name: 'On A Mission',
    filename: 'On A Mission.mp4',
    type: 'video',
    description: 'Dynamic action sequence for intense gaming',
    tags: ['animated', 'action', 'intense']
  },
  {
    id: 'underwater',
    name: 'Underwater',
    filename: 'Underwater.mp4',
    type: 'video',
    description: 'Serene underwater scene with flowing currents',
    tags: ['animated', 'underwater', 'serene']
  },
  {
    id: 'as-they-fall',
    name: 'As They Fall',
    filename: 'As they fall.mp4',
    type: 'video',
    description: 'Dynamic falling sequence with scenic journey vibes',
    tags: ['animated', 'falling', 'scenic', 'journey']
  },
  {
    id: 'end-of-the-dragon',
    name: 'End Of The Dragon',
    filename: 'End of the Dragon.mp4',
    type: 'video',
    description: 'Epic dragon finale with mystical adventure atmosphere',
    tags: ['animated', 'dragon', 'epic', 'mystical']
  }
];

export const getBackgroundById = (id: string): Background | undefined => {
  return AVAILABLE_BACKGROUNDS.find(bg => bg.id === id);
};

export const getBackgroundUrl = (background: Background): string => {
  return `/backgrounds/${background.filename}`;
};

export const getDefaultBackground = (): Background => {
  return AVAILABLE_BACKGROUNDS[0]; // All For Glory as default
};

// Helper function to convert Background to UserProfile background format
export const toUserBackground = (background: Background) => ({
  name: background.name,
  file: `/backgrounds/${background.filename}`,
  type: background.type as 'image' | 'video'
});
