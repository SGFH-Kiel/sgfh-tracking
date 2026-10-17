/**
 * PWA-Hilfen: Service-Worker-Registrierung, Installations-Aufforderung und Update-Hinweis.
 * Der Zustand wird in einem kleinen Store gehalten, den React über `usePwa()` abonniert.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  installPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  waitingWorker: ServiceWorker | null;
}

let state: PwaState = { installPrompt: null, installed: false, waitingWorker: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaState(): PwaState {
  return state;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS meldet sich als Mac mit Touch
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Muss vor dem ersten Rendern aufgerufen werden, damit das einmalige Browser-Ereignis nicht verloren geht. */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    setState({ installPrompt: event as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => {
    setState({ installPrompt: null, installed: true });
  });
}

/** Zeigt die native Installations-Abfrage (Android/Desktop-Chromium). */
export async function promptInstall(): Promise<boolean> {
  const prompt = state.installPrompt;
  if (!prompt) return false;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  setState({ installPrompt: null, installed: choice.outcome === 'accepted' || state.installed });
  return choice.outcome === 'accepted';
}

/** Aktiviert einen wartenden Service Worker; die Seite lädt danach automatisch neu. */
export function applyUpdate(): void {
  state.waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
}

export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL}/service-worker.js`)
      .then((registration) => {
        const trackWaiting = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            // Nur bei einem Update (es gibt schon einen aktiven Worker) auf „Neu laden“ hinweisen.
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setState({ waitingWorker: worker });
            }
          });
        };
        if (registration.waiting && navigator.serviceWorker.controller) {
          setState({ waitingWorker: registration.waiting });
        }
        registration.addEventListener('updatefound', () => trackWaiting(registration.installing));
        // Regelmäßig nach Updates sehen (z. B. wenn die installierte App lange offen bleibt).
        window.setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
      })
      .catch((error) => console.error('Service worker registration failed:', error));

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}
