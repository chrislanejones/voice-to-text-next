"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mic, MicOff, StopCircle } from "lucide-react";

interface DictationButtonProps {
  isRecording: boolean;
  disabled?: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export default function DictationButton({
  isRecording,
  disabled = false,
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

  // Reduced motion: the atom still appears, but the electrons hold still,
  // the glow stops pulsing, and hover/press scaling is off.
  const reduceMotion = useReducedMotion();

  // Electron configuration - 3 electrons with different speeds and starting positions
  const electrons = [
    { duration: 2, startAngle: 0, color: "#ef4444", orbitSize: 100 },
    { duration: 2.5, startAngle: 120, color: "#3b82f6", orbitSize: 100 },
    { duration: 3, startAngle: 240, color: "#22c55e", orbitSize: 100 },
  ];

  const label = disabled
    ? "Dictation unavailable"
    : isRecording
      ? "Stop recording"
      : "Start recording";
  const hint = disabled ? "" : isRecording ? "Tap to stop" : "Tap to talk";

  return (
    <div className="flex w-full flex-col items-center justify-center gap-1">
      <div className="relative w-[120px] h-[120px] flex items-center justify-center">
        {/* Dashed orbit ring */}
        <AnimatePresence>
          {isRecording && (
            <motion.svg
              className="absolute text-slate-400 dark:text-slate-500"
              aria-hidden="true"
              width="100"
              height="100"
              viewBox="0 0 100 100"
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
              transition={{ duration: reduceMotion ? 0.15 : 0.3 }}
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.6"
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
                aria-hidden="true"
                initial={{ opacity: 0, rotate: electron.startAngle }}
                animate={{
                  opacity: 1,
                  rotate: reduceMotion
                    ? electron.startAngle
                    : electron.startAngle + 360,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: reduceMotion ? 0.15 : 0.3 },
                  rotate: reduceMotion
                    ? { duration: 0 }
                    : {
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
              aria-hidden="true"
              initial={{ opacity: 0, scale: 1 }}
              animate={
                reduceMotion
                  ? { opacity: 0.3, scale: 1.15 }
                  : { opacity: [0.2, 0.4, 0.2], scale: [1, 1.3, 1] }
              }
              exit={{ opacity: 0, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0.15 }
                  : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              }
            />
          )}
        </AnimatePresence>

        {/* Center button - 64px size. White icon: 5.3:1 on blue-600,
            4.8:1 on red-600. */}
        <motion.button
          type="button"
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card ${
            disabled
              ? "cursor-not-allowed bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              : isRecording
                ? "bg-red-600 text-white shadow-lg hover:bg-red-700"
                : "bg-blue-600 text-white shadow-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          }`}
          whileHover={disabled || reduceMotion ? undefined : { scale: 1.05 }}
          whileTap={disabled || reduceMotion ? undefined : { scale: 0.95 }}
          disabled={disabled}
          onClick={isRecording ? handleStopClick : handleStartClick}
          aria-label={label}
        >
          {disabled ? (
            <MicOff className="w-8 h-8" aria-hidden="true" />
          ) : isRecording ? (
            <StopCircle className="w-8 h-8" aria-hidden="true" />
          ) : (
            <Mic className="w-8 h-8" aria-hidden="true" />
          )}
        </motion.button>
      </div>
      {/* Visible cue for the icon-only button; the button's own label
          already says this to screen readers. */}
      <p className="min-h-5 text-sm text-muted-foreground" aria-hidden="true">
        {hint}
      </p>
    </div>
  );
}
