// Shared audio playback manager: unlocks BOTH a persistent HTMLAudioElement
// (immune to WebAudio/getUserMedia hardware-routing silence) and Web AudioContext.

const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let sharedCtx: AudioContext | null = null;
let sharedAudioEl: HTMLAudioElement | null = null;
let audioElUnlocked = false;
let activeObjectUrl: string | null = null;

let currentSource: AudioBufferSourceNode | null = null;
let currentFallbackAudio: HTMLAudioElement | null = null;
let activePlayToken = 0;
let progressRafId: number | null = null;
const activeWaitStops = new Set<() => void>();

function cancelProgressLoop(): void {
  if (progressRafId !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(progressRafId);
    progressRafId = null;
  }
}

function revokeActiveUrl(): void {
  if (activeObjectUrl && typeof URL !== 'undefined') {
    try {
      URL.revokeObjectURL(activeObjectUrl);
    } catch {
      // ignore
    }
    activeObjectUrl = null;
  }
}

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      sharedCtx = new AudioCtx();
    }
  }
  return sharedCtx;
}

function getOrCreateAudioEl(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!sharedAudioEl) {
    sharedAudioEl = new Audio();
    sharedAudioEl.preload = 'auto';
  }
  return sharedAudioEl;
}

export async function unlockAudioContext(): Promise<boolean> {
  let ctxOk = false;
  const ctx = getSharedAudioContext();
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const silent = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
      ctxOk = ctx.state === 'running';
    } catch {
      ctxOk = false;
    }
  }

  const el = getOrCreateAudioEl();
  if (el && !audioElUnlocked) {
    try {
      el.muted = false;
      el.volume = 1;
      el.src = SILENT_WAV_DATA_URI;
      await el.play();
      el.pause();
      el.currentTime = 0;
      audioElUnlocked = true;
    } catch {
      // Will still attempt element play or fallback to AudioContext
    }
  }

  return ctxOk || audioElUnlocked;
}

export function isAudioContextLocked(): boolean {
  const ctx = getSharedAudioContext();
  if (audioElUnlocked) return false;
  return ctx ? ctx.state !== 'running' : false;
}

