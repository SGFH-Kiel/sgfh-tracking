import React, { useState } from 'react';
import { Alert, Button } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useUiVersion } from '../hooks/useUiVersion';
import { useApp } from '../contexts/AppContext';

const DISMISS_KEY = 'sgfh.tryV2Banner.dismissed';

const readDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/** Hinweis in der klassischen Ansicht, dass die neue Oberfläche ausprobiert werden kann. */
export const TryV2Banner: React.FC = () => {
  const { canUseV2, version, setVersion } = useUiVersion();
  const { systemConfig } = useApp();
  const released = systemConfig.featureFlags?.uiV2ForMembers === true;
  const { enqueueSnackbar } = useSnackbar();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!canUseV2 || version !== 'v1' || dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ohne Speicher erscheint der Hinweis beim nächsten Laden wieder
    }
    setDismissed(true);
  };

  return (
    <Alert
      severity="info"
      sx={{ mb: 2 }}
      onClose={dismiss}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => setVersion('v2').catch(() => enqueueSnackbar('Umschalten fehlgeschlagen', { variant: 'error' }))}
        >
          Ausprobieren
        </Button>
      }
    >
      {released ? 'Die neue Oberfläche ist verfügbar.' : 'Die neue Oberfläche ist als Vorschau für Admins verfügbar.'} Sie können jederzeit in „Mehr“ bzw. in Ihren Einstellungen zurückwechseln.
    </Alert>
  );
};
