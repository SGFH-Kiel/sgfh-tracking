import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Typography,
} from '@mui/material';
import {
  AddBoxOutlined as AddToHomeIcon,
  GetApp as InstallIcon,
  IosShare as ShareIcon,
} from '@mui/icons-material';
import { usePwa } from './usePwa';

/** Hinweis, wenn eine neue App-Version bereitsteht. */
export const PwaUpdateNotifier: React.FC = () => {
  const { updateAvailable, applyUpdate } = usePwa();
  const [dismissed, setDismissed] = useState(false);
  return (
    <Snackbar
      open={updateAvailable && !dismissed}
      message="Eine neue Version der App ist verfügbar."
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 88, sm: 24 } }}
      action={
        <>
          <Button color="secondary" size="small" onClick={applyUpdate}>Neu laden</Button>
          <Button color="inherit" size="small" onClick={() => setDismissed(true)}>Später</Button>
        </>
      }
    />
  );
};

export const IosInstallDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>App auf dem iPhone installieren</DialogTitle>
    <DialogContent>
      <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1.5 } }}>
        <li>
          <Typography variant="body2">
            Öffnen Sie diese Seite in <strong>Safari</strong>.
          </Typography>
        </li>
        <li>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            Tippen Sie unten auf <ShareIcon fontSize="small" aria-label="Teilen" /> <strong>Teilen</strong>.
          </Typography>
        </li>
        <li>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            Wählen Sie <AddToHomeIcon fontSize="small" aria-hidden /> <strong>Zum Home-Bildschirm</strong> und bestätigen Sie mit „Hinzufügen“.
          </Typography>
        </li>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Danach starten Sie die App über das SGFH-Symbol auf dem Home-Bildschirm.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Verstanden</Button>
    </DialogActions>
  </Dialog>
);

/**
 * Startet die Installation: native Abfrage auf Android/Desktop, Anleitung auf iOS.
 * Rendert nichts, wenn keine Installation möglich ist oder die App bereits installiert läuft.
 */
export const useInstallAction = (): { installable: boolean; install: () => void; dialog: React.ReactNode } => {
  const { installable, canPromptInstall, needsIosInstructions, promptInstall } = usePwa();
  const [iosOpen, setIosOpen] = useState(false);
  const install = () => {
    if (canPromptInstall) {
      promptInstall();
    } else if (needsIosInstructions) {
      setIosOpen(true);
    }
  };
  return {
    installable,
    install,
    dialog: <IosInstallDialog open={iosOpen} onClose={() => setIosOpen(false)} />,
  };
};

export const InstallAppButton: React.FC<{ variant?: 'text' | 'outlined' | 'contained'; fullWidth?: boolean }> = ({ variant = 'outlined', fullWidth }) => {
  const { installable, install, dialog } = useInstallAction();
  if (!installable) return null;
  return (
    <>
      <Button variant={variant} startIcon={<InstallIcon />} onClick={install} fullWidth={fullWidth}>
        App installieren
      </Button>
      {dialog}
    </>
  );
};
