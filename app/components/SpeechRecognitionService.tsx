"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Define types for the Web Speech API
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

// Silence timeout in milliseconds
const SILENCE_TIMEOUT = 5000;

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Refs for stable references
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastResultTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false); // Track state in ref for callbacks

  // Update the ref whenever isRecording changes
  useEffect(() => {
    isRecordingRef.current = isRecording;
    console.log("SpeechService: isRecording changed to", isRecording);
  }, [isRecording]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    console.log("Stopping recording called");

    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Force UI update first to ensure immediate feedback
    setIsRecording(false);

    if (!recognitionRef.current) {
      console.log("No recognition ref available");
      return;
    }

    try {
      console.log(
        "Attempting to stop recognition, current state:",
        isRecordingRef.current
      );
      recognitionRef.current.stop();
      console.log("Recognition stopped successfully");
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  }, []);

  // Start recording function
  const startRecording = useCallback(() => {
    console.log("Start recording called");

    if (!recognitionRef.current) {
      console.error("Speech recognition not available");
      setError("Speech recognition not available");
      return;
    }

    try {
      // Reset state and prepare for recording
      setError(null);
      setTranscription("");

      // Start recognition
      console.log("Starting recognition...");
      recognitionRef.current.start();
      console.log("Recognition started!");

      // Update state immediately for UI feedback
      setIsRecording(true);

      // Setup silence detection
      lastResultTimeRef.current = Date.now();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      silenceTimeoutRef.current = setTimeout(() => {
        console.log("Initial silence detected");
        if (isRecordingRef.current) {
          stopRecording();
        }
      }, SILENCE_TIMEOUT);
    } catch (error) {
      console.error("Error starting recording:", error);

      // Try to recover by stopping first if already running
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        console.log("Recognition was already running, stopping first...");
        try {
          recognitionRef.current.stop();
          console.log("Successfully stopped recognition");

          // Try again after a delay
          setTimeout(() => {
            console.log("Attempting to restart recognition");
            try {
              recognitionRef.current?.start();
              setIsRecording(true);
              console.log("Successfully restarted recognition");
            } catch (retryError) {
              console.error("Failed to restart recognition:", retryError);
              setError(
                "Failed to start recording. Please refresh and try again."
              );
            }
          }, 300);
        } catch (stopError) {
          console.error("Failed to stop existing recognition:", stopError);
          setError("Failed to reset recording state. Please refresh the page.");
        }
      } else {
        setError(
          "Failed to start recording: " +
            (error instanceof Error ? error.message : String(error))
        );
      }
    }
  }, [stopRecording]);

  // Initialize speech recognition once
  useEffect(() => {
    console.log("Initializing speech recognition...");
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;
      console.log("Speech recognition initialized successfully");
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      setError("Failed to initialize speech recognition.");
    }

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up speech recognition");
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      try {
        if (isRecordingRef.current && recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    };
  }, []);

  // Event handlers
  const handleResult = useCallback(
    (event: SpeechRecognitionEvent): void => {
      console.log("Speech recognition result received");
      lastResultTimeRef.current = Date.now();

      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const newTranscription = finalTranscript || interimTranscript;
      if (newTranscription) {
        console.log("New transcription:", newTranscription);
        setTranscription((prev) => newTranscription || prev);
      }

      // Reset silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      silenceTimeoutRef.current = setTimeout(() => {
        console.log("Silence detected, stopping recording");
        if (isRecordingRef.current) {
          stopRecording();
        }
      }, SILENCE_TIMEOUT);
    },
    [stopRecording]
  );

  const handleEnd = useCallback((): void => {
    console.log("Recognition ended event fired");

    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Ensure UI is updated
    setIsRecording(false);
  }, []);

  const handleError = useCallback(
    (event: SpeechRecognitionErrorEvent): void => {
      console.error("Speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    },
    []
  );

  // Set up event listeners
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      console.log("No recognition object available for event listeners");
      return;
    }

    console.log("Setting up speech recognition event listeners");

    // Add event listeners
    recognition.addEventListener("result", handleResult);
    recognition.addEventListener("end", handleEnd);
    recognition.addEventListener("error", handleError);

    // Cleanup function
    return () => {
      console.log("Removing speech recognition event listeners");
      recognition.removeEventListener("result", handleResult);
      recognition.removeEventListener("end", handleEnd);
      recognition.removeEventListener("error", handleError);
    };
  }, [handleResult, handleEnd, handleError]);

  return {
    isRecording,
    transcription,
    error,
    startRecording,
    stopRecording,
  };
}
