import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export default function NotificationBadge({ count, className = '' }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <div className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white ${className}`}>
      {count > 99 ? '99+' : count}
    </div>
  );
}
