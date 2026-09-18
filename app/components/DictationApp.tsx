"use client";

import React, { useState } from "react";
import { CircleAlert, Trash2 } from "lucide-react";
import CardSection from "./CardSection";
import Modal from "./Modal";
import { ModeToggle } from "./DarkLightToggle";
import DictationButton from "./DictationButton";
import { useSpeechRecognition } from "./SpeechRecognitionService";
import { useHistory } from "@/hooks/use-history";
import { Button } from "@/components/ui/button";

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

  const hasTranscript = Boolean(transcription || interimTranscription);

  return (
    // pb-24 keeps the last row of cards clear of the fixed toolbar.
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Voice to Text
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Speak, then copy. Notes stay in this browser.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-8 dark:shadow-black/20">
        <DictationButton
          isRecording={isRecording}
          disabled={!isSupported}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          >
            <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {/* Always mounted so screen readers track it. In-progress words are
            hidden from them; each finished phrase is announced once. */}
        <div
          className="mt-6 min-h-24 rounded-xl bg-muted px-4 py-3 sm:px-5 sm:py-4"
          aria-live="polite"
        >
          <p className="text-base leading-relaxed sm:text-lg">
            {transcription}
            {interimTranscription && (
              <span className="text-muted-foreground" aria-hidden="true">
                {transcription ? " " : ""}
                {interimTranscription}
              </span>
            )}
            {!hasTranscript && (
              <span className="text-muted-foreground">
                {isRecording ? "Listening…" : "Your words will show up here."}
              </span>
            )}
          </p>
        </div>

        <section
          aria-labelledby="history-heading"
          className="mt-8 border-t border-border pt-6"
        >
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="history-heading" className="text-base font-bold">
              History
            </h2>
            {history.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {history.length} saved
              </p>
            )}
          </div>
          <CardSection
            history={history}
            onDeleteHistory={removeEntry}
            onOpenModal={handleOpenModal}
          />
        </section>
      </div>

      <div className="fixed bottom-4 right-4 flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur">
        <ModeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteAll}
          aria-label="Delete all"
          title="Delete all"
          className="size-10 rounded-full text-red-600 hover:bg-destructive hover:text-destructive-foreground dark:text-red-400"
        >
          <Trash2 />
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
