import { motion, AnimatePresence } from 'framer-motion';

// Helper component to test the corrected structure
export function TestPowerTabFix() {
  return (
    <motion.div 
      className="rounded-2xl p-1 overflow-hidden relative -mt-2"
    >
      <div className="relative z-10">
        {/* Category-Based Loadout Slots Grid - Mobile Compact */}
        <AnimatePresence mode="wait">
          <motion.div
            className="grid grid-cols-5 gap-2 mt-8"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {[1,2,3,4,5].map((item, index) => (
              <motion.div
                key={`slot-${index}`}
                className="relative group"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="aspect-square rounded-lg p-2 border-2 backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src="/Abilities/placeholder.webp"
                      alt="Test"
                      className="w-12 h-12 object-contain opacity-100"
                      style={{
                        filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))'
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}