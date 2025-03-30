import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { WorkAppointment } from '../../types/models';
import dayjs, { Dayjs } from 'dayjs';
import { useApp } from '../../contexts/AppContext';
import { DateTimePicker } from '@mui/x-date-pickers';

interface AppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (appointment: Partial<WorkAppointment>) => Promise<void>;
  startTime: Date;
  endTime: Date;
  appointment?: WorkAppointment;
}

export const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  open,
  onClose,
  onSave,
  startTime,
  endTime,
  appointment,
}) => {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    startTime: Dayjs;
    endTime: Dayjs;
    boatId: string | undefined;
    maxParticipants?: number;
    supplies: string[];
  }>({
    title: '',
    description: '',
    startTime: dayjs(startTime),
    endTime: dayjs(endTime),
    boatId: '',
    supplies: [] as string[],
  });
  const [newSupply, setNewSupply] = useState('');
  const { currentUser, boats, isAdmin } = useApp();

  useEffect(() => {
    if (appointment) {
      setFormData({
        title: appointment.title,
        description: appointment.description,
        startTime: dayjs(appointment.startTime),
        endTime: dayjs(appointment.endTime),
        boatId: appointment.boatId || '',
        maxParticipants: appointment.maxParticipants,
        supplies: appointment.supplies,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        startTime: dayjs(startTime),
        endTime: dayjs(endTime),
        boatId: '',
        supplies: [],
      });
    }
  }, [appointment, startTime, endTime]);

  const handleSubmit = async () => {
    const appointmentData: Partial<WorkAppointment> = {
      title: formData.title,
      description: formData.description,
      startTime: formData.startTime.toDate(),
      endTime: formData.endTime.toDate(),
      boatId: formData.boatId || '',
      supplies: formData.supplies,
      participants: [],
    };
    if (formData.maxParticipants) {
      appointmentData.maxParticipants = formData.maxParticipants;
    }

    await onSave(appointmentData);
    onClose();
  };

  const handleAddSupply = () => {
    if (newSupply && !formData.supplies?.includes(newSupply)) {
      setFormData({
        ...formData,
        supplies: [...(formData.supplies || []), newSupply],
      });
      setNewSupply('');
    }
  };

  const handleDeleteSupply = (supply: string) => {
    setFormData({
      ...formData,
      supplies: formData.supplies?.filter(s => s !== supply),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 3, px: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }} color="primary.contrastText">
          {appointment ? 'Arbeitstermin bearbeiten' : 'Neuer Arbeitstermin'}
        </Typography>
      </Box>
      <DialogContent>
        <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          label="Titel"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          fullWidth
          variant="outlined"
          required
          placeholder="Titel des Arbeitstermins"
        />
        <TextField
          label="Beschreibung"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          fullWidth
          variant="outlined"
          multiline
          rows={4}
          placeholder="Optionale Beschreibung"
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <DateTimePicker
            label="Startzeit"
            value={formData.startTime}
            onChange={(newValue: Dayjs | null) => {
              if (newValue) {
                setFormData({ ...formData, startTime: newValue });
              }
            }}
            sx={{ flex: 1 }}
            format="DD.MM.YYYY HH:mm"
          />
          <DateTimePicker
            label="Endzeit"
            value={formData.endTime}
            onChange={(newValue: Dayjs | null) => {
              if (newValue) {
                setFormData({ ...formData, endTime: newValue });
              }
            }}
            minDateTime={formData.startTime}
            sx={{ flex: 1 }}
            format="DD.MM.YYYY HH:mm"
          />
        </Box>
        <FormControl fullWidth variant="outlined">
          <InputLabel>Boot</InputLabel>
          <Select
            value={formData.boatId}
            onChange={(e) => setFormData({ ...formData, boatId: e.target.value })}
            label="Boot"
          >
            <MenuItem value="">Kein Boot</MenuItem>
            {boats.filter(b=> isAdmin || b.bootswart === currentUser?.id).map((boat) => (
              <MenuItem key={boat.id} value={boat.id}>
                {boat.name}
                </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Maximale Teilnehmer"
          type="number"
          value={formData.maxParticipants}
          onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
          fullWidth
          variant="outlined"
          placeholder="Optional: Maximale Anzahl an Teilnehmern"
        />
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              label="Benötigtes Material"
              value={newSupply}
              onChange={(e) => setNewSupply(e.target.value)}
              fullWidth
            />
            <Button onClick={handleAddSupply} variant="outlined">
              Hinzufügen
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {formData.supplies?.map((supply) => (
              <Chip
                key={supply}
                label={supply}
                onDelete={() => handleDeleteSupply(supply)}
              />
            ))}
          </Box>
        </Box>
      </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined">Abbrechen</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
          >
            {appointment ? 'Speichern' : 'Erstellen'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
