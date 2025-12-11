"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, StopCircle } from "lucide-react";

interface DictationButtonProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export default function DictationButton({
  isRecording,
  onStartRecording,
  onStopRecording,
}: DictationButtonProps) {
  useEffect(() => {
    console.log("DictationButton: isRecording changed to", isRecording);
  }, [isRecording]);

  const handleStartClick = () => {
    console.log("Start button clicked, calling onStartRecording");
    onStartRecording();
  };

  const handleStopClick = () => {
    console.log("Stop button clicked, calling onStopRecording");
    onStopRecording();
  };

  // Electron configuration - 3 electrons with different speeds and starting positions
  const electrons = [
    { duration: 2, startAngle: 0, color: "#ef4444", orbitSize: 100 },
    { duration: 2.5, startAngle: 120, color: "#3b82f6", orbitSize: 100 },
    { duration: 3, startAngle: 240, color: "#22c55e", orbitSize: 100 },
  ];

  return (
    <div className="flex items-center justify-center w-full">
      <div className="relative w-[120px] h-[120px] flex items-center justify-center">
        {/* Dashed orbit ring */}
        <AnimatePresence>
          {isRecording && (
            <motion.svg
              className="absolute"
              width="100"
              height="100"
              viewBox="0 0 100 100"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.5"
              />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Orbiting electrons */}
        <AnimatePresence>
          {isRecording &&
            electrons.map((electron, index) => (
              <motion.div
                key={`electron-${index}`}
                className="absolute w-[100px] h-[100px]"
                initial={{ opacity: 0, rotate: electron.startAngle }}
                animate={{ opacity: 1, rotate: electron.startAngle + 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.3 },
                  rotate: {
                    duration: electron.duration,
                    repeat: Infinity,
                    ease: "linear",
                  },
                }}
              >
                <div
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: electron.color,
                    top: "-6px",
                    left: "50%",
                    marginLeft: "-6px",
                    boxShadow: `0 0 8px 3px ${electron.color}80`,
                  }}
                />
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Glow effect when recording */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              className="absolute w-16 h-16 rounded-full bg-red-500/20 z-0"
              initial={{ opacity: 0, scale: 1 }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.3, 1],
              }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </AnimatePresence>

        {/* Center button - 64px size */}
        <motion.button
          className={`relative z-10 w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-colors ${
            isRecording
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isRecording ? handleStopClick : handleStartClick}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? (
            <StopCircle className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
