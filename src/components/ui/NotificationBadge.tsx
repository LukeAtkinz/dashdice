import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export default function NotificationBadge({ count, className = '' }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <div className={`absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white shadow-lg ${className}`}>
      {count > 99 ? '99+' : count}
    </div>
  );
}
