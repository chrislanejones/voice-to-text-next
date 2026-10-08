// Notes, article audio, and dictation share one audible session.
export const PLAYBACK_EVENT = "vt-playback-start";
export function claimPlayback(owner: string) {
  window.dispatchEvent(new CustomEvent(PLAYBACK_EVENT, { detail: owner }));
}
