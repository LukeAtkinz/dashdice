'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { motion } from 'framer-motion';

export const LoginPageComponent: React.FC = () => {
  const router = useRouter();

  return (
    <>
      <style jsx global>{`
        .forms-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="relative z-20 w-full max-w-6xl mx-auto px-4 py-4 md:py-8 min-h-screen flex items-center">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 w-full lg:items-center">
        {/* Left Side - Content Container */}
        <motion.div 
          className="text-center lg:text-left order-1 lg:order-1 mb-8 lg:mb-0 flex flex-col justify-center lg:fixed lg:left-1/2 lg:top-1/2 lg:transform lg:-translate-x-full lg:-translate-y-1/2 lg:-ml-12"
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
            className="text-2xl md:text-4xl text-white mb-4 md:mb-6"
            style={{ fontFamily: "Audiowide" }}
          >
            WELCOME BACK
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 mb-6 md:mb-8 leading-relaxed">
            Ready to roll the dice again? Sign in to continue your journey.
          </p>
          
          {/* Features - Hidden on mobile to save space */}
          <div className="hidden lg:block space-y-4">
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
        
        {/* Right Side - Forms Container */}
        <motion.div 
          className="forms-container w-full order-2 lg:order-2 space-y-6 lg:fixed lg:left-1/2 lg:top-1/2 lg:transform lg:-translate-y-1/2 lg:w-[500px] lg:h-screen lg:overflow-y-auto lg:py-8 lg:px-4"
          style={{
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE and Edge
          }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Login Form */}
          <div 
            className="backdrop-blur-lg bg-black/40 rounded-3xl p-6 lg:p-6 border border-white/20 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)',
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

          {/* Authentication Options */}
          <div 
            className="backdrop-blur-lg bg-black/40 rounded-3xl p-6 lg:p-6 border border-white/20 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="text-center mb-8">
              <h2 
                className="text-xl text-white mb-2"
                style={{ fontFamily: "Audiowide" }}
              >
                QUICK ACCESS
              </h2>
              <p className="text-white/70">Alternative sign in options</p>
            </div>
            
            <div className="space-y-4">
              {/* Google Sign In Button */}
              <GoogleSignInButton 
                text="Sign in with Google"
                onSuccess={() => router.push('/dashboard')}
              />

              {/* Apple Sign In Button */}
              <AppleSignInButton 
                text="Sign in with Apple"
                onSuccess={() => router.push('/dashboard')}
              />

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-black/60 text-white/60 rounded-lg backdrop-blur-sm" style={{ fontFamily: "Audiowide" }}>
                    OR
                  </span>
                </div>
              </div>

              {/* Continue as Guest */}
              <Link href="/">
                <button 
                  className="w-full py-3 px-6 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg border border-white/20"
                  style={{ fontFamily: "Audiowide" }}
                >
                  CONTINUE AS GUEST
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
      </div>
    </>
  );
};