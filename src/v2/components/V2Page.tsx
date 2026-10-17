import React, { useEffect } from 'react';
import { Box, Chip, Fab, Paper, Skeleton, Stack, SxProps, Theme, Typography } from '@mui/material';
import { usePageTitle } from '../../contexts/PageTitleContext';

// Achtung: In MUI-sx bedeutet `width: 1` 100 % – für „nur für Screenreader“ daher explizit '1px'.
const visuallyHiddenOnMobile = {
  position: { xs: 'absolute', sm: 'static' },
  width: { xs: '1px', sm: 'auto' },
  height: { xs: '1px', sm: 'auto' },
  m: { xs: '-1px', sm: 0 },
  overflow: { xs: 'hidden', sm: 'visible' },
  whiteSpace: { xs: 'nowrap', sm: 'normal' },
  clip: { xs: 'rect(0 0 0 0)', sm: 'auto' },
} as const;

/** Seitenrahmen für v2: setzt den Titel (App-Leiste) und begrenzt die Lesebreite. */
export const V2Page: React.FC<{ title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, actions, children }) => {
  const { setBreadcrumbs } = usePageTitle();
  useEffect(() => {
    setBreadcrumbs([{ text: title }]);
  }, [setBreadcrumbs, title]);

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* Auf Smartphones steht der Titel bereits in der App-Leiste – die Überschrift bleibt für Screenreader erhalten. */}
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 600, ...visuallyHiddenOnMobile }}
          >
            {title}
          </Typography>
          {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
        {actions}
      </Box>
      {children}
    </Box>
  );
};

/** Karte mit Überschrift für Übersichtsbereiche. */
export const V2Card: React.FC<{ title?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; sx?: SxProps<Theme> }> = ({ title, icon, action, children, sx }) => (
  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, ...sx }} component="section">
    {(title || action) && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {icon && <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>}
        {title && <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>{title}</Typography>}
        {action}
      </Box>
    )}
    {children}
  </Paper>
);

export const V2EmptyState: React.FC<{ icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <Stack alignItems="center" spacing={1} sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
    {icon && <Box sx={{ fontSize: 40, display: 'flex', opacity: 0.6 }}>{icon}</Box>}
    <Typography variant="subtitle1" color="text.primary">{title}</Typography>
    {description && <Typography variant="body2">{description}</Typography>}
    {action}
  </Stack>
);

export const V2ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <Stack spacing={1.5}>
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} variant="rounded" height={72} />
    ))}
  </Stack>
);

/** Einheitliche Statusbegriffe für Arbeitsstunden (siehe docs/ux-audit-v2.md). */
export type V2WorkStatus = 'open' | 'planned' | 'confirmed' | 'declined';

const STATUS_META: Record<V2WorkStatus, { label: string; color: 'warning' | 'info' | 'success' | 'error' }> = {
  open: { label: 'Offen', color: 'warning' },
  planned: { label: 'Geplant', color: 'info' },
  confirmed: { label: 'Bestätigt', color: 'success' },
  declined: { label: 'Abgelehnt', color: 'error' },
};

export const V2StatusChip: React.FC<{ status: V2WorkStatus }> = ({ status }) => (
  <Chip size="small" label={STATUS_META[status].label} color={STATUS_META[status].color} variant={status === 'open' ? 'outlined' : 'filled'} />
);

export const workStatusOf = (participantStatus: 'pending' | 'confirmed' | 'declined', endTime: Date, now: Date = new Date()): V2WorkStatus => {
  if (participantStatus === 'declined') return 'declined';
  if (participantStatus === 'pending') return 'open';
  return endTime > now ? 'planned' : 'confirmed';
};

/** Schwebender Hauptaktions-Button, auf Smartphones oberhalb der Navigationsleiste. */
export const V2Fab: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void }> = ({ label, icon, onClick }) => (
  <>
  {/* Platzhalter, damit der letzte Eintrag nicht unter dem Button verschwindet */}
  <Box aria-hidden sx={{ height: { xs: 64, md: 72 }, flexShrink: 0 }} />
  <Fab
    variant="extended"
    color="primary"
    onClick={onClick}
    aria-label={label}
    sx={{
      position: 'fixed',
      textTransform: 'none',
      fontSize: '1rem',
      right: { xs: 16, md: 32 },
      bottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 32 },
      zIndex: (theme) => theme.zIndex.appBar - 1,
    }}
  >
    <Box sx={{ display: 'flex', mr: 1 }}>{icon}</Box>
    {label}
  </Fab>
  </>
);
