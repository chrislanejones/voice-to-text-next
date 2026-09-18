"use client";

import React, { useState } from "react";
import CardSection from "./CardSection";
import Modal from "./Modal";
import { ModeToggle } from "./DarkLightToggle";
import DictationButton from "./DictationButton";
import { useSpeechRecognition } from "./SpeechRecognitionService";
import { useHistory } from "@/hooks/use-history";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function DictationApp(): React.ReactElement {
  const { history, addEntry, removeEntry, clear } = useHistory();
  const {
    isSupported,
    isRecording,
    transcription,
    interimTranscription,
    error,
    startRecording,
    stopRecording,
    clearTranscription,
  } = useSpeechRecognition(addEntry);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>("");

  const handleOpenModal = (text: string): void => {
    setSelectedText(text);
    setModalOpen(true);
  };

  const handleDeleteAll = (): void => {
    clear();
    clearTranscription();
  };

  const showTranscript = isRecording || transcription || interimTranscription;

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4">
      <div className="p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-[800px] dark:bg-slate-600 bg-slate-400">
        <div className="w-full flex justify-center mb-4">
          <DictationButton
            isRecording={isRecording}
            disabled={!isSupported}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />
        </div>
        <div className="w-full max-w-[800px] mt-4">
          {error && (
            <div role="alert" className="text-red-500 text-center mb-4">
              {error}
            </div>
          )}
          {showTranscript && (
            <div
              className="p-4 bg-white/10 rounded-lg mb-4"
              aria-live="polite"
            >
              <p className="text-white">
                {transcription}
                {interimTranscription && (
                  <span className="text-white/60">
                    {transcription ? " " : ""}
                    {interimTranscription}
                  </span>
                )}
                {isRecording && !transcription && !interimTranscription && (
                  <span className="text-white/60">Listening…</span>
                )}
              </p>
            </div>
          )}
          <CardSection
            history={history}
            onDeleteHistory={removeEntry}
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
