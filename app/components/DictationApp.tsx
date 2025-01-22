"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, StopCircle } from "lucide-react";
import Sidebar from "./Sidebar";
import Modal from "./Modal";

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

    const onResult = (event: SpeechRecognitionEvent) => {
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

    const onEnd = () => {
      setIsRecording(false);
      if (transcription) {
        setHistory((prev) => [...prev, transcription]);
      }
    };

    const onError = (event: SpeechRecognitionErrorEvent) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.addEventListener("result", onResult);
    recognition.addEventListener("end", onEnd);
    recognition.addEventListener("error", onError);

    return () => {
      recognition.removeEventListener("result", onResult);
      recognition.removeEventListener("end", onEnd);
      recognition.removeEventListener("error", onError);
    };
  }, [recognition, transcription]);

  const handleDeleteHistory = (index: number) => {
    setHistory((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenModal = (text: string) => {
    setSelectedText(text);
    setModalOpen(true);
  };

  return (
    <>
      <Sidebar
        history={history}
        onDeleteHistory={handleDeleteHistory}
        onOpenModal={handleOpenModal}
      />
      <div className="flex-1 p-8 text-white">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Voice to Text Dictation</h1>
          <div className="bg-gray-800 p-6 rounded-lg shadow-md">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className="mb-4"
            >
              {isRecording ? (
                <>
                  <StopCircle className="mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="mr-2" />
                  Start Dictation
                </>
              )}
            </Button>
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-2">Transcription:</h2>
              <p className="bg-gray-700 p-4 rounded min-h-[100px]">
                {transcription}
              </p>
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-900 text-red-100 rounded">
                Error: {error}
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Transcription Details"
        content={selectedText}
      />
    </>
  );
}
