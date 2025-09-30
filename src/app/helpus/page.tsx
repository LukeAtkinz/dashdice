'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { useBackground } from '@/context/BackgroundContext';

const DonationPage: React.FC = () => {
  const { DisplayBackgroundEquip } = useBackground();
  const [currentAmount, setCurrentAmount] = useState(2450); // Current raised amount
  const goalAmount = 30000; // £30,000 goal
  const progressPercentage = (currentAmount / goalAmount) * 100;

  // Animate the progress bar on load
  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progressPercentage);
    }, 500);
    return () => clearTimeout(timer);
  }, [progressPercentage]);

  return (
    <Layout>
      <div className="min-h-screen relative">
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

        <div className="relative z-20 min-h-screen flex flex-col overflow-y-auto">
          <div className="container mx-auto px-4 py-8 max-w-4xl flex-1">
            {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6" style={{ fontFamily: 'Audiowide' }}>
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                🏆 Ranked Mode
              </span>
            </h1>
            <h2 className="text-3xl md:text-4xl text-white/90 mb-4" style={{ fontFamily: 'Audiowide' }}>
              Coming Soon
            </h2>
            <p className="text-xl md:text-2xl text-white/80 font-bold" style={{ fontFamily: 'Montserrat' }}>
              Help Us Get There!
            </p>
          </motion.div>

          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-12"
          >
            <div 
              className="backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl md:text-3xl text-white font-bold mb-2" style={{ fontFamily: 'Audiowide' }}>
                  🎯 Our Goal
                </h3>
                <p className="text-white/80" style={{ fontFamily: 'Montserrat' }}>
                  £30,000 — UK gaming licence and marketing budget
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="relative mb-4">
                <div className="w-full h-6 bg-black/40 rounded-full overflow-hidden border border-white/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${animatedProgress}%` }}
                    transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
                  >
                    {/* Animated shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                  </motion.div>
                </div>
              </div>
              
              <div className="flex justify-between text-white font-bold text-lg" style={{ fontFamily: 'Montserrat' }}>
                <span>£{currentAmount.toLocaleString()}</span>
                <span>{progressPercentage.toFixed(1)}%</span>
                <span>£{goalAmount.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          {/* Story Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-12"
          >
            <div 
              className="backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <h3 className="text-3xl text-white font-bold mb-6" style={{ fontFamily: 'Audiowide' }}>
                🚀 Our Story
              </h3>
              <p className="text-white/90 text-lg leading-relaxed" style={{ fontFamily: 'Montserrat' }}>
                Dashdice started as a simple idea: an online PvP dice game where strategy, luck, and competition collide. 
                We've built the free-to-play core, but now we're ready to unlock the next big stage: <strong>Ranked Mode</strong>.
              </p>
              <p className="text-white/90 text-lg leading-relaxed mt-4" style={{ fontFamily: 'Montserrat' }}>
                To make it real, we need your help. Licensing and launch costs are high (£30,000), and every contribution 
                pushes us closer to bringing competitive Dashdice to the world.
              </p>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mb-12"
          >
            <h3 className="text-3xl text-white font-bold mb-8 text-center" style={{ fontFamily: 'Audiowide' }}>
              🔓 Ranked Will Unlock
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: '🎯', title: 'Tournaments', desc: 'real entry + prize pools.' },
                { icon: '🏅', title: 'Leaderboards', desc: 'global rankings to prove your skill.' },
                { icon: '🎨', title: 'Skins & Cosmetics', desc: 'exclusive ways to stand out.' },
                { icon: '⚡', title: 'Dashes', desc: 'league play where you can climb, compete, and win.' }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                  className="backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl hover:border-white/30 transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)',
                    backdropFilter: 'blur(15px)'
                  }}
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h4 className="text-xl text-white font-bold mb-2" style={{ fontFamily: 'Audiowide' }}>
                    {feature.title}
                  </h4>
                  <p className="text-white/80" style={{ fontFamily: 'Montserrat' }}>
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Rewards Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mb-12"
          >
            <div 
              className="backdrop-blur-lg rounded-3xl p-8 border border-yellow-400/30 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.1) 50%, rgba(255,69,0,0.1) 100%)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <h3 className="text-3xl text-white font-bold mb-6" style={{ fontFamily: 'Audiowide' }}>
                🎁 Perks for Supporters
              </h3>
              <p className="text-white/90 text-lg mb-6" style={{ fontFamily: 'Montserrat' }}>
                Every donation comes with exclusive in-game rewards as our thank-you:
              </p>
              <div className="space-y-4">
                {[
                  '🖼️ Exclusive Backgrounds only for early backers.',
                  '🥇 Golden Names to stand out in every match.',
                  '🎟️ Early Access to new features before public release.',
                  '🏷️ Founder\'s Tag — permanent recognition as someone who helped build Dashdice.',
                  '🎮 Bigger donations = bigger rewards (think skins, bundles, early Ranked months).'
                ].map((reward, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                    className="text-white/90 text-lg" style={{ fontFamily: 'Montserrat' }}
                  >
                    {reward}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Why Donate Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="mb-12"
          >
            <div 
              className="backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <h3 className="text-3xl text-white font-bold mb-6" style={{ fontFamily: 'Audiowide' }}>
                💡 Why Donate?
              </h3>
              <div className="space-y-4">
                {[
                  '✅ You\'re helping unlock real money competition.',
                  '✅ You\'ll grow the prize pools with us — bigger community = bigger wins.',
                  '✅ You\'ll be part of the founding community, forever remembered in Dashdice.'
                ].map((reason, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
                    className="text-white/90 text-lg font-medium" style={{ fontFamily: 'Montserrat' }}
                  >
                    {reason}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Donation Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="text-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 md:px-12 py-4 md:py-6 text-xl md:text-2xl font-bold rounded-2xl transition-all duration-300 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              style={{
                fontFamily: 'Audiowide'
              }}
            >
              <span className="relative z-10">
                💰 DONATE NOW
              </span>
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse rounded-2xl transition-opacity duration-300" />
            </motion.button>
            <p className="text-white/70 mt-4 text-sm" style={{ fontFamily: 'Montserrat' }}>
              Functionality coming soon — we're setting up secure payment processing
            </p>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="text-center mt-16"
          >
            <p className="text-white/80 text-lg italic" style={{ fontFamily: 'Montserrat' }}>
              "Every penny brings us closer to launch, prize pools, and the future of competitive dice."
            </p>
          </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DonationPage;