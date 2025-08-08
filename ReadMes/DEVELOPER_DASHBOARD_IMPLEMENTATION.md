# Developer Dashboard Implementation Guide

## Overview
A comprehensive admin dashboard for DashDice developers to manage game assets, monitor user analytics, and preview changes in real-time. Accessible via a separate URL with authentication controls.

## Core Features
- **Background Management**: Upload, edit, and organize backgrounds
- **Color System**: Real-time color wheels and gradient editors
- **Asset Preview**: Live game preview with applied changes
- **User Analytics**: Track user accounts, registrations, and activity
- **Shop Management**: Easy addition/removal of shop items
- **Configuration Controls**: Game settings and feature toggles

## URL Structure
```
https://yourdomain.com/dev-dashboard/*
```

## Database Schema

### Developer Settings Collection
```typescript
interface DeveloperSettings {
  id: string;
  backgroundCategories: string[];
  colorPalettes: {
    [category: string]: {
      primary: string[];
      secondary: string[];
      accent: string[];
    };
  };
  gameSettings: {
    maxBackgrounds: number;
    allowCustomColors: boolean;
    enableGradients: boolean;
    backgroundUploadLimit: number; // MB
  };
  analytics: {
    trackingEnabled: boolean;
    refreshInterval: number; // minutes
  };
  lastUpdated: Timestamp;
  updatedBy: string;
}
```

### Background Assets Collection
```typescript
interface BackgroundAsset {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'image' | 'video' | 'gradient';
  fileUrl: string;
  thumbnailUrl: string;
  fileSize: number; // bytes
  dimensions: {
    width: number;
    height: number;
  };
  colors: {
    dominant: string[];
    palette: string[];
  };
  metadata: {
    uploadedBy: string;
    uploadedAt: Timestamp;
    lastModified: Timestamp;
    version: number;
  };
  status: 'draft' | 'active' | 'archived';
  shopSettings?: {
    price: number;
    category: string;
    featured: boolean;
  };
}
```

### Color Themes Collection
```typescript
interface ColorTheme {
  id: string;
  name: string;
  type: 'solid' | 'gradient' | 'pattern';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  gradient?: {
    type: 'linear' | 'radial' | 'conic';
    direction: number; // degrees
    stops: Array<{
      color: string;
      position: number; // 0-100%
    }>;
  };
  preview: string; // CSS representation
  createdBy: string;
  createdAt: Timestamp;
  isActive: boolean;
}
```

### Analytics Data Collection
```typescript
interface AnalyticsSnapshot {
  id: string;
  timestamp: Timestamp;
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newRegistrations: number;
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
  };
  contentMetrics: {
    totalBackgrounds: number;
    popularBackgrounds: Array<{
      id: string;
      name: string;
      downloads: number;
      purchases: number;
    }>;
    shopRevenue: number;
  };
  systemMetrics: {
    storageUsed: number; // bytes
    bandwidth: number; // bytes
    errors: number;
  };
}
```

## Services Implementation

