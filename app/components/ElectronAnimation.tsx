"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ElectronAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Reset animation state on component mount
    setIsAnimating(false);
  }, []);

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  return (
    <div className="flex items-center justify-center h-80 bg-gray-800">
      <div className="relative w-[300px] h-[300px]">
        <svg width="300" height="300" viewBox="0 0 300 300">
          {/* Electron orbit */}
          <circle
            cx="150"
            cy="150"
            r="80"
            fill="none"
            stroke="#bdc3c7"
            strokeWidth="2"
          />

          {/* Electron */}
          <AnimatePresence>
            {isAnimating && (
              <motion.g
                key="electron"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  ease: "linear",
                  repeat: Infinity,
                }}
                style={{
                  originX: "50%",
                  originY: "50%",
                  transformOrigin: "150px 150px",
                }}
              >
                <circle cx="150" cy="70" r="6" fill="#3498db" />
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        {/* Nucleus Button */}
        <button
          onClick={toggleAnimation}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition-colors duration-300 text-white font-bold text-sm"
          aria-label={isAnimating ? "Pause animation" : "Play animation"}
        >
          {isAnimating ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}
