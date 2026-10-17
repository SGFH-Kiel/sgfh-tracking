import { useMediaQuery, useTheme } from '@mui/material';

/** true unterhalb des `sm`-Breakpoints (Smartphones im Hochformat). */
export const useIsMobile = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
};

/** Gemeinsame Gestaltung für Dialoge: auf Smartphones bildschirmfüllend, damit alle Aktionen erreichbar bleiben. */
export const useResponsiveDialogProps = (): { fullScreen: boolean } => {
  return { fullScreen: useIsMobile() };
};

/** Startzeit für neue Einträge ohne gewählten Kalender-Slot: nächste volle Stunde, Dauer zwei Stunden. */
export const getDefaultNewSlot = (now: Date = new Date()): { start: Date; end: Date } => {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return { start, end };
};
