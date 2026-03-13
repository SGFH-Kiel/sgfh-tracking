import React, { useState, useEffect } from 'react';
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
  Alert,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import { WorkAppointment } from '../../types/models';
import { useApp } from '../../contexts/AppContext';
import { useSnackbar } from 'notistack';

interface PrivateWorkHoursDialogProps {
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  appointment?: WorkAppointment;
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
  appointment: editAppointment,
}) => {
  const { database, currentUser, isAdmin, isAnyBootswart, boats } = useApp();
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PrivateWorkHoursFormData>({
    title: '',
    description: '',
    startTime: dayjs(),
    endTime: dayjs().add(2, 'hour'),
    boatId: '',
  });

  useEffect(() => {
    if (open) {
      if (editAppointment) {
        const participant = editAppointment.participants.find(p => p.userId === currentUser?.id);
        setFormData({
          title: editAppointment.title,
          description: editAppointment.description,
          startTime: dayjs(participant?.startTime ?? editAppointment.startTime),
          endTime: dayjs(participant?.endTime ?? editAppointment.endTime),
          boatId: editAppointment.boatId || '',
        });
      } else {
        setFormData({
          title: '',
          description: '',
          startTime: dayjs(),
          endTime: dayjs().add(2, 'hour'),
          boatId: '',
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editAppointment]);

  const handleSubmit = async () => {
    if (!currentUser || isSubmitting) return;
    setIsSubmitting(true);

    const boat = boats.find(b => b.id === formData.boatId);
    const autoConfirm = isAdmin || (boat && isAnyBootswart && (boat.bootswart === currentUser.id || boat.bootswart2 === currentUser.id));

    try {
      if (editAppointment) {
        const updatedParticipants = editAppointment.participants.map(p =>
          p.userId === currentUser.id
            ? { ...p, startTime: formData.startTime.toDate(), endTime: formData.endTime.toDate(), updatedAt: new Date() }
            : p
        );
        await database.updateDocument<WorkAppointment>('workAppointments', editAppointment.id, {
          title: formData.title || editAppointment.title,
          description: formData.description,
          startTime: formData.startTime.toDate(),
          endTime: formData.endTime.toDate(),
          boatId: formData.boatId || '',
          participants: updatedParticipants,
          updatedAt: new Date(),
        });
        enqueueSnackbar('Arbeitsstunden aktualisiert.', { variant: 'success' });
      } else {
        const newAppointment: Omit<WorkAppointment, 'id'> = {
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
          createdByUserId: currentUser.id,
          createdByUserName: currentUser.displayName,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await database.addDocument('workAppointments', newAppointment);
        enqueueSnackbar(
          autoConfirm
            ? 'Arbeitsstunden gespeichert und direkt angerechnet.'
            : 'Arbeitsstunden gespeichert. Der Eintrag wartet jetzt auf Bestätigung.',
          { variant: autoConfirm ? 'success' : 'info' }
        );
      }
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving private work hours:', error);
      enqueueSnackbar('Fehler beim Speichern der Arbeitsstunden', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 3, px: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }} color="primary.contrastText">
          {editAppointment ? 'Arbeitsstunden bearbeiten' : 'Private Arbeitsstunden'}
        </Typography>
      </Box>
      <DialogContent>
        <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Alert severity={isAdmin || (boats.find(b => b.id === formData.boatId)?.bootswart === currentUser?.id || boats.find(b => b.id === formData.boatId)?.bootswart2 === currentUser?.id) ? 'success' : 'info'}>
            {isAdmin || (boats.find(b => b.id === formData.boatId)?.bootswart === currentUser?.id || boats.find(b => b.id === formData.boatId)?.bootswart2 === currentUser?.id)
              ? 'Dieser Eintrag wird direkt bestätigt.'
              : 'Dieser Eintrag wird gespeichert und im Bereich Arbeitsstunden als ausstehend angezeigt, bis er bestätigt wurde.'}
          </Alert>
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
            disabled={isSubmitting}
          >
            {editAppointment ? 'Aktualisieren' : 'Speichern'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
