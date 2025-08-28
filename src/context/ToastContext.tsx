'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  icon?: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type'], duration?: number, icon?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast['type'] = 'info', duration: number = 3000, icon?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration, icon };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-br from-green-700/95 via-emerald-700/95 to-green-800/95 border-green-400/60 shadow-green-500/20';
      case 'error':
        return 'bg-gradient-to-br from-red-700/95 via-red-600/95 to-red-800/95 border-red-400/60 shadow-red-500/20';
      case 'warning':
        return 'bg-gradient-to-br from-yellow-700/95 via-amber-600/95 to-yellow-800/95 border-yellow-400/60 shadow-yellow-500/20';
      default:
        return 'bg-gradient-to-br from-blue-700/95 via-blue-600/95 to-blue-800/95 border-blue-400/60 shadow-blue-500/20';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-xs md:max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30 
              }}
              className={`
                ${getToastStyles(toast.type)} 
                border rounded-xl p-4 shadow-2xl backdrop-blur-lg
                cursor-pointer relative overflow-hidden
              `}
              onClick={() => removeToast(toast.id)}
            >
              {/* Animated background accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 
                            animate-pulse opacity-60"></div>
              
              <div className="relative z-10 flex items-center gap-3">
                {/* Game mode icon or status indicator */}
                {toast.icon ? (
                  <img 
                    src={toast.icon} 
                    alt="Game Mode" 
                    className="w-6 h-6 md:w-8 md:h-8 object-contain opacity-90 drop-shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={`w-2 h-2 rounded-full shadow-lg ${
                    toast.type === 'success' ? 'bg-green-400 shadow-green-400/50' :
                    toast.type === 'error' ? 'bg-red-400 shadow-red-400/50' :
                    toast.type === 'warning' ? 'bg-yellow-400 shadow-yellow-400/50' :
                    'bg-blue-400 shadow-blue-400/50'
                  } animate-pulse`}></div>
                )}
                
                <p className="text-white text-sm md:text-base font-medium font-audiowide tracking-wide flex-1">
                  {toast.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
