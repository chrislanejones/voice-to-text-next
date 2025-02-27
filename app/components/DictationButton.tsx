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
  // Debug logging for state changes
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

  return (
    <div className="relative w-[160px] h-[160px] flex items-center justify-center">
      {/* Orbit path */}
      <AnimatePresence>
        {isRecording && (
          <motion.svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            className="absolute"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="orbit-path"
          >
            <circle
              cx="80"
              cy="80"
              r="68"
              fill="none"
              stroke="#bdc3c7"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Animating electron */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            className="absolute w-5 h-5 bg-red-600 rounded-full shadow-md"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{
              rotate: {
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              },
              opacity: { duration: 0.2 },
            }}
            style={{
              transformOrigin: "55px 60px",
              top: 0,
              left: "25px",
              marginTop: "15px",
              marginLeft: "-2px",
            }}
            key="electron"
          />
        )}
      </AnimatePresence>

      {/* Button container with z-index to ensure it's clickable */}
      <div className="relative z-10">
        {isRecording ? (
          <button
            onClick={handleStopClick}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors duration-300 focus:outline-none cursor-pointer"
            aria-label="Stop recording"
            type="button"
          >
            <StopCircle className="h-8 w-8 text-white" />
          </button>
        ) : (
          <button
            onClick={handleStartClick}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 transition-colors duration-300 focus:outline-none cursor-pointer"
            aria-label="Start recording"
            type="button"
          >
            <Mic className="h-8 w-8 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
