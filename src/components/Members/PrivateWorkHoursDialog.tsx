import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import { Boat, WorkAppointment } from '../../types/models';
import { useApp } from '../../contexts/AppContext';

interface PrivateWorkHoursDialogProps {
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface PrivateWorkHoursFormData {
  title: string;
  description: string;
  startTime: Dayjs;
  endTime: Dayjs;
  boatId?: string;
}

export const PrivateWorkHoursDialog: React.FC<PrivateWorkHoursDialogProps> = ({
  open,
  onClose,
  onUpdate,
}) => {
  const { database, currentUser, isAdmin, isAnyBootswart, boats } = useApp();
  const [formData, setFormData] = useState<PrivateWorkHoursFormData>({
    title: '',
    description: '',
    startTime: dayjs(),
    endTime: dayjs().add(2, 'hour'),
    boatId: '',
  });

  const handleSubmit = async () => {
    if (!currentUser) return;

    const boat = boats.find(b => b.id === formData.boatId);
    const autoConfirm = isAdmin || (boat && isAnyBootswart && boat.bootswart === currentUser.id);

    try {
      const appointment: Omit<WorkAppointment, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title || `Private Arbeitsstunden für ${currentUser.displayName}`,
        description: formData.description,
        startTime: formData.startTime.toDate(),
        endTime: formData.endTime.toDate(),
        maxParticipants: 1,
        boatId: formData.boatId || '',
        participants: [{
          userId: currentUser.id,
          userName: currentUser.displayName,
          status: autoConfirm ? 'confirmed' : 'pending',
          startTime: formData.startTime.toDate(),
          endTime: formData.endTime.toDate(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        supplies: [],
        private: true,
      };

      await database.addDocument('workAppointments', appointment);
      setFormData({
        title: '',
        description: '',
        startTime: dayjs(),
        endTime: dayjs().add(2, 'hour'),
        boatId: '',
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error creating private work hours:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 3, px: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }} color="primary.contrastText">
          Private Arbeitsstunden
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
            placeholder="Titel der Arbeitsstunden"
          />
          <TextField
            label="Beschreibung"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            placeholder="Beschreibung der durchgeführten Arbeit"
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>Boot</InputLabel>
            <Select
              value={formData.boatId}
              onChange={(e) => setFormData({ ...formData, boatId: e.target.value })}
              label="Boot"
            >
              <MenuItem value="">Kein Boot</MenuItem>
              {boats.map((boat) => (
                <MenuItem key={boat.id} value={boat.id}>
                  {boat.name}
                  </MenuItem>
              ))}
            </Select>
          </FormControl>
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
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined">
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
          >
            Speichern
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
