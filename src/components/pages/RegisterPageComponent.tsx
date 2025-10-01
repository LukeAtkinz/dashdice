'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { motion } from 'framer-motion';

export const RegisterPageComponent: React.FC = () => {
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
            JOIN THE GAME
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 mb-6 md:mb-8 leading-relaxed">
            Create your account and start your journey in the ultimate dice gaming experience.
          </p>
          
          {/* What You Get - Reduced on mobile */}
          <div className="lg:space-y-4">
            <h3 className="hidden lg:block text-lg text-yellow-400 font-bold mb-4" style={{ fontFamily: "Audiowide" }}>
              WHAT YOU GET:
            </h3>
            {/* Show fewer items on mobile */}
            <div className="space-y-2 lg:space-y-4">
              <div className="flex items-center gap-4 justify-center lg:justify-start">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Access to all game modes</span>
              </div>
              <div className="hidden lg:flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">6 Premium backgrounds instantly</span>
              </div>
              <div className="flex items-center gap-4 lg:hidden justify-center lg:justify-start">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Friends & achievements</span>
              </div>
              <div className="hidden lg:flex items-center gap-4 justify-center lg:justify-start">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Friends & chat system</span>
              </div>
              <div className="hidden lg:flex items-center gap-4 justify-center lg:justify-start">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Achievement tracking</span>
              </div>
              <div className="hidden lg:flex items-center gap-4 justify-center lg:justify-start">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-white/90">Ranked gameplay & leaderboards</span>
              </div>
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
          {/* Register Form */}
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
                QUICK SIGNUP
              </h2>
              <p className="text-white/70">Alternative registration options</p>
            </div>
            
            <div className="space-y-4">
              {/* Google Sign In Button */}
              <GoogleSignInButton 
                text="Sign up with Google"
                onSuccess={() => router.push('/dashboard')}
              />

              {/* Apple Sign In Button */}
              <AppleSignInButton 
                text="Sign up with Apple"
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