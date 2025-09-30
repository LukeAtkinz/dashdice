'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { motion } from 'framer-motion';

export default function RegisterPage() {
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
              JOIN THE GAME
            </h1>
            
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              Create your account and start your journey in the ultimate dice gaming experience. Compete, collect, and conquer!
            </p>
            
            {/* What You Get */}
            <div className="space-y-4">
              <h3 className="text-lg text-yellow-400 font-bold mb-4" style={{ fontFamily: "Audiowide" }}>
                WHAT YOU GET:
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">6 Premium backgrounds instantly</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Access to all game modes</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Friends & chat system</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Achievement tracking</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Ranked gameplay & leaderboards</span>
              </div>
            </div>
          </motion.div>
          
          {/* Right Side - Register Form */}
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
                  CREATE ACCOUNT
                </h2>
                <p className="text-white/70">Join thousands of players worldwide</p>
              </div>
              
              <RegisterForm onSuccess={() => router.push('/dashboard')} />
              
              {/* Sign In Link */}
              <div className="text-center mt-8 pt-6 border-t border-white/20">
                <p className="text-white/80 mb-4">
                  Already have an account?
                </p>
                <Link href="/login">
                  <button 
                    className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ fontFamily: "Audiowide" }}
                  >
                    SIGN IN
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
