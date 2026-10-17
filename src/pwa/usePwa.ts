import { useSyncExternalStore } from 'react';
import { applyUpdate, getPwaState, isIos, isStandalone, promptInstall, subscribePwa } from './pwa';

export interface PwaInfo {
  /** App läuft bereits installiert (Home-Bildschirm/eigenes Fenster). */
  standalone: boolean;
  /** Native Installations-Abfrage verfügbar (Android/Desktop-Chromium). */
  canPromptInstall: boolean;
  /** iPhone/iPad im Browser: Installation nur manuell über „Zum Home-Bildschirm“. */
  needsIosInstructions: boolean;
  /** Irgendeine Form der Installation ist möglich und sinnvoll. */
  installable: boolean;
  updateAvailable: boolean;
  promptInstall: () => Promise<boolean>;
  applyUpdate: () => void;
}

export const usePwa = (): PwaInfo => {
  const state = useSyncExternalStore(subscribePwa, getPwaState, getPwaState);
  const standalone = isStandalone() || state.installed;
  // Installation nur anbieten, wenn der Service Worker läuft (Offline-Start, Updates) – sonst wäre die App nur ein Lesezeichen.
  const supported = state.serviceWorkerReady;
  const canPromptInstall = supported && !standalone && !!state.installPrompt;
  const needsIosInstructions = supported && !standalone && isIos();
  return {
    standalone,
    canPromptInstall,
    needsIosInstructions,
    installable: canPromptInstall || needsIosInstructions,
    updateAvailable: !!state.waitingWorker,
    promptInstall,
    applyUpdate,
  };
};
