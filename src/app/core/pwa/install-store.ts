import { useSyncExternalStore } from 'react';

/**
 * The browser fires `beforeinstallprompt` once, early, and often before React
 * has mounted anything. A component that registers the listener inside an
 * effect misses it on every load where that component is not rendered — which
 * is every visit by a signed-in member, since the prompt used to live only on
 * the login screen. So the listeners are attached here at startup instead, and
 * the deferred event is kept module-side for whichever screen wants to offer
 * the install.
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type InstallState = {
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
};

let state: InstallState = { installEvent: null, installed: false };
let started = false;
const listeners = new Set<() => void>();

function setState(next: InstallState) {
  state = next;

  for (const listener of listeners) {
    listener();
  }
}

/** Call once from main.tsx, before the first render. */
export function startInstallPromptCapture() {
  if (started || typeof window === 'undefined') {
    return;
  }

  started = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    // Chrome shows its own mini-infobar unless the event is cancelled.
    event.preventDefault();
    setState({ ...state, installEvent: event as BeforeInstallPromptEvent });
  });

  window.addEventListener('appinstalled', () => {
    setState({ installed: true, installEvent: null });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export function useInstallState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** A deferred prompt can only be used once, so it is dropped after it is shown. */
export function consumeInstallEvent() {
  setState({ ...state, installEvent: null });
}

/** Already running as an installed app, so there is nothing to offer. */
export function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false;
  }

  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    iosNavigator.standalone === true
  );
}

/**
 * iOS never fires `beforeinstallprompt`; installing there is a manual trip
 * through the Share sheet, so those members get instructions instead of a
 * prompt. iPadOS reports itself as MacIntel, hence the touch-point check.
 */
export function isIosDevice() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' &&
      window.navigator.maxTouchPoints > 1)
  );
}
