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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { SystemConfig as SystemConfigType } from '../../types/models';
import { useApp } from '../../contexts/AppContext';

export const SystemConfig: React.FC = () => {
  const { setBreadcrumbs } = usePageTitle();

  useEffect(() => {
    setBreadcrumbs([
      { text: 'Systemeinstellungen' },
    ]);
  }, [setBreadcrumbs]);
  const { isAdmin, database } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<SystemConfigType>({
    id: 'default',
    yearChangeDate: new Date(new Date().getFullYear(), 0, 1),
    workHourThreshold: 20,
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
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await database.setDocument<SystemConfigType>('systemConfig', 'default', {
        ...config,
        updatedAt: new Date(),
      });
      setSuccess(true);
    } catch (err) {
      setError('Fehler beim Speichern der Konfiguration');
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Alert severity="error">
        Sie haben keine Berechtigung, diese Seite zu sehen.
      </Alert>
    );
  }

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <>
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Systemkonfiguration
      </Typography>

      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <DatePicker
          label="Datum Jahreswechsel"
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
            textField: { size: 'medium' },
          }}
        />

        <TextField
          label="Mindestarbeitsstunden pro Jahr"
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
    </>
  );
};