### Developer Dashboard Service
```typescript
// src/services/developerDashboardService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase';

export class DeveloperDashboardService {
  // Background Management
  static async uploadBackground(
    file: File,
    metadata: Partial<BackgroundAsset>
  ): Promise<{ success: boolean; backgroundId?: string; error?: string }> {
    try {
      // Validate file
      if (!this.isValidBackgroundFile(file)) {
        return { success: false, error: 'Invalid file type or size' };
      }

      // Generate unique filename
      const filename = `backgrounds/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filename);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Extract colors from image
      const colors = await this.extractColorsFromImage(downloadURL);

      // Create background asset
      const backgroundData: Partial<BackgroundAsset> = {
        ...metadata,
        fileUrl: downloadURL,
        thumbnailUrl: await this.generateThumbnail(downloadURL),
        fileSize: file.size,
        colors,
        metadata: {
          uploadedBy: 'developer', // Get from auth context
          uploadedAt: serverTimestamp(),
          lastModified: serverTimestamp(),
          version: 1
        },
        status: 'draft'
      };

      const docRef = await addDoc(collection(db, 'backgroundAssets'), backgroundData);
      return { success: true, backgroundId: docRef.id };
    } catch (error) {
      console.error('Error uploading background:', error);
      return { success: false, error: 'Upload failed' };
    }
  }

  static async getBackgrounds(category?: string, status?: string): Promise<BackgroundAsset[]> {
    try {
      let q = collection(db, 'backgroundAssets');

      if (category) {
        q = query(q, where('category', '==', category));
      }
      if (status) {
        q = query(q, where('status', '==', status));
      }

      const snapshot = await getDocs(query(q, orderBy('metadata.uploadedAt', 'desc')));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BackgroundAsset[];
    } catch (error) {
      console.error('Error getting backgrounds:', error);
      return [];
    }
  }

  static async updateBackground(
    backgroundId: string, 
    updates: Partial<BackgroundAsset>
  ): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'backgroundAssets', backgroundId), {
        ...updates,
        'metadata.lastModified': serverTimestamp(),
        'metadata.version': serverTimestamp() // Increment version
      });
      return true;
    } catch (error) {
      console.error('Error updating background:', error);
      return false;
    }
  }

  static async deleteBackground(backgroundId: string): Promise<boolean> {
    try {
      // Get background data to delete file
      const backgroundDoc = await getDocs(
        query(collection(db, 'backgroundAssets'), where('__name__', '==', backgroundId))
      );
      
      if (!backgroundDoc.empty) {
        const background = backgroundDoc.docs[0].data() as BackgroundAsset;
        
        // Delete file from storage
        if (background.fileUrl) {
          const fileRef = ref(storage, background.fileUrl);
          await deleteObject(fileRef);
        }
        
        if (background.thumbnailUrl) {
          const thumbRef = ref(storage, background.thumbnailUrl);
          await deleteObject(thumbRef);
        }
      }

      // Delete document
      await deleteDoc(doc(db, 'backgroundAssets', backgroundId));
      return true;
    } catch (error) {
      console.error('Error deleting background:', error);
      return false;
    }
  }

  // Color Theme Management
  static async createColorTheme(theme: Partial<ColorTheme>): Promise<string> {
    const themeData: Partial<ColorTheme> = {
      ...theme,
      createdBy: 'developer',
      createdAt: serverTimestamp(),
      isActive: true
    };

    const docRef = await addDoc(collection(db, 'colorThemes'), themeData);
    return docRef.id;
  }

  static async getColorThemes(): Promise<ColorTheme[]> {
    const snapshot = await getDocs(
      query(collection(db, 'colorThemes'), orderBy('createdAt', 'desc'))
    );
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ColorTheme[];
  }

  // Analytics
  static async getAnalytics(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<AnalyticsSnapshot[]> {
    const now = new Date();
    const startDate = new Date(now);
    
    switch (timeRange) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const q = query(
      collection(db, 'analyticsSnapshots'),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AnalyticsSnapshot[];
  }

  static async getCurrentUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newToday: number;
  }> {
    try {
      // Get total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      // Get active users (logged in within 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const activeUsersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('lastLoginAt', '>=', yesterday)
        )
      );
      const activeUsers = activeUsersSnapshot.size;

      // Get new users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const newUsersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('createdAt', '>=', today)
        )
      );
      const newToday = newUsersSnapshot.size;

      return { totalUsers, activeUsers, newToday };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { totalUsers: 0, activeUsers: 0, newToday: 0 };
    }
  }

  // Utility methods
  private static isValidBackgroundFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  private static async extractColorsFromImage(imageUrl: string): Promise<{
    dominant: string[];
    palette: string[];
  }> {
    // Implementation would use a color extraction library
    // This is a placeholder
    return {
      dominant: ['#FF5733', '#33FF57', '#3357FF'],
      palette: ['#FF5733', '#33FF57', '#3357FF', '#F0F0F0', '#333333']
    };
  }

  private static async generateThumbnail(imageUrl: string): Promise<string> {
    // Implementation would generate a smaller thumbnail
    // For now, return the original URL
    return imageUrl;
  }
}
```

## Frontend Components

### Developer Dashboard Layout
```typescript
// src/app/dev-dashboard/layout.tsx
'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { redirect } from 'next/navigation';
import DeveloperSidebar from '@/components/developer/DeveloperSidebar';

export default function DeveloperDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  // Check if user is developer/admin
  const isDeveloper = user?.role === 'developer' || user?.role === 'admin';

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isDeveloper) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <DeveloperSidebar />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
```

### Main Dashboard Page
```typescript
// src/app/dev-dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { DeveloperDashboardService } from '@/services/developerDashboardService';
import AnalyticsOverview from '@/components/developer/AnalyticsOverview';
import QuickActions from '@/components/developer/QuickActions';
import RecentActivity from '@/components/developer/RecentActivity';

