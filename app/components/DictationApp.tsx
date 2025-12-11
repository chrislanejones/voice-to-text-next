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
  const {
    isRecording,
    transcription,
    error,
    startRecording,
    stopRecording,
    clearTranscription,
  } = useSpeechRecognition();

  const [history, setHistory] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [lastSavedTranscription, setLastSavedTranscription] =
    useState<string>("");

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

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
    setHistory(() => []);
    clearTranscription();
    setLastSavedTranscription("");
    localStorage.removeItem(STORAGE_KEY);
    setTimeout(() => {
      if (history.length > 0) {
        console.log("Forcing history clear");
        setHistory(() => []);
      }
    }, 100);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4">
      <div className="p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-[800px] dark:bg-slate-600 bg-slate-400">
        <div className="w-full flex justify-center mb-4">
          <DictationButton
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />
        </div>
        <div className="w-full max-w-[800px] mt-4">
          {error && (
            <div className="text-red-500 text-center mb-4">{error}</div>
          )}
          {transcription && (
            <div className="p-4 bg-white/10 rounded-lg mb-4">
              <p className="text-white">{transcription}</p>
            </div>
          )}
          <CardSection
            history={history}
            onDeleteHistory={handleDeleteHistory}
            onOpenModal={handleOpenModal}
          />
        </div>
      </div>

      <div className="fixed bottom-4 right-4 flex gap-2">
        <ModeToggle />
        <Button
          variant="destructive"
          size="icon"
          onClick={handleDeleteAll}
          aria-label="Delete all"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Transcription"
        content={selectedText}
      />
    </div>
  );
}
