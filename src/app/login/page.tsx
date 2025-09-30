'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          webkit-playsinline="true"
          className="fixed inset-0 w-full h-full object-cover z-0"
        >
          <source src="/backgrounds/New Day.mp4" type="video/mp4" />
        </video>
        
        {/* Dark Overlay */}
        <div className="fixed inset-0 bg-black/60 z-10" />
        
        {/* Loading Spinner */}
        <div className="relative z-20 min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mb-4"></div>
            <p className="text-white text-lg" style={{ fontFamily: "Audiowide" }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        webkit-playsinline="true"
        className="fixed inset-0 w-full h-full object-cover z-0"
      >
        <source src="/backgrounds/New Day.mp4" type="video/mp4" />
      </video>
      
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black/50 z-10" />
      
      {/* Main Content */}
      <div className="relative z-20 w-full max-w-6xl mx-auto px-4 py-8 min-h-screen flex items-center lg:items-center overflow-y-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left Side - Branding */}
          <motion.div 
            className="text-center lg:text-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo and Title */}
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-8">
              <img
                src="/Design Elements/CrownLogo.webp"
                alt="DashDice Logo"
                className="w-16 h-16 md:w-20 md:h-20"
              />
              <div
                className="text-4xl md:text-6xl bg-gradient-to-br from-[#ffd700] to-[#ffed4e] bg-clip-text text-transparent"
                style={{ fontFamily: "Audiowide" }}
              >
                DashDice
              </div>
            </div>
            
            {/* Welcome Message */}
            <h1 
              className="text-3xl md:text-4xl text-white mb-6"
              style={{ fontFamily: "Audiowide" }}
            >
              WELCOME BACK
            </h1>
            
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              Ready to roll the dice again? Sign in to continue your journey and compete with players worldwide.
            </p>
            
            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Compete in multiple game modes</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Build your collection & inventory</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Rise through the ranks</span>
              </div>
            </div>
          </motion.div>
          
          {/* Right Side - Login Form */}
          <motion.div 
            className="w-full max-w-md mx-auto"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Form Container */}
            <div 
              className="backdrop-blur-lg bg-black/30 rounded-3xl p-8 border border-white/20 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div className="text-center mb-8">
                <h2 
                  className="text-2xl text-white mb-2"
                  style={{ fontFamily: "Audiowide" }}
                >
                  SIGN IN
                </h2>
                <p className="text-white/70">Enter your credentials to continue</p>
              </div>
              
              <LoginForm onSuccess={() => router.push('/dashboard')} />
              
              {/* Sign Up Link */}
              <div className="text-center mt-8 pt-6 border-t border-white/20">
                <p className="text-white/80 mb-4">
                  New to DashDice?
                </p>
                <Link href="/register">
                  <button 
                    className="w-full py-3 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ fontFamily: "Audiowide" }}
                  >
                    CREATE ACCOUNT
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Back to Guest Mode */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Link 
            href="/" 
            className="text-white/60 hover:text-white/80 transition-colors underline"
            style={{ fontFamily: "Audiowide" }}
          >
            Continue as Guest
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
