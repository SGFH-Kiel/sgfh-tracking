import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { SystemConfig as SystemConfigType, CalendarView } from '../../types/models';
import { useApp } from '../../contexts/AppContext';
import { isSeasonModelActive } from '../../domain/seasons';
import { SeasonControl } from './SeasonControl';

const CALENDAR_VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Monat' },
  { value: 'week', label: 'Woche' },
  { value: 'day', label: 'Tag' },
];

const DEFAULT_CALENDAR_VIEW: CalendarView = 'month';

export const SystemConfig: React.FC = () => {
  const { setBreadcrumbs } = usePageTitle();

  useEffect(() => {
    setBreadcrumbs([
      { text: 'Systemeinstellungen' },
    ]);
  }, [setBreadcrumbs]);
  const { isAdmin, isSuperAdmin, database, systemConfig, reloadSystemConfig } = useApp();
  const modelActive = isSeasonModelActive(systemConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<SystemConfigType>({
    id: 'default',
    yearChangeDate: new Date(new Date().getFullYear(), 0, 1),
    workHourThreshold: 20,
    calendarDefaults: { vormerkbuch: DEFAULT_CALENDAR_VIEW, arbeitskalender: DEFAULT_CALENDAR_VIEW },
  });


  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await database.getDocument<SystemConfigType>('systemConfig', 'default');
        if (configDoc) {
          setConfig(configDoc);
        }
      } catch (err) {
        setError('Fehler beim Laden der Konfiguration');
        console.error('Error fetching config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [database]);

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Nur die Felder dieses Formulars schreiben, damit die Saisonsteuerung nicht mit einem
      // veralteten Stand überschrieben wird.
      const generalSettings: Partial<SystemConfigType> = {
        yearChangeDate: config.yearChangeDate,
        workHourThreshold: config.workHourThreshold,
        ...(config.calendarDefaults ? { calendarDefaults: config.calendarDefaults } : {}),
        featureFlags: { ...(config.featureFlags ?? {}), uiV2ForMembers: config.featureFlags?.uiV2ForMembers === true },
        updatedAt: new Date(),
      };
      const existing = await database.getDocument<SystemConfigType>('systemConfig', 'default');
      if (existing) {
        await database.updateDocument<SystemConfigType>('systemConfig', 'default', generalSettings);
      } else {
        await database.setDocument<SystemConfigType>('systemConfig', 'default', { ...config, ...generalSettings });
      }
      await reloadSystemConfig();
      setSuccess(true);
    } catch (err) {
      setError('Fehler beim Speichern der Konfiguration');
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  // Superadmins verwalten alle Einstellungen; Admins sehen nach Aktivierung des Saisonmodells nur die Saisonsteuerung.
  if (!isSuperAdmin && !(isAdmin && modelActive)) {
    return (
      <Alert severity="error">
        Sie haben keine Berechtigung, diese Seite zu sehen.
      </Alert>
    );
  }

  if (loading) {
    return <CircularProgress />;
  }

  if (!isSuperAdmin) {
    return <SeasonControl />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <SeasonControl />
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Systemkonfiguration
      </Typography>

      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <DatePicker
          label={modelActive ? 'Stichtag für Alt-Einträge ohne Saison' : 'Datum Jahreswechsel'}
          value={dayjs(config.yearChangeDate).year(dayjs().year())}
          onChange={(date: dayjs.Dayjs | null) => {
            if (date) {
              // Store only month and day, using Jan 1, 2000 as base year
              const baseDate = new Date(2000, date.month(), date.date());
              setConfig({ ...config, yearChangeDate: baseDate });
            }
          }}
          views={['month', 'day']}
          format="DD.MM"
          slotProps={{
            textField: {
              size: 'medium',
              helperText: modelActive
                ? 'Wird nur noch für Einträge ohne gespeicherte Saison verwendet. Die aktuelle Saison wird über die Saisonsteuerung gewechselt.'
                : undefined,
            },
          }}
        />

        <TextField
          label={modelActive ? 'Mindestarbeitsstunden pro Saison' : 'Mindestarbeitsstunden pro Jahr'}
          type="number"
          value={config.workHourThreshold}
          onChange={(e) =>
            setConfig({
              ...config,
              workHourThreshold: parseInt(e.target.value) || 0,
            })
          }
          InputProps={{ inputProps: { min: 0 } }}
        />

        <Divider />
        <Typography variant="subtitle1" fontWeight="medium">
          Neue Oberfläche (v2)
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={config.featureFlags?.uiV2ForMembers === true}
              onChange={(e) => setConfig({
                ...config,
                featureFlags: { ...(config.featureFlags ?? {}), uiV2ForMembers: e.target.checked },
              })}
            />
          }
          label="Für alle Mitglieder freischalten"
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
          Admins können die neue Oberfläche immer als Vorschau testen. Nach der Freigabe kann jedes Mitglied in „Meine Einstellungen“ selbst umschalten; Standard bleibt die klassische Ansicht.
        </Typography>

        <Divider />
        <Typography variant="subtitle1" fontWeight="medium">
          Standard-Kalenderansicht
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Vormerkbuch</InputLabel>
            <Select
              value={config.calendarDefaults?.vormerkbuch ?? DEFAULT_CALENDAR_VIEW}
              label="Vormerkbuch"
              onChange={(e) => setConfig({
                ...config,
                calendarDefaults: {
                  arbeitskalender: config.calendarDefaults?.arbeitskalender ?? DEFAULT_CALENDAR_VIEW,
                  vormerkbuch: e.target.value as CalendarView,
                },
              })}
            >
              {CALENDAR_VIEW_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Arbeitskalender</InputLabel>
            <Select
              value={config.calendarDefaults?.arbeitskalender ?? DEFAULT_CALENDAR_VIEW}
              label="Arbeitskalender"
              onChange={(e) => setConfig({
                ...config,
                calendarDefaults: {
                  vormerkbuch: config.calendarDefaults?.vormerkbuch ?? DEFAULT_CALENDAR_VIEW,
                  arbeitskalender: e.target.value as CalendarView,
                },
              })}
            >
              {CALENDAR_VIEW_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(false)}>
            Konfiguration erfolgreich gespeichert
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ minWidth: 120 }}
          >
            {saving ? <CircularProgress size={24} /> : 'Speichern'}
          </Button>
        </Box>
      </Box>
    </Paper>
    </Box>
  );
};