export function stopActiveAudio(): void {
  activePlayToken += 1;
  cancelProgressLoop();
  Array.from(activeWaitStops).forEach((fn) => fn());

  if (currentSource) {
    try {
      currentSource.onended = null;
      currentSource.stop();
      currentSource.disconnect();
    } catch {
      // ignore if already stopped
    }
    currentSource = null;
  }

  if (currentFallbackAudio) {
    try {
      currentFallbackAudio.pause();
      currentFallbackAudio.onplay = null;
      currentFallbackAudio.onended = null;
      currentFallbackAudio.onerror = null;
      currentFallbackAudio.removeAttribute('src');
    } catch {
      // ignore
    }
    currentFallbackAudio = null;
  }

  if (sharedAudioEl) {
    try {
      sharedAudioEl.pause();
      sharedAudioEl.onplay = null;
      sharedAudioEl.onended = null;
      sharedAudioEl.onerror = null;
    } catch {
      // ignore
    }
  }

  revokeActiveUrl();
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = window.atob(base64);
  const len = binary.length;
  const buf = new ArrayBuffer(len);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function playViaHtmlAudio(
  bytes: Uint8Array<ArrayBuffer>,
  mimeType: string,
  token: number,
  callbacks: {
    onStart: (durationSec?: number) => void;
    onProgress?: (progress: number, currentSec: number, durationSec: number) => void;
    onEnd: () => void;
    onBlocked?: () => void;
    onError: () => void;
  }
): Promise<boolean> {
  const el = getOrCreateAudioEl();
  if (!el) return false;

  try {
    const blob = new Blob([bytes], { type: mimeType || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    revokeActiveUrl();
    activeObjectUrl = url;
    currentFallbackAudio = el;

    let started = false;
    el.muted = false;
    el.volume = 1;
    el.src = url;

    el.onplay = () => {
      if (activePlayToken !== token) return;
      started = true;
      const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 4;
      callbacks.onStart(dur);
      if (callbacks.onProgress) {
        const tick = () => {
          if (activePlayToken !== token) return;
          const totalDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : dur;
          const cur = el.currentTime || 0;
          const progress = Math.min(1, cur / Math.max(0.4, totalDur));
          callbacks.onProgress?.(progress, cur, totalDur);
          if (!el.paused && !el.ended && progress < 1) {
            progressRafId = window.requestAnimationFrame(tick);
          }
        };
        progressRafId = window.requestAnimationFrame(tick);
      }
    };

    el.onended = () => {
      cancelProgressLoop();
      if (currentFallbackAudio === el) {
        currentFallbackAudio = null;
      }
      revokeActiveUrl();
      if (activePlayToken === token) {
        const totalDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 4;
        callbacks.onProgress?.(1, totalDur, totalDur);
        callbacks.onEnd();
      }
    };

    el.onerror = () => {
      cancelProgressLoop();
      revokeActiveUrl();
      if (activePlayToken === token && started) {
        callbacks.onError();
      }
    };

    await el.play();
    audioElUnlocked = true;
    return true;
  } catch {
    revokeActiveUrl();
    if (currentFallbackAudio === el) {
      currentFallbackAudio = null;
    }
    return false;
  }
}

export async function playBase64Audio(
  audioBase64: string,
  mimeType: string,
  callbacks: {
    onStart: (durationSec?: number) => void;
    onProgress?: (progress: number, currentSec: number, durationSec: number) => void;
    onEnd: () => void;
    onBlocked?: () => void;
    onError: () => void;
  }
): Promise<void> {
  stopActiveAudio();
  const token = activePlayToken;
  const bytes = base64ToUint8Array(audioBase64);

  // Primary: pre-unlocked HTMLAudioElement with Blob URL (immune to WebAudio/getUserMedia silence)
  if (audioElUnlocked) {
    const ok = await playViaHtmlAudio(bytes, mimeType, token, callbacks);
    if (ok || activePlayToken !== token) return;
  }

  // Secondary: shared Web AudioContext
  const ctx = getSharedAudioContext();
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
        if (activePlayToken !== token) return;
      }
      if (ctx.state === 'running') {
        const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
        if (activePlayToken !== token) return;
        const durationSec = Math.max(0.4, buffer.duration || 4);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const startedAtCtxTime = ctx.currentTime;

        source.onended = () => {
          cancelProgressLoop();
          if (currentSource === source) {
            currentSource = null;
          }
          if (activePlayToken === token) {
            callbacks.onProgress?.(1, durationSec, durationSec);
            callbacks.onEnd();
          }
        };

        currentSource = source;
        callbacks.onStart(durationSec);
        source.start(0);

        if (callbacks.onProgress) {
          const tick = () => {
            if (activePlayToken !== token) return;
            const elapsed = Math.max(0, ctx.currentTime - startedAtCtxTime);
            const progress = Math.min(1, elapsed / durationSec);
            callbacks.onProgress?.(progress, elapsed, durationSec);
            if (progress < 1) {
              progressRafId = window.requestAnimationFrame(tick);
            }
          };
          progressRafId = window.requestAnimationFrame(tick);
        }
        return;
      }
    } catch {
      if (activePlayToken !== token) return;
    }
  }

  if (activePlayToken !== token) return;

  // Final attempt with HTMLAudioElement even if not previously unlocked
  const ok = await playViaHtmlAudio(bytes, mimeType, token, callbacks);
  if (!ok && activePlayToken === token) {
    if (callbacks.onBlocked) {
      callbacks.onBlocked();
    } else {
      callbacks.onError();
    }
  }
}

export function playBase64AudioAndWait(
  audioBase64: string,
  mimeType: string,
  onStart?: (durationSec?: number) => void
): Promise<'ended' | 'stopped' | 'blocked' | 'error'> {
  return new Promise((resolve) => {
    const startToken = activePlayToken + 1;
    let settled = false;
    const onAbort = () => finish('stopped');
    const finish = (status: 'ended' | 'stopped' | 'blocked' | 'error') => {
      if (settled) return;
      settled = true;
      activeWaitStops.delete(onAbort);
      resolve(status);
    };

    activeWaitStops.add(onAbort);

    void playBase64Audio(audioBase64, mimeType, {
      onStart: (dur) => {
        if (activePlayToken !== startToken) {
          finish('stopped');
          return;
        }
        onStart?.(dur);
      },
      onEnd: () => finish('ended'),
      onBlocked: () => finish('blocked'),
      onError: () => finish('error'),
    }).then(() => {
      if (!settled && activePlayToken !== startToken) {
        finish('stopped');
      }
    });
  });
}