export default function DeveloperDashboard() {
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newToday: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const stats = await DeveloperDashboardService.getCurrentUserStats();
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Developer Dashboard</h1>
        <p className="text-gray-400">Manage DashDice assets and monitor system health</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-400">{userStats.totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Active Users</h3>
          <p className="text-3xl font-bold text-green-400">{userStats.activeUsers.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">New Today</h3>
          <p className="text-3xl font-bold text-yellow-400">{userStats.newToday.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsOverview />
        <QuickActions />
      </div>

      <RecentActivity />
    </div>
  );
}
```

### Background Management Page
```typescript
// src/app/dev-dashboard/backgrounds/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { DeveloperDashboardService } from '@/services/developerDashboardService';
import BackgroundUploader from '@/components/developer/BackgroundUploader';
import BackgroundGrid from '@/components/developer/BackgroundGrid';
import BackgroundPreview from '@/components/developer/BackgroundPreview';

export default function BackgroundManagement() {
  const [backgrounds, setBackgrounds] = useState<BackgroundAsset[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<BackgroundAsset | null>(null);
  const [filter, setFilter] = useState({ category: 'all', status: 'all' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBackgrounds();
  }, [filter]);

  const loadBackgrounds = async () => {
    setIsLoading(true);
    try {
      const categoryFilter = filter.category === 'all' ? undefined : filter.category;
      const statusFilter = filter.status === 'all' ? undefined : filter.status;
      
      const backgroundData = await DeveloperDashboardService.getBackgrounds(
        categoryFilter,
        statusFilter
      );
      setBackgrounds(backgroundData);
    } catch (error) {
      console.error('Error loading backgrounds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackgroundUpload = async (file: File, metadata: Partial<BackgroundAsset>) => {
    const result = await DeveloperDashboardService.uploadBackground(file, metadata);
    if (result.success) {
      await loadBackgrounds();
    }
    return result;
  };

  const handleBackgroundUpdate = async (id: string, updates: Partial<BackgroundAsset>) => {
    const success = await DeveloperDashboardService.updateBackground(id, updates);
    if (success) {
      await loadBackgrounds();
      // Update selected background if it's the one being edited
      if (selectedBackground?.id === id) {
        setSelectedBackground(prev => prev ? { ...prev, ...updates } : null);
      }
    }
    return success;
  };

  const handleBackgroundDelete = async (id: string) => {
    const success = await DeveloperDashboardService.deleteBackground(id);
    if (success) {
      await loadBackgrounds();
      if (selectedBackground?.id === id) {
        setSelectedBackground(null);
      }
    }
    return success;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Background Management</h1>
        <BackgroundUploader onUpload={handleBackgroundUpload} />
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filter.category}
          onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
          className="bg-gray-700 text-white px-3 py-2 rounded-lg"
        >
          <option value="all">All Categories</option>
          <option value="nature">Nature</option>
          <option value="abstract">Abstract</option>
          <option value="space">Space</option>
          <option value="urban">Urban</option>
        </select>

        <select
          value={filter.status}
          onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
          className="bg-gray-700 text-white px-3 py-2 rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Background Grid */}
        <div className="lg:col-span-2">
          <BackgroundGrid
            backgrounds={backgrounds}
            isLoading={isLoading}
            selectedBackground={selectedBackground}
            onSelectBackground={setSelectedBackground}
            onUpdateBackground={handleBackgroundUpdate}
            onDeleteBackground={handleBackgroundDelete}
          />
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <BackgroundPreview
            background={selectedBackground}
            onUpdate={handleBackgroundUpdate}
          />
        </div>
      </div>
    </div>
  );
}
```

### Color Theme Editor
```typescript
// src/components/developer/ColorThemeEditor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { SketchPicker } from 'react-color';

interface ColorThemeEditorProps {
  theme?: ColorTheme;
  onSave: (theme: Partial<ColorTheme>) => Promise<boolean>;
  onClose: () => void;
}

export default function ColorThemeEditor({ theme, onSave, onClose }: ColorThemeEditorProps) {
  const [themeData, setThemeData] = useState<Partial<ColorTheme>>({
    name: '',
    type: 'solid',
    colors: {
      primary: '#3B82F6',
      secondary: '#64748B',
      accent: '#F59E0B',
      background: '#1F2937'
    }
  });
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [isGradientMode, setIsGradientMode] = useState(false);

  useEffect(() => {
    if (theme) {
      setThemeData(theme);
      setIsGradientMode(theme.type === 'gradient');
    }
  }, [theme]);

  const handleColorChange = (color: any, colorKey: string) => {
    setThemeData(prev => ({
      ...prev,
      colors: {
        ...prev.colors!,
        [colorKey]: color.hex
      }
    }));
  };

  const generateGradientCSS = () => {
    if (!isGradientMode || !themeData.gradient) return '';
    
    const { type, direction, stops } = themeData.gradient;
    const stopsCSS = stops?.map(stop => `${stop.color} ${stop.position}%`).join(', ');
    
    switch (type) {
      case 'linear':
        return `linear-gradient(${direction}deg, ${stopsCSS})`;
      case 'radial':
        return `radial-gradient(circle, ${stopsCSS})`;
      case 'conic':
        return `conic-gradient(from ${direction}deg, ${stopsCSS})`;
      default:
        return '';
    }
  };

  const handleSave = async () => {
    const preview = isGradientMode ? generateGradientCSS() : themeData.colors?.primary || '';
    
    const success = await onSave({
      ...themeData,
      preview,
      type: isGradientMode ? 'gradient' : 'solid'
    });
    
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {theme ? 'Edit' : 'Create'} Color Theme
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Theme Name
              </label>
              <input
                type="text"
                value={themeData.name}
                onChange={(e) => setThemeData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                placeholder="Enter theme name..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Theme Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsGradientMode(false)}
                  className={`px-4 py-2 rounded-lg ${
                    !isGradientMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Solid Colors
                </button>
                <button
                  onClick={() => setIsGradientMode(true)}
                  className={`px-4 py-2 rounded-lg ${
                    isGradientMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Gradient
                </button>
              </div>
            </div>

            {/* Color Pickers */}
            {!isGradientMode && (
              <div className="space-y-4">
                {Object.entries(themeData.colors || {}).map(([key, color]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-300 mb-2 capitalize">
                      {key} Color
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveColor(activeColor === key ? null : key)}
                        className="w-12 h-12 rounded-lg border-2 border-gray-600"
                        style={{ backgroundColor: color }}
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => handleColorChange({ hex: e.target.value }, key)}
                        className="bg-gray-700 text-white px-3 py-2 rounded-lg flex-1"
                      />
                    </div>
                    {activeColor === key && (
                      <div className="mt-2">
                        <SketchPicker
                          color={color}
                          onChange={(color) => handleColorChange(color, key)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Gradient Controls */}
            {isGradientMode && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gradient Type
                  </label>
                  <select
                    value={themeData.gradient?.type || 'linear'}
                    onChange={(e) => setThemeData(prev => ({
                      ...prev,
                      gradient: {
                        ...prev.gradient!,
                        type: e.target.value as 'linear' | 'radial' | 'conic'
                      }
                    }))}
                    className="bg-gray-700 text-white px-3 py-2 rounded-lg w-full"
                  >
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                    <option value="conic">Conic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Direction ({themeData.gradient?.direction || 0}°)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={themeData.gradient?.direction || 0}
                    onChange={(e) => setThemeData(prev => ({
                      ...prev,
                      gradient: {
                        ...prev.gradient!,
                        direction: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full"
                  />
                </div>

                {/* Gradient Stops */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color Stops
                  </label>
                  <div className="space-y-2">
                    {themeData.gradient?.stops?.map((stop, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border-2 border-gray-600"
                          style={{ backgroundColor: stop.color }}
                        />
                        <input
                          type="text"
                          value={stop.color}
                          onChange={(e) => {
                            const newStops = [...(themeData.gradient?.stops || [])];
                            newStops[index] = { ...newStops[index], color: e.target.value };
                            setThemeData(prev => ({
                              ...prev,
                              gradient: { ...prev.gradient!, stops: newStops }
                            }));
                          }}
                          className="bg-gray-700 text-white px-2 py-1 rounded flex-1"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={stop.position}
                          onChange={(e) => {
                            const newStops = [...(themeData.gradient?.stops || [])];
                            newStops[index] = { ...newStops[index], position: parseInt(e.target.value) };
                            setThemeData(prev => ({
                              ...prev,
                              gradient: { ...prev.gradient!, stops: newStops }
                            }));
                          }}
                          className="bg-gray-700 text-white px-2 py-1 rounded w-16"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Preview</h3>
            
            {/* Theme Preview */}
            <div className="relative h-64 rounded-lg overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: isGradientMode 
                    ? generateGradientCSS() 
                    : themeData.colors?.background
                }}
              />
              
              {/* Game UI Preview */}
              <div className="absolute inset-4 bg-black bg-opacity-20 rounded-lg p-4">
                <div 
                  className="w-full h-8 rounded mb-4"
                  style={{ backgroundColor: themeData.colors?.primary }}
                />
                <div 
                  className="w-3/4 h-6 rounded mb-2"
                  style={{ backgroundColor: themeData.colors?.secondary }}
                />
                <div 
                  className="w-1/2 h-6 rounded"
                  style={{ backgroundColor: themeData.colors?.accent }}
                />
              </div>
            </div>

            {/* CSS Output */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CSS Output
              </label>
              <textarea
                value={isGradientMode ? generateGradientCSS() : `background-color: ${themeData.colors?.primary}`}
                readOnly
                className="w-full h-20 bg-gray-700 text-white px-3 py-2 rounded-lg font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!themeData.name?.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg"
          >
            Save Theme
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Real-time Game Preview
```typescript
// src/components/developer/GamePreview.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface GamePreviewProps {
  background?: BackgroundAsset;
  colorTheme?: ColorTheme;
  showUI?: boolean;
}

export default function GamePreview({ background, colorTheme, showUI = true }: GamePreviewProps) {
  const [gameState, setGameState] = useState({
    currentPlayer: 'Player 1',
    scores: [0, 0],
    dice: [1, 1, 1, 1, 1],
    timeLeft: 30
  });

  // Simulate game updates
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        dice: Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1),
        timeLeft: prev.timeLeft > 0 ? prev.timeLeft - 1 : 30
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getBackgroundStyle = () => {
    if (background) {
      return {
        backgroundImage: `url(${background.fileUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    
    if (colorTheme) {
      return {
        background: colorTheme.preview
      };
    }
    
    return {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };
  };

  const getUIColors = () => {
    if (colorTheme) {
      return {
        primary: colorTheme.colors.primary,
        secondary: colorTheme.colors.secondary,
        accent: colorTheme.colors.accent,
        background: colorTheme.colors.background
      };
    }
    
    return {
      primary: '#3B82F6',
      secondary: '#64748B',
      accent: '#F59E0B',
      background: '#1F2937'
    };
  };

  const colors = getUIColors();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Live Game Preview</h3>
      
      <div 
        className="relative w-full h-96 rounded-lg overflow-hidden"
        style={getBackgroundStyle()}
      >
        {/* Game Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-20" />
        
        {showUI && (
          <>
            {/* Top UI */}
            <div 
              className="absolute top-4 left-4 right-4 rounded-lg p-3"
              style={{ backgroundColor: `${colors.background}CC` }}
            >
              <div className="flex justify-between items-center text-white">
                <div className="text-lg font-bold">{gameState.currentPlayer}</div>
                <div 
                  className="px-3 py-1 rounded-full font-bold"
                  style={{ backgroundColor: colors.accent }}
                >
                  {gameState.timeLeft}s
                </div>
              </div>
            </div>

            {/* Score Board */}
            <div 
              className="absolute top-4 left-1/2 transform -translate-x-1/2 rounded-lg p-2"
              style={{ backgroundColor: `${colors.primary}CC` }}
            >
              <div className="flex gap-4 text-white font-bold">
                <span>{gameState.scores[0]}</span>
                <span>-</span>
                <span>{gameState.scores[1]}</span>
              </div>
            </div>

            {/* Dice Area */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="flex gap-2">
                {gameState.dice.map((die, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: `${colors.secondary}DD` }}
                  >
                    {die}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: colors.primary }}
              >
                Roll
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: colors.accent }}
              >
                Hold
              </button>
            </div>
          </>
        )}

        {/* Preview Label */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          PREVIEW
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mt-4">
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={showUI}
            onChange={(e) => {}}
            className="rounded"
          />
          Show UI Elements
        </label>
        
        <div className="text-sm text-gray-400">
          {background?.name || colorTheme?.name || 'Default Theme'}
        </div>
      </div>
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Developer authentication and routing
- Basic dashboard layout and navigation
- User analytics and metrics display

### Phase 2: Asset Management (Week 2)
- Background upload and management system
- File storage and thumbnail generation
- Basic preview functionality

### Phase 3: Color System (Week 3)
- Color theme editor with gradients
- Real-time preview integration
- Color extraction from images

### Phase 4: Advanced Features (Week 4)
- Shop integration for asset management
- Analytics dashboard with charts
- System monitoring and health checks

This developer dashboard provides a comprehensive tool for managing DashDice assets with real-time previews, making it easy to add new content and visualize changes before deployment.
