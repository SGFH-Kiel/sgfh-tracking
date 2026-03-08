import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useApp } from '../contexts/AppContext';
import { CalendarView, UserPreferences } from '../types/models';

interface UserPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

const CALENDAR_VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Monat' },
  { value: 'week', label: 'Woche' },
  { value: 'day', label: 'Tag' },
];

export const UserPreferencesDialog: React.FC<UserPreferencesDialogProps> = ({ open, onClose }) => {
  const { database, currentUser, systemConfig, reloadCurrentUser } = useApp();
  const { enqueueSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>({});

  useEffect(() => {
    if (open && currentUser) {
      setPrefs(currentUser.preferences ?? {});
    }
  }, [open, currentUser]);

  const systemDefault = (key: keyof NonNullable<UserPreferences['calendarDefaults']>): CalendarView =>
    systemConfig.calendarDefaults?.[key] ?? 'week';

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await database.updateDocument('users', currentUser.id, {
        preferences: prefs,
        updatedAt: new Date(),
      });
      await reloadCurrentUser();
      enqueueSnackbar('Einstellungen gespeichert.', { variant: 'success' });
      onClose();
    } catch (err) {
      console.error('Error saving preferences:', err);
      enqueueSnackbar('Fehler beim Speichern der Einstellungen.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 3, px: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="primary.contrastText">
          Meine Einstellungen
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }} color="primary.contrastText">
          {currentUser?.displayName}
        </Typography>
      </Box>
      <DialogContent>
        <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Standard-Kalenderansicht
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Vormerkbuch</InputLabel>
            <Select
              value={prefs.calendarDefaults?.vormerkbuch ?? `Standard (${CALENDAR_VIEW_OPTIONS.find(o => o.value === systemDefault('vormerkbuch'))?.label})`}
              label="Vormerkbuch"
              displayEmpty
              onChange={(e) => setPrefs({
                ...prefs,
                calendarDefaults: {
                  ...prefs.calendarDefaults,
                  vormerkbuch: (e.target.value as CalendarView) || undefined,
                } as UserPreferences['calendarDefaults'],
              })}
              renderValue={(val) =>
                val
                  ? CALENDAR_VIEW_OPTIONS.find(o => o.value === val)?.label ?? val
                  : `Standard (${CALENDAR_VIEW_OPTIONS.find(o => o.value === systemDefault('vormerkbuch'))?.label})`
              }
            >
              {CALENDAR_VIEW_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Arbeitskalender</InputLabel>
            <Select
              value={prefs.calendarDefaults?.arbeitskalender ?? `Standard (${CALENDAR_VIEW_OPTIONS.find(o => o.value === systemDefault('arbeitskalender'))?.label})`}
              label="Arbeitskalender"
              displayEmpty
              onChange={(e) => setPrefs({
                ...prefs,
                calendarDefaults: {
                  ...prefs.calendarDefaults,
                  arbeitskalender: (e.target.value as CalendarView) || undefined,
                } as UserPreferences['calendarDefaults'],
              })}
              renderValue={(val) =>
                val
                  ? CALENDAR_VIEW_OPTIONS.find(o => o.value === val)?.label ?? val
                  : `Standard (${CALENDAR_VIEW_OPTIONS.find(o => o.value === systemDefault('arbeitskalender'))?.label})`
              }
            >
              {CALENDAR_VIEW_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined">Abbrechen</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            disabled={saving}
          >
            Speichern
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
