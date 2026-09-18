"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Stop on our own after this long with no new words.
const SILENCE_TIMEOUT_MS = 8000;
// If the browser never fires `end` after stop(), release the button anyway.
const STOP_FALLBACK_MS = 2000;
// A browser session that ends this quickly didn't really start.
const QUICK_END_MS = 1000;
const MAX_QUICK_ENDS = 3;

const UNSUPPORTED_MESSAGE =
  "Dictation isn't supported in this browser. Try Chrome, Edge, or Safari.";

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Microphone access is blocked. Allow it in your browser's site settings, then try again.",
  "service-not-allowed": "Speech recognition is turned off in this browser.",
  "audio-capture": "No microphone was found. Plug one in and try again.",
  network:
    "Couldn't reach the speech service. Check your connection and try again.",
  "language-not-supported":
    "Your browser's language isn't supported for dictation.",
};

// These end a browser session without anything being wrong.
const QUIET_ERRORS = new Set(["no-speech", "aborted"]);

function getRecognitionConstructor():
  | SpeechRecognitionConstructor
  | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function joinSegments(...segments: string[]): string {
  return segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(" ");
}

// The browser hands back lowercase phrases with no punctuation. Treat each
// finished phrase as a sentence so the transcript reads cleanly.
export function formatSegment(raw: string): string {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return "";
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

interface SessionCallbacks {
  onUpdate: (finalText: string, interimText: string) => void;
  onError: (message: string) => void;
  onEnd: (finalText: string) => void;
}

// One dictation from the user's start to stop. Browsers end continuous
// recognition on their own (Chrome after about a minute or a network blip),
// so this restarts the underlying recognizer until the user or the silence
// timer says to stop, carrying the transcript across restarts.
class DictationSession {
  private recognition: SpeechRecognition | null = null;
  private keepListening = true;
  private stopping = false;
  private ended = false;
  private committed = "";
  private sessionFinal = "";
  private interim = "";
  private startedAt = 0;
  private quickEnds = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private stopFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly Recognition: SpeechRecognitionConstructor,
    private readonly callbacks: SessionCallbacks
  ) {}

  start(): void {
    this.listen();
    this.armSilenceTimer();
  }

  stop(): void {
    if (this.stopping || this.ended) return;
    this.stopping = true;
    this.keepListening = false;
    this.clearSilenceTimer();
    if (!this.recognition) {
      this.finish();
      return;
    }
    try {
      // stop() (not abort()) lets the browser finalize the last words.
      this.recognition.stop();
    } catch {
      this.finish();
      return;
    }
    this.stopFallbackTimer = setTimeout(() => this.finish(), STOP_FALLBACK_MS);
  }

  // Tear down without reporting a result, e.g. on unmount.
  dispose(): void {
    this.ended = true;
    this.keepListening = false;
    this.clearTimers();
    this.detach();
  }

  private listen(): void {
    const recognition = new this.Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => this.handleResult(event);
    recognition.onerror = (event) => this.handleError(event);
    recognition.onend = () => this.handleEnd(recognition);
    this.recognition = recognition;
    this.startedAt = Date.now();
    recognition.start();
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    // In continuous mode the list holds every result for this browser
    // session, so rebuild from the top instead of trusting resultIndex.
    let finals = "";
    let interim = "";
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? "";
      if (result.isFinal) {
        finals = joinSegments(finals, formatSegment(text));
      } else {
        interim += text;
      }
    }
    this.sessionFinal = finals;
    this.interim = interim.trim();
    this.emit();
    if (!this.stopping) this.armSilenceTimer();
  }

  private handleError(event: SpeechRecognitionErrorEvent): void {
    // `end` always follows an error, so cleanup happens there.
    if (QUIET_ERRORS.has(event.error)) return;
    this.keepListening = false;
    this.callbacks.onError(
      ERROR_MESSAGES[event.error] ?? `Speech recognition error: ${event.error}`
    );
  }

  private handleEnd(recognition: SpeechRecognition): void {
    if (recognition !== this.recognition || this.ended) return;
    this.recognition = null;
    // Keep words that were still in progress when the browser cut off.
    this.committed = joinSegments(
      this.committed,
      this.sessionFinal,
      formatSegment(this.interim)
    );
    this.sessionFinal = "";
    this.interim = "";
    this.emit();

    this.quickEnds =
      Date.now() - this.startedAt < QUICK_END_MS ? this.quickEnds + 1 : 0;
    if (this.quickEnds >= MAX_QUICK_ENDS) {
      this.keepListening = false;
      this.callbacks.onError(
        "Dictation keeps stopping on its own. Check your microphone and try again."
      );
    }

    if (this.keepListening) {
      try {
        this.listen();
        return;
      } catch {
        // Fall through and finish with what we have.
      }
    }
    this.finish();
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    this.clearTimers();
    this.detach();
    this.callbacks.onEnd(
      joinSegments(
        this.committed,
        this.sessionFinal,
        formatSegment(this.interim)
      )
    );
  }

  private emit(): void {
    this.callbacks.onUpdate(
      joinSegments(this.committed, this.sessionFinal),
      this.interim
    );
  }

  private armSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => this.stop(), SILENCE_TIMEOUT_MS);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
  }

  private clearTimers(): void {
    this.clearSilenceTimer();
    if (this.stopFallbackTimer) clearTimeout(this.stopFallbackTimer);
    this.stopFallbackTimer = null;
  }

  private detach(): void {
    const recognition = this.recognition;
    this.recognition = null;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      // Already stopped.
    }
  }
}

const subscribeToNothing = () => () => {};

export function useSpeechRecognition(onSessionEnd?: (text: string) => void) {
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    () => getRecognitionConstructor() !== undefined,
    // Assume support while server rendering so the button doesn't flash off.
    () => true
  );
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>("");
  const [interimTranscription, setInterimTranscription] =
    useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<DictationSession | null>(null);
  const onSessionEndRef = useRef(onSessionEnd);

  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  }, [onSessionEnd]);

  useEffect(() => {
    return () => {
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  const startRecording = useCallback(() => {
    if (sessionRef.current) return;
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setError(UNSUPPORTED_MESSAGE);
      return;
    }
    setError(null);
    setTranscription("");
    setInterimTranscription("");

    const session = new DictationSession(Recognition, {
      onUpdate: (finalText, interimText) => {
        setTranscription(finalText);
        setInterimTranscription(interimText);
      },
      onError: setError,
      onEnd: (finalText) => {
        if (sessionRef.current === session) sessionRef.current = null;
        setIsRecording(false);
        setTranscription(finalText);
        setInterimTranscription("");
        if (finalText) onSessionEndRef.current?.(finalText);
      },
    });

    sessionRef.current = session;
    setIsRecording(true);
    try {
      session.start();
    } catch {
      session.dispose();
      sessionRef.current = null;
      setIsRecording(false);
      setError("Couldn't start the microphone. Refresh the page and try again.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    sessionRef.current?.stop();
  }, []);

  const clearTranscription = useCallback(() => {
    setTranscription("");
    setInterimTranscription("");
  }, []);

  return {
    isSupported,
    isRecording,
    transcription,
    interimTranscription,
    error: isSupported ? error : UNSUPPORTED_MESSAGE,
    startRecording,
    stopRecording,
    clearTranscription,
  };
}
