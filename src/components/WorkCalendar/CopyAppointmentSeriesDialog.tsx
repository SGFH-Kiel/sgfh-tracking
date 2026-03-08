import React, { useState, useMemo } from 'react';
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
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Divider,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { WorkAppointment } from '../../types/models';

interface CopyAppointmentSeriesDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: WorkAppointment;
  onSave: (copies: Omit<WorkAppointment, 'id'>[]) => Promise<void>;
}

type IntervalUnit = 'days' | 'weeks';

export const CopyAppointmentSeriesDialog: React.FC<CopyAppointmentSeriesDialogProps> = ({
  open,
  onClose,
  appointment,
  onSave,
}) => {
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('weeks');
  const [count, setCount] = useState(4);
  const [saving, setSaving] = useState(false);

  const durationMs = appointment.endTime.getTime() - appointment.startTime.getTime();

  const copies = useMemo<Omit<WorkAppointment, 'id'>[]>(() => {
    const result: Omit<WorkAppointment, 'id'>[] = [];
    const intervalDays = intervalUnit === 'weeks' ? intervalValue * 7 : intervalValue;
    for (let i = 1; i <= Math.max(1, Math.min(count, 52)); i++) {
      const newStart = dayjs(appointment.startTime).add(intervalDays * i, 'day').toDate();
      const newEnd = new Date(newStart.getTime() + durationMs);
      const copy: Omit<WorkAppointment, 'id'> = {
        title: appointment.title,
        description: appointment.description,
        startTime: newStart,
        endTime: newEnd,
        participants: [],
        supplies: [...appointment.supplies],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (appointment.boatId) copy.boatId = appointment.boatId;
      if (appointment.maxParticipants) copy.maxParticipants = appointment.maxParticipants;
      if (appointment.private !== undefined) copy.private = appointment.private;
      if (appointment.createdByUserId) copy.createdByUserId = appointment.createdByUserId;
      if (appointment.createdByUserName) copy.createdByUserName = appointment.createdByUserName;
      result.push(copy);
    }
    return result;
  }, [appointment, intervalValue, intervalUnit, count, durationMs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(copies);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 3, px: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="primary.contrastText">
          Als Serie kopieren
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }} color="primary.contrastText">
          {appointment.title}
        </Typography>
      </Box>

      <DialogContent>
        <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Erstellt {copies.length} Kopie{copies.length !== 1 ? 'n' : ''} ohne Teilnehmer.
            Start- und Endzeit werden jeweils um das gewählte Intervall verschoben.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              label="Intervall"
              type="number"
              value={intervalValue}
              onChange={(e) => setIntervalValue(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1, max: 365 }}
              sx={{ width: 100 }}
            />
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Einheit</InputLabel>
              <Select
                value={intervalUnit}
                label="Einheit"
                onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
              >
                <MenuItem value="days">Tage</MenuItem>
                <MenuItem value="weeks">Wochen</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Anzahl Kopien"
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 52 }}
              sx={{ width: 140 }}
            />
          </Box>

          <Divider />

          <Typography variant="subtitle2" color="text.secondary">
            Vorschau ({copies.length} Termine)
          </Typography>
          <List dense sx={{ maxHeight: 240, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {copies.map((copy, i) => (
              <ListItem key={i} divider={i < copies.length - 1}>
                <ListItemText
                  primary={copy.title}
                  secondary={`${dayjs(copy.startTime).format('dd, DD.MM.YYYY HH:mm')} – ${dayjs(copy.endTime).format('HH:mm')} Uhr`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined" disabled={saving}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <CopyIcon />}
            disabled={saving}
          >
            {copies.length} Termin{copies.length !== 1 ? 'e' : ''} erstellen
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
