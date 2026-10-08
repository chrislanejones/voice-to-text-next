"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { localSpeech, onModelProgress, type LocalAudio } from "@/lib/local-speech";
import { claimPlayback, PLAYBACK_EVENT } from "@/lib/playback";
import { speechChunks, type SpeechChunk } from "@/lib/speech-chunks";

export type VoiceMode = "browser" | "local";
type Status = "idle" | "loading" | "playing" | "paused" | "done" | "error";

export function useArticlePlayer(initialSpeed: number) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [download, setDownload] = useState<number | null>(null);
  const [speed, setSpeedState] = useState<number | null>(null);
  const state = useRef<Status>("idle");
  const token = useRef(0);
  const chunks = useRef<SpeechChunk[]>([]);
  const length = useRef(0);
  const index = useRef(0);
  const mode = useRef<VoiceMode>("browser");
  const voice = useRef("af_heart");
  const lang = useRef("en");
  const rate = useRef(initialSpeed);
  const context = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const started = useRef(0);
  const offset = useRef(0);
  const duration = useRef(0);
  const cache = useRef(new Map<number, Promise<LocalAudio | null>>());

  const changeStatus = useCallback((value: Status) => { state.current = value; setStatus(value); }, []);
  const updateProgress = useCallback((fraction = 0) => {
    const chunk = chunks.current[index.current];
    if (chunk) setProgress(100 * (chunk.start + (chunk.end - chunk.start) * fraction) / Math.max(1, length.current));
  }, []);
  const halt = useCallback(() => {
    token.current++;
    if (source.current) { source.current.onended = null; source.current.stop(); source.current = null; }
    if (utterance.current && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    utterance.current = null;
  }, []);
  const stop = useCallback(() => {
    halt();
    index.current = 0;
    offset.current = 0;
    setProgress(0);
    changeStatus("idle");
    setMessage("");
  }, [changeStatus, halt]);

  // Called directly in a click handler, before fetching or model loading.
  // This unlocks Web Audio on phones without relying on page-load autoplay.
  const unlock = useCallback(() => {
    claimPlayback("article");
    try {
      context.current ??= new AudioContext();
      void context.current.resume().catch(() => {});
    } catch { /* The browser voice can still be used without Web Audio. */ }
  }, []);

  const generate = useCallback((at: number) => {
    let pending = cache.current.get(at);
    if (!pending) {
      pending = localSpeech(chunks.current[at].text, voice.current);
      // Prefetch failures are handled if/when that passage is reached.
      void pending.catch(() => {});
      cache.current.set(at, pending);
    }
    return pending;
  }, []);

  const speakChunk = useCallback(async function say(at: number, run: number): Promise<void> {
    if (run !== token.current) return;
    if (at >= chunks.current.length) { changeStatus("done"); setProgress(100); return; }
    index.current = at;
    updateProgress();
    const next = () => {
      if (run !== token.current) return;
      source.current = null;
      utterance.current = null;
      offset.current = 0;
      cache.current.delete(at - 1);
      if (state.current === "paused") { index.current = at + 1; updateProgress(); return; }
      void say(at + 1, run);
    };
    if (mode.current === "local") {
      changeStatus("loading");
      try {
        const audio = await generate(at);
        if (run !== token.current) return;
        const ctx = context.current;
        if (!audio || !ctx) throw new Error("Web Audio isn't available.");
        if (ctx.state !== "running") await ctx.resume();
        if (run !== token.current) return;
        if (ctx.state !== "running") throw new Error("Playback needs another tap.");
        const buffer = ctx.createBuffer(1, audio.samples.length, audio.sampleRate);
        buffer.getChannelData(0).set(audio.samples);
        const node = ctx.createBufferSource();
        node.buffer = buffer;
        node.playbackRate.value = rate.current;
        node.connect(ctx.destination);
        source.current = node;
        duration.current = buffer.duration;
        started.current = ctx.currentTime;
        node.onended = next;
        node.start(0, Math.min(offset.current, Math.max(0, buffer.duration - 0.01)));
        setDownload(null);
        changeStatus("playing");
        // Make the next passage while this one plays, keeping only nearby
        // audio in memory rather than synthesizing an entire long article.
        if (at + 1 < chunks.current.length) void generate(at + 1);
        return;
      } catch {
        if (run !== token.current) return;
        cache.current.delete(at);
        mode.current = "browser";
        offset.current = 0;
        setDownload(null);
        setMessage("The natural voice couldn't load. Using your browser voice; you can try the natural voice again later.");
      }
    }
    if (typeof speechSynthesis === "undefined") {
      changeStatus("error");
      setMessage("This browser has no reading voice. Try a different browser or choose the natural voice.");
      return;
    }
    // Re-query on each passage: browser voices may arrive after page load.
    const speech = new SpeechSynthesisUtterance(chunks.current[at].text);
    speech.lang = lang.current;
    speech.rate = rate.current;
    const voices = speechSynthesis.getVoices();
    speech.voice = voices.find((v) => v.lang.toLowerCase() === lang.current.toLowerCase())
      ?? voices.find((v) => v.lang.split("-")[0] === lang.current.split("-")[0]) ?? null;
    speech.onboundary = (event) => {
      if (run === token.current) updateProgress(event.charIndex / Math.max(1, speech.text.length));
    };
    speech.onend = next;
    speech.onerror = (event) => {
      if (run !== token.current || ["canceled", "interrupted"].includes(event.error)) return;
      if (event.error === "not-allowed") {
        utterance.current = null;
        changeStatus("paused");
        setMessage("Your browser needs another tap. Press Resume to start reading.");
      } else {
        changeStatus("error");
        setMessage("Couldn't play that voice. Try the natural voice or another browser.");
      }
    };
    utterance.current = speech;
    speechSynthesis.speak(speech);
    changeStatus("playing");
  }, [changeStatus, generate, updateProgress]);

  const load = useCallback((text: string, selected: VoiceMode, selectedVoice: string, language = "en") => {
    halt();
    cache.current.clear();
    chunks.current = speechChunks(text);
    length.current = text.length;
    index.current = 0;
    offset.current = 0;
    mode.current = selected;
    voice.current = selectedVoice;
    lang.current = language;
    setMessage("");
    if (selected === "local" && !/^en(?:-|$)/i.test(language)) {
      mode.current = "browser";
      setMessage("These natural voices read English. Using the browser voice for this article's language.");
    }
    setProgress(0);
    changeStatus("paused");
  }, [changeStatus, halt]);

  const play = useCallback(() => {
    unlock();
    if (state.current === "paused" && utterance.current) {
      speechSynthesis.resume();
      changeStatus("playing");
      return;
    }
    if (state.current === "done") { index.current = 0; offset.current = 0; }
    if (chunks.current.length) void speakChunk(index.current, token.current);
  }, [changeStatus, speakChunk, unlock]);

  const pause = useCallback(() => {
    if (mode.current === "browser" && utterance.current) speechSynthesis.pause();
    else {
      if (source.current && context.current) {
        offset.current += (context.current.currentTime - started.current) * rate.current;
        source.current.onended = null;
        source.current.stop();
        source.current = null;
      }
      token.current++;
    }
    changeStatus("paused");
  }, [changeStatus]);

  const move = useCallback((at: number) => {
    const resume = state.current === "playing" || state.current === "loading";
    halt();
    index.current = Math.max(0, Math.min(chunks.current.length - 1, at));
    offset.current = 0;
    updateProgress();
    if (resume) { unlock(); void speakChunk(index.current, token.current); }
    else changeStatus("paused");
  }, [changeStatus, halt, speakChunk, unlock, updateProgress]);

  const seek = useCallback((percent: number) => {
    const position = length.current * percent / 100;
    const found = chunks.current.findIndex((chunk) => chunk.end >= position);
    move(found < 0 ? chunks.current.length - 1 : found);
  }, [move]);

  const setSpeed = useCallback((value: number) => {
    if (source.current && context.current) {
      offset.current += (context.current.currentTime - started.current) * rate.current;
      started.current = context.current.currentTime;
      source.current.playbackRate.value = value;
    }
    rate.current = value;
    setSpeedState(value);
    // Browser utterances fix their rate at creation, so replay this passage
    // at the new speed instead of silently waiting until the next one.
    if (mode.current === "browser" && state.current === "playing") move(index.current);
  }, [move]);

  // Preferences hydrate from browser storage after the server render.
  // Until this reader's speed is changed, use that stored default.
  useEffect(() => {
    if (speed === null) rate.current = initialSpeed;
  }, [initialSpeed, speed]);

  useEffect(() => {
    const onOther = (event: Event) => { if ((event as CustomEvent).detail !== "article") stop(); };
    window.addEventListener(PLAYBACK_EVENT, onOther);
    const unsubscribe = onModelProgress((value) => setDownload(Math.round(value)));
    return () => {
      window.removeEventListener(PLAYBACK_EVENT, onOther);
      unsubscribe();
      halt();
      void context.current?.close();
    };
  }, [halt, stop]);

  useEffect(() => {
    if (status !== "playing") return;
    let frame: number;
    let last = 0;
    const tick = (now: number) => {
      if (mode.current === "local" && source.current && context.current && now - last > 150) {
        const elapsed = offset.current + (context.current.currentTime - started.current) * rate.current;
        updateProgress(Math.min(1, elapsed / Math.max(0.001, duration.current)));
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, updateProgress]);

  return { status, progress, message, download, speed: speed ?? initialSpeed, setSpeed, unlock, load, play, pause, stop,
    seek, skip: (direction: number) => move(index.current + direction) };
}
