'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation, DashboardSection } from '@/context/NavigationContext';
import { Button } from '@/components/ui/Button';

interface NavigationItem {
  id: DashboardSection;
  label: string;
  icon: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    description: 'Overview and quick stats'
  },
  {
    id: 'match',
    label: 'Match',
    icon: '🎲',
    description: 'Create or join games'
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: '🎒',
    description: 'Manage your items'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: '👤',
    description: 'Account settings'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    description: 'App preferences'
  }
];

export const DashboardNavigation: React.FC = () => {
  const { currentSection, setCurrentSection } = useNavigation();

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-orbitron font-bold text-blue-600">
              DashDice
            </h1>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex space-x-1">
            {navigationItems.map((item) => {
              const isActive = currentSection === item.id;
              
              return (
                <div key={item.id} className="relative">
                  <Button
                    variant={isActive ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentSection(item.id)}
                    className="flex items-center space-x-2 relative"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      initial={false}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <select
              value={currentSection}
              onChange={(e) => setCurrentSection(e.target.value as DashboardSection)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {navigationItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.icon} {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
