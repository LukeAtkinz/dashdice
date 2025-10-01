'use client';

import React from 'react';

interface ScrollablePageWrapperProps {
  children: React.ReactNode;
}

export const ScrollablePageWrapper: React.FC<ScrollablePageWrapperProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative">
      {/* Scrollable Content Container */}
      <div className="relative z-10 min-h-screen overflow-y-auto">
        {/* Standard layout for all screen sizes */}
        <div className="min-h-screen flex items-center justify-center py-8">
          {children}
        </div>
      </div>
    </div>
  );
};