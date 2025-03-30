import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
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
  ChipOwnProps,
  Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useApp } from '../../contexts/AppContext';
import { BoatReservation } from '../../types/models';
import { useOverlappingReservations } from '../../hooks/useOverlappingReservations';

interface ReservationDialogProps {
  open: boolean;
  onClose: () => void;
  startTime: Date;
  endTime: Date;
  onUpdate: () => void;
}

interface FormData {
  boatId: string;
  title: string;
  description: string;
  startTime: Dayjs;
  endTime: Dayjs;
  status: 'pending' | 'approved' | 'rejected';
}

export const ReservationDialog: React.FC<ReservationDialogProps> = ({
  open,
  onClose,
  startTime,
  endTime,
  onUpdate,
}) => {
  const { database, currentUser, boats } = useApp();
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<FormData>({
    boatId: '',
    title: '',
    description: '',
    startTime: dayjs(startTime),
    endTime: dayjs(endTime),
    status: 'pending',
  });

  const { overlappingReservations, hasOverlappingReservations } = useOverlappingReservations({
    startTime: formData.startTime,
    endTime: formData.endTime,
  });

  const handleSubmit = async () => {
    const [hasOverlapping] = await hasOverlappingReservations(formData.boatId);
    if (hasOverlapping) {
      enqueueSnackbar('Dieses Boot ist in dem gewählten Zeitraum bereits reserviert.', { variant: 'error' });
      return;
    }
    if (!currentUser) return;

    try {
      const selectedBoat = boats.find(boat => boat.id === formData.boatId);
      if (!selectedBoat) return;

      const reservation: Omit<BoatReservation, 'id' | 'createdAt' | 'updatedAt'> = {
        boatId: formData.boatId,
        userId: currentUser.id,
        userName: currentUser.displayName,
        title: formData.title || `Reservierung von ${currentUser.displayName}`,
        description: formData.description,
        startTime: formData.startTime.toDate(),
        endTime: formData.endTime.toDate(),
        status: (selectedBoat.requiresApproval && currentUser.id !== selectedBoat.bootswart) ? 'pending' : 'approved',
      };

      await database.addDocument('boatReservations', reservation);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error creating reservation:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 3, px: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }} color="primary.contrastText">
          Neue Reservierung
        </Typography>
      </Box>
      <DialogContent>
        <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DateTimePicker
              label="Startzeit"
              value={formData.startTime}
              onChange={(newValue: Dayjs | null) => {
                if (newValue) {
                  setFormData({ ...formData, boatId: '', startTime: newValue });
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
                  setFormData({ ...formData, boatId: '', endTime: newValue });
                }
              }}
              minDateTime={formData.startTime}
              sx={{ flex: 1 }}
              format="DD.MM.YYYY HH:mm"
            />
          </Box>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Boot auswählen</InputLabel>
            <Select
              value={formData.boatId}
              label="Boot auswählen"
              onChange={(e) => setFormData({ ...formData, boatId: e.target.value })}
            >
              {boats.map((boat) => {
                const isBlocked = boat.blocked;
                const isReserved = overlappingReservations.some(reservation => reservation.boatId === boat.id);
                const chipProps: ChipOwnProps = {
                  sx: { ml: 1 },
                  variant: 'outlined',
                  color: 'error'
                }
                return (
                <MenuItem key={boat.id} value={boat.id} disabled={isBlocked || isReserved}>
                  {boat.name} {isBlocked ? <Chip label="blockiert" {...chipProps} /> : ''} {isReserved ? <Chip label="reserviert" {...chipProps} /> : ''}
                </MenuItem>
              )})}
            </Select>
          </FormControl>

          <TextField
            label="Titel"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            variant="outlined"
            placeholder="Titel der Reservierung"
          />

          <TextField
            label="Beschreibung"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            placeholder="Optionale Beschreibung"
          />
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
            Reservieren
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
