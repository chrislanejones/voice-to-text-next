"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 32 kbps Opus is plenty for speech and keeps 15 minutes under the
// server's 4.4 MB upload cap.
const BITS_PER_SECOND = 32_000;
const MAX_MS = 15 * 60 * 1000;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

export function isRecorderSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

// Records microphone audio to a Blob for server-side transcription.
export function useAudioRecorder(onRecorded: (audio: File) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const limitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRecordedRef = useRef(onRecorded);

  useEffect(() => {
    onRecordedRef.current = onRecorded;
  }, [onRecorded]);

  const stop = useCallback(() => {
    if (limitRef.current) clearTimeout(limitRef.current);
    limitRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(
        "Microphone access is blocked. Allow it in your browser's site settings, then try again."
      );
      return;
    }
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: BITS_PER_SECOND,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      setIsRecording(false);
      const type = recorder.mimeType || mimeType || "audio/webm";
      const ext = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : "webm";
      const blob = new Blob(chunks, { type });
      if (blob.size > 0) {
        onRecordedRef.current(new File([blob], `recording.${ext}`, { type }));
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    limitRef.current = setTimeout(stop, MAX_MS);
  }, [stop]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (!recorder) return;
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { isRecording, error, start, stop };
}
