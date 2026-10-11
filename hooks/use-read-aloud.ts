"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speak } from "@/lib/ai-client";
import { claimPlayback, PLAYBACK_EVENT } from "@/lib/playback";

// Reads text aloud. With AI on it uses Replicate's natural voice (Kokoro);
// otherwise the browser's built-in voice. One thing plays at a time,
// keyed by an id the caller picks ("live", a note id, …).

export function useReadAloud(useAi: boolean, onError: (message: string) => void, speed = 1) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ownSpeechRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const onErrorRef = useRef(onError);
  const speedRef = useRef(speed);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // A new speed applies to whatever is playing now, too.
  useEffect(() => {
    speedRef.current = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.pause();
    }
    if (ownSpeechRef.current && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    ownSpeechRef.current = false;
    setPlaying(null);
    setLoading(null);
    setProgress(0);
  }, []);

  useEffect(() => {
    const onOther = (event: Event) => { if ((event as CustomEvent).detail !== "notes") stop(); };
    window.addEventListener(PLAYBACK_EVENT, onOther);
    return () => { window.removeEventListener(PLAYBACK_EVENT, onOther); stop(); };
  }, [stop]);

  const toggle = useCallback(
    async (id: string, text: string) => {
      const wasPlaying = playing === id || loading === id;
      stop();
      if (wasPlaying || !text.trim()) return;
      claimPlayback("notes");

      if (!useAi) {
        if (typeof speechSynthesis === "undefined") {
          onErrorRef.current("This browser can't read text aloud.");
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speedRef.current;
        utterance.onboundary = (e) => setProgress(Math.min(100, (e.charIndex / text.length) * 100));
        utterance.onend = () => {
          ownSpeechRef.current = false;
          setPlaying((current) => (current === id ? null : current));
          setProgress(0);
        };
        ownSpeechRef.current = true;
        speechSynthesis.speak(utterance);
        setPlaying(id);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(id);
      try {
        const url = await speak(text, controller.signal);
        if (controller.signal.aborted) return;
        const audio = new Audio(url);
        audio.playbackRate = speedRef.current;
        audio.ontimeupdate = () => {
          if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
        };
        audio.onended = () => {
          audioRef.current = null;
          setPlaying(null);
          setProgress(0);
        };
        audioRef.current = audio;
        await audio.play();
        setPlaying(id);
      } catch (err) {
        if (!controller.signal.aborted) {
          onErrorRef.current(err instanceof Error ? err.message : "Couldn't read that aloud.");
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(null);
        }
      }
    },
    [loading, playing, stop, useAi]
  );

  return { playing, loading, progress, toggle, stop };
}
