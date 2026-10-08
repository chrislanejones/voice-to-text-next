"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HeadphonesIcon, PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, StopIcon } from "@phosphor-icons/react";
import { useArticlePlayer, type VoiceMode } from "@/hooks/use-article-player";
import { MAX_ARTICLE_CHARS, type Article } from "@/lib/article-types";
import { LOCAL_VOICES } from "@/lib/local-speech";
import { SPEEDS } from "@/hooks/use-preferences";

function sharedLink() {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") || params.get("text")?.match(/https?:\/\/[^\s]+/)?.[0] || "";
}
const subscribeToShare = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
};

export default function ArticleReader({ defaultSpeed }: { defaultSpeed: number }) {
  const shared = useSyncExternalStore(subscribeToShare, sharedLink, () => "");
  const [url, setUrl] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<VoiceMode>("browser");
  const [voice, setVoice] = useState("af_heart");
  const [seekPosition, setSeekPosition] = useState<number | null>(null);
  const request = useRef<AbortController | null>(null);
  const player = useArticlePlayer(defaultSpeed);

  useEffect(() => () => request.current?.abort(), []);

  function cancel() {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    player.stop();
  }

  async function readUrl(event: React.FormEvent) {
    event.preventDefault();
    cancel();
    player.unlock();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: (url ?? shared).trim() }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't load that article.");
      if (controller.signal.aborted) return;
      const loaded = data as Article;
      setArticle(loaded);
      player.load(loaded.text, mode, voice, loaded.lang);
      player.play();
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Couldn't reach the article. Try pasting its text below.");
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  }

  function readText(event: React.FormEvent) {
    event.preventDefault();
    const text = pasted.trim();
    if (!text) return;
    cancel();
    player.unlock();
    setError("");
    const loaded: Article = {
      title: "Pasted article", url: "", siteName: "Your text", byline: "", lang: "en",
      text, wordCount: text.split(/\s+/).length, truncated: false,
    };
    setArticle(loaded);
    player.load(text, mode, voice);
    player.play();
  }

  function changeVoice(nextMode: VoiceMode, nextVoice: string) {
    // Changing voice prepares the same article for the next press of Play.
    player.stop();
    setMode(nextMode);
    setVoice(nextVoice);
    if (article) player.load(article.text, nextMode, nextVoice, article.lang);
  }

  function commitSeek(input: HTMLInputElement) {
    player.seek(Number(input.value));
    setSeekPosition(null);
  }

  const busy = player.status === "playing" || player.status === "loading";
  const percent = Math.round(seekPosition ?? player.progress);
  const statusText = player.status === "loading"
    ? player.download !== null ? `Downloading the natural voice: ${player.download}%` : "Preparing the natural voice…"
    : player.status === "playing" ? "Reading" : player.status === "paused" ? "Paused"
      : player.status === "done" ? "Finished" : player.status === "error" ? "Playback stopped" : "Ready to listen";

  return (
    <section className="vt-reader" aria-labelledby="article-reader-heading" data-shortcuts="off">
      <div className="vt-reader-head">
        <HeadphonesIcon size={26} weight="duotone" aria-hidden="true" />
        <div>
          <h2 id="article-reader-heading">Listen to an article</h2>
          <p className="vt-muted">Paste a link and let it read. Free, with no sign-in.</p>
        </div>
      </div>

      <form onSubmit={readUrl} className="vt-reader-url">
        <div className="field">
          <label className="field-label" htmlFor="article-url">Article link</label>
          <input id="article-url" className="input" type="text" inputMode="url" autoComplete="url"
            placeholder="https://example.com/an-article" value={url ?? shared}
            onChange={(event) => setUrl(event.target.value)} required maxLength={2048}
            aria-describedby={error ? "article-error" : "article-link-help"} />
        </div>
        <button className="btn btn-primary vt-reader-primary" type="submit" disabled={loading || !(url ?? shared).trim()}>
          <PlayIcon size={17} weight="fill" aria-hidden="true" />{loading ? "Fetching article…" : "Read article"}
        </button>
        {loading && <button className="btn btn-secondary" type="button" onClick={cancel}>Cancel</button>}
      </form>
      <p id="article-link-help" className="vt-reader-help vt-muted">
        {shared ? "Shared link ready. Tap Read article to start." : "Public articles work best. For a sign-in page or a blocked site, paste the text below."}
      </p>
      {error && <p className="vt-error" id="article-error" role="alert">{error}</p>}
      {loading && <div className="vt-reader-fetch" role="status">Finding the article text…</div>}

      <div className="vt-reader-settings">
        <div className="field">
          <label className="field-label" htmlFor="article-voice-mode">Reading voice</label>
          <select id="article-voice-mode" className="input" value={mode} onChange={(event) => changeVoice(event.target.value as VoiceMode, voice)} disabled={loading}>
            <option value="browser">Browser voice · instant</option>
            <option value="local">Natural voice · on this device</option>
          </select>
        </div>
        {mode === "local" && <div className="field">
          <label className="field-label" htmlFor="article-natural-voice">Natural voice</label>
          <select id="article-natural-voice" className="input" value={voice} disabled={loading}
            onChange={(event) => changeVoice(mode, event.target.value)}>
            {LOCAL_VOICES.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </div>}
        <div className="field">
          <label className="field-label" htmlFor="article-speed">Speed</label>
          <select id="article-speed" className="input" value={player.speed} onChange={(event) => player.setSpeed(Number(event.target.value))}>
            {SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
          </select>
        </div>
        <p className="vt-reader-help vt-muted">
          {mode === "local" ? "English voices. Downloads a model on first use, then keeps it in this browser's cache. Speech is made on your device." : "Uses your browser's installed voices. Choose Natural voice for free speech made on your device."}
        </p>
      </div>

      <details className="vt-reader-paste">
        <summary>Or paste article text</summary>
        <form onSubmit={readText}>
          <label className="vt-sr-only" htmlFor="article-pasted-text">Article text</label>
          <textarea id="article-pasted-text" className="input" rows={6} placeholder="Paste the article here…"
            value={pasted} maxLength={MAX_ARTICLE_CHARS} onChange={(event) => setPasted(event.target.value)} />
          <button type="submit" className="btn btn-secondary" disabled={!pasted.trim() || loading}>
            <PlayIcon size={17} weight="fill" aria-hidden="true" />Read pasted text
          </button>
        </form>
      </details>

      {article && <div className="vt-reader-article">
        <p className="vt-kicker">{article.siteName}{article.byline ? ` · ${article.byline}` : ""}</p>
        <h3>{article.title}</h3>
        <p className="vt-reader-meta vt-muted">{article.wordCount.toLocaleString()} words · About {Math.max(1, Math.round(article.wordCount / (180 * player.speed)))} min
          {article.url && <> · <a href={article.url} target="_blank" rel="noopener noreferrer">Open original</a></>}
        </p>
        {article.truncated && <p className="vt-muted">This is a long article. The reader loaded the first {MAX_ARTICLE_CHARS.toLocaleString()} characters.</p>}
        <div className="vt-reader-controls">
          <button className="btn btn-secondary" type="button" aria-label="Previous passage" onClick={() => player.skip(-1)}><SkipBackIcon size={20} weight="fill" aria-hidden="true" /></button>
          <button className="btn btn-secondary vt-reader-play" type="button" onClick={busy ? player.pause : player.play}>
            {busy ? <PauseIcon size={19} weight="fill" aria-hidden="true" /> : <PlayIcon size={19} weight="fill" aria-hidden="true" />}
            {busy ? "Pause" : player.status === "paused" ? "Resume" : player.status === "done" ? "Read again" : "Play"}
          </button>
          <button className="btn btn-secondary" type="button" aria-label="Next passage" onClick={() => player.skip(1)}><SkipForwardIcon size={20} weight="fill" aria-hidden="true" /></button>
          <button className="btn btn-ghost" type="button" onClick={player.stop}><StopIcon size={17} weight="fill" aria-hidden="true" />Stop</button>
        </div>
        <div className="vt-reader-position">
          <label htmlFor="article-position" className="vt-sr-only">Article position, by passage</label>
          <input id="article-position" type="range" min={0} max={100} step={1} value={seekPosition ?? player.progress}
            aria-valuetext={`${percent}% of the article`} onChange={(event) => setSeekPosition(Number(event.target.value))}
            onPointerUp={(event) => commitSeek(event.currentTarget)}
            onKeyUp={(event) => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) commitSeek(event.currentTarget); }} />
          <span>{percent}%</span>
        </div>
        <p role="status" className="vt-reader-status vt-muted">{statusText}</p>
        {player.message && <p role="alert" className="vt-reader-help">{player.message}</p>}
        <details className="vt-reader-text">
          <summary>Article text</summary>
          <div>{article.text.split(/\n\n+/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
        </details>
      </div>}
    </section>
  );
}
