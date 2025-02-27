"use client";

import React, { useState, useEffect } from "react";
import CardSection from "./CardSection";
import Modal from "./Modal";
import { ModeToggle } from "./DarkLightToggle";
import DictationButton from "./DictationButton";
import { useSpeechRecognition } from "./SpeechRecognitionService";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const STORAGE_KEY = "voice-to-text-history";

export default function DictationApp(): React.ReactElement {
  // Speech recognition
  const { isRecording, transcription, error, startRecording, stopRecording } =
    useSpeechRecognition();

  // UI state
  const [history, setHistory] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [lastSavedTranscription, setLastSavedTranscription] =
    useState<string>("");

  // Load history from localStorage
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

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  // Add transcription to history when recording stops, but avoid duplicates
  useEffect(() => {
    if (
      !isRecording &&
      transcription.trim() &&
      transcription !== lastSavedTranscription
    ) {
      setHistory((prev) => [transcription, ...prev].slice(0, 10));
      setLastSavedTranscription(transcription);
    }
  }, [isRecording, transcription, lastSavedTranscription]);

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

  const handleDeleteAll = (): void => {
    setHistory([]);
    setLastSavedTranscription("");
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4">
      {/* Title above the container */}
      <h1 className="text-2xl sm:text-3xl text-center font-bold mb-4 sm:mb-6 dark:text-white">
        Voice to Text Dictation
      </h1>

      {/* Dictation container */}
      <div className="p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-[800px] dark:bg-slate-600 bg-slate-400">
        {/* Stack layout on mobile, side by side on larger screens */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Animation and control centered */}
          <div className="w-full sm:w-[200px] flex flex-col items-center">
            <DictationButton
              isRecording={isRecording}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
            />
          </div>

          {/* Transcription container with increased height */}
          <div className="flex-1">
            <div className="dark:bg-zinc-800 bg-zinc-300 p-3 sm:p-4 rounded min-h-[140px] max-h-[350px] sm:max-h-[450px] overflow-y-auto inset-shadow-2">
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

      {/* Bottom Action Buttons Container */}
      <div className="absolute right-0 bottom-0 flex items-center gap-2 p-4">
        <Button
          variant="destructive"
          size="icon"
          onClick={handleDeleteAll}
          aria-label="Delete all transcriptions"
          title="Delete all transcriptions"
          className="h-9 w-9"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
