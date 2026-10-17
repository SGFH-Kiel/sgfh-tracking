import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, Divider, Paper, Typography } from '@mui/material';
import {
  AutoAwesome as FeatureIcon,
  BugReport as FixIcon,
  Security as SecurityIcon,
  TrendingUp as ImprovementIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useChangelog } from '../../hooks/useChangelog';
import { ChangelogAudience, ChangelogEntryType } from '../../domain/changelog';

const TYPE_META: Record<ChangelogEntryType, { label: string; color: 'primary' | 'success' | 'warning' | 'info'; icon: React.ReactElement }> = {
  feature: { label: 'Neue Funktion', color: 'primary', icon: <FeatureIcon fontSize="small" /> },
  improvement: { label: 'Verbesserung', color: 'success', icon: <ImprovementIcon fontSize="small" /> },
  fix: { label: 'Fehlerbehebung', color: 'warning', icon: <FixIcon fontSize="small" /> },
  security: { label: 'Rechte & Sicherheit', color: 'info', icon: <SecurityIcon fontSize="small" /> },
};

const AUDIENCE_LABEL: Record<ChangelogAudience, string | null> = {
  all: null,
  bootswart: 'Für Bootswarte',
  admin: 'Für Admins',
  superadmin: 'Für Superadmins',
};

export const ChangelogView: React.FC = () => {
  const { setBreadcrumbs } = usePageTitle();
  const { visible, unseen, markAllSeen } = useChangelog();
  // Beim ersten Rendern ungelesene Einträge merken, damit die Markierung „Neu“ nach dem Speichern sichtbar bleibt.
  const [newIds] = useState(() => new Set(unseen.map((entry) => entry.id)));
  const markedRef = useRef(false);

  useEffect(() => {
    setBreadcrumbs([{ text: 'Neuigkeiten' }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!markedRef.current && unseen.length > 0) {
      markedRef.current = true;
      markAllSeen();
    }
  }, [unseen.length, markAllSeen]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" gutterBottom>Neuigkeiten</Typography>
        <Typography variant="body2" color="text.secondary">
          Alle Änderungen an der App – neue Funktionen, geänderte Regeln und Fehlerbehebungen. Hinweise speziell für Ihre Rolle sind gekennzeichnet.
        </Typography>
      </Paper>

      {visible.length === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">Noch keine Einträge.</Typography>
        </Paper>
      )}

      {visible.map((entry) => {
        const meta = TYPE_META[entry.type];
        return (
          <Paper key={entry.id} sx={{ p: { xs: 2, sm: 3 } }} component="article">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {dayjs(entry.date).locale('de').format('DD. MMMM YYYY')}
              </Typography>
              <Chip size="small" icon={meta.icon} label={meta.label} color={meta.color} variant="outlined" />
              {newIds.has(entry.id) && <Chip size="small" label="Neu" color="error" />}
            </Box>
            <Typography variant="h6" component="h2">{entry.title}</Typography>
            {entry.summary && (
              <Typography variant="body1" sx={{ mt: 1 }}>{entry.summary}</Typography>
            )}
            {entry.sections.map((section, index) => {
              const audience = AUDIENCE_LABEL[section.audience];
              return (
                <Box key={`${entry.id}-${index}`} sx={{ mt: 2 }}>
                  {(audience || section.title) && (
                    <>
                      <Divider sx={{ mb: 1.5 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                        {audience && <Chip size="small" label={audience} color="secondary" />}
                        {section.title && <Typography variant="subtitle2">{section.title}</Typography>}
                      </Box>
                    </>
                  )}
                  <Box component="ul" sx={{ m: 0, pl: 3 }}>
                    {section.items.map((item) => (
                      <Typography component="li" variant="body2" key={item} sx={{ mb: 0.5 }}>{item}</Typography>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Paper>
        );
      })}
    </Box>
  );
};
