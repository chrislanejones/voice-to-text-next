"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, StopCircle } from "lucide-react";
import Sidebar from "./Sidebar";
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

export default function DictationApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null
  );

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const newRecognition = new SpeechRecognition();
      newRecognition.continuous = true;
      newRecognition.interimResults = true;
      setRecognition(newRecognition);
    } else {
      setError("Speech recognition is not supported in this browser.");
    }
  }, []);

  const startRecording = useCallback(() => {
    if (recognition) {
      setError(null);
      setTranscription("");
      recognition.start();
      setIsRecording(true);
    }
  }, [recognition]);

  const stopRecording = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  }, [recognition]);

  useEffect(() => {
    if (!recognition) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
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

    const handleEnd = () => {
      setIsRecording(false);
      if (transcription) {
        setHistory([transcription, ...history].slice(0, 10)); // Limit history to 10 entries
      }
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.addEventListener("result", handleResult);
    recognition.addEventListener("end", handleEnd);
    recognition.addEventListener("error", handleError);

    return () => {
      recognition.removeEventListener("result", handleResult);
      recognition.removeEventListener("end", handleEnd);
      recognition.removeEventListener("error", handleError);
    };
  }, [recognition, transcription, history]);

  const handleDeleteHistory = (index: number) => {
    setHistory((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenModal = (text: string) => {
    setSelectedText(text);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4">
      {/* Dictation container */}
      <div className="p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-[800px] dark:bg-sky-900 bg-sky-200">
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
                  <StopCircle className="mr-2  h-4 w-4" />
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
            <div className="dark:bg-gray-800 bg-slate-300 p-3 sm:p-4 rounded min-h-[100px] max-h-[300px] sm:max-h-[400px] overflow-y-auto inset-shadow-2">
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

      {/* Sidebar with responsive positioning */}
      <div className="w-full max-w-[800px] mt-4">
        <Sidebar
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
