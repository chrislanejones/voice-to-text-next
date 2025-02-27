"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, StopCircle } from "lucide-react";
import CardSection from "./CardSection";
import Modal from "./Modal";
import { ModeToggle } from "./DarkLightToggle";

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
      prototype: SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
      prototype: SpeechRecognition;
    };
  }
}

const STORAGE_KEY = "voice-to-text-history";

export default function DictationApp(): React.ReactElement {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>("");

  const recognitionRef = React.useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error("Failed to parse saved history:", error);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const newRecognition = new SpeechRecognition();
      newRecognition.continuous = true;
      newRecognition.interimResults = true;
      recognitionRef.current = newRecognition;
    } else {
      setError("Speech recognition is not supported in this browser.");
    }
  }, []);

  const startRecording = useCallback((): void => {
    if (recognitionRef.current) {
      setError(null);
      setTranscription("");
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }, []);

  const stopRecording = useCallback((): void => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) return;

    const handleResult = (event: SpeechRecognitionEvent): void => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setTranscription(finalTranscript || interimTranscript);
    };

    const handleEnd = (): void => {
      setIsRecording(false);
      if (transcription) {
        setHistory((prev) => [transcription, ...prev].slice(0, 10)); // Limit history to 10 entries
      }
    };

    const handleError = (event: SpeechRecognitionErrorEvent): void => {
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognitionRef.current.addEventListener("result", handleResult);
    recognitionRef.current.addEventListener("end", handleEnd);
    recognitionRef.current.addEventListener("error", handleError);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.removeEventListener("result", handleResult);
        recognitionRef.current.removeEventListener("end", handleEnd);
        recognitionRef.current.removeEventListener("error", handleError);
      }
    };
  }, [transcription]);

  const handleDeleteHistory = (index: number): void => {
    setHistory((prev) => {
      const newHistory = [...prev];
      newHistory.splice(index, 1);
      return newHistory;
    });
  };

  const handleOpenModal = (text: string): void => {
    setSelectedText(text);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4">
      {/* Dictation container */}
      <div className="p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-[800px] dark:bg-slate-600 bg-slate-400">
        <h1 className="text-2xl sm:text-3xl text-center font-bold mb-4 sm:mb-6">
          Voice to Text Dictation
        </h1>

        {/* Stack layout on mobile, side by side on larger screens */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Control buttons container */}
          <div className="w-full sm:w-[200px]">
            <Button
              variant="destructive"
              onClick={isRecording ? stopRecording : startRecording}
              className="w-full"
            >
              {isRecording ? (
                <>
                  <StopCircle className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">Start Dictation</span>
                </>
              )}
            </Button>
          </div>

          {/* Transcription container */}
          <div className="flex-1">
            <div className="dark:bg-zinc-800 bg-zinc-300 p-3 sm:p-4 rounded min-h-[100px] max-h-[300px] sm:max-h-[400px] overflow-y-auto inset-shadow-2">
              <p className="text-sm font-medium mb-2">Transcription:</p>
              <p className="text-sm">{transcription}</p>
            </div>
            {error && (
              <div className="mt-4 p-3 sm:p-4 bg-red-900 text-red-100 rounded text-sm">
                Error: {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CardSection with responsive positioning */}
      <div className="w-full max-w-[800px] mt-4">
        <CardSection
          history={history}
          onDeleteHistory={handleDeleteHistory}
          onOpenModal={handleOpenModal}
        />
      </div>
      <div className="absolute right-0 bottom-0 size-16">
        <ModeToggle />
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Transcription Details"
        content={selectedText}
      />
    </div>
  );
}
