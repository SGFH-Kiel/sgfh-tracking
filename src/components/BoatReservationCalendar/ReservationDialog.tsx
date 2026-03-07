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
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useApp } from '../../contexts/AppContext';
import { BoatReservation } from '../../types/models';
import { useOverlappingReservations } from '../../hooks/useOverlappingReservations';
import { syncPublicReservationFeed } from '../../domain/reservationSync';
import { useMemberReservationEligibility } from '../../hooks/memberHooks';

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
  status: 'draft' | 'pending' | 'approved';
  visibility: 'private' | 'public';
  freeSeatsText: string;
}

export const ReservationDialog: React.FC<ReservationDialogProps> = ({
  open,
  onClose,
  startTime,
  endTime,
  onUpdate,
}) => {
  const { database, currentUser, boats } = useApp();
  const { canReserve } = useMemberReservationEligibility();
  const { enqueueSnackbar } = useSnackbar();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    boatId: '',
    title: '',
    description: '',
    startTime: dayjs(startTime),
    endTime: dayjs(endTime),
    status: 'pending',
    visibility: 'private',
    freeSeatsText: '',
  });

  const { overlappingReservations, warningReservations, hasOverlappingReservations } = useOverlappingReservations({
    startTime: formData.startTime,
    endTime: formData.endTime,
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const [hasOverlapping, , warningConflicts] = await hasOverlappingReservations(formData.boatId);
    if (hasOverlapping) {
      enqueueSnackbar('Dieses Boot ist in dem gewählten Zeitraum bereits reserviert.', { variant: 'error' });
      setIsSubmitting(false);
      return;
    }
    if (!currentUser) {
      setIsSubmitting(false);
      return;
    }

    try {
      const selectedBoat = boats.find(boat => boat.id === formData.boatId);
      if (!selectedBoat) {
        setIsSubmitting(false);
        return;
      }

      const canCreateFinalReservation = canReserve;
      const requestedStatus = canCreateFinalReservation ? formData.status : 'draft';
      const finalStatus = requestedStatus === 'approved'
        ? 'approved'
        : requestedStatus === 'draft'
          ? 'draft'
          : (selectedBoat.requiresApproval && currentUser.id !== selectedBoat.bootswart)
            ? 'pending'
            : 'approved';

      const now = new Date();
      const reservation: Omit<BoatReservation, 'id'> = {
        boatId: formData.boatId,
        userId: currentUser.id,
        userName: currentUser.displayName,
        title: formData.title || `Reservierung von ${currentUser.displayName}`,
        description: formData.description,
        startTime: formData.startTime.toDate(),
        endTime: formData.endTime.toDate(),
        status: finalStatus,
        visibility: formData.visibility,
        publicDetails: formData.visibility === 'public'
          ? { freeSeatsText: formData.freeSeatsText }
          : undefined,
        eligibilitySnapshot: {
          feesPaid: currentUser.feesPaid,
          skipHours: currentUser.skipHours === true,
          workHoursMet: canCreateFinalReservation,
        },
        createdAt: now,
        updatedAt: now,
      };

      const reservationId = await database.addDocument('boatReservations', reservation);
      await syncPublicReservationFeed(database, {
        ...reservation,
        id: reservationId,
      }, boats);

      if (warningConflicts.length > 0) {
        enqueueSnackbar('Es gibt bereits unverbindliche Vormerkungen in diesem Zeitraum. Ihre Reservierung wurde trotzdem gespeichert.', { variant: 'warning' });
      } else {
        enqueueSnackbar(
          finalStatus === 'draft'
            ? 'Vormerkung gespeichert. Sie blockiert nicht verbindlich und erscheint als Hinweis für andere.'
            : finalStatus === 'pending'
              ? 'Reservierung gespeichert und wartet auf Genehmigung.'
              : 'Reservierung gespeichert und direkt freigegeben.',
          { variant: 'success' }
        );
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error creating reservation:', error);
      enqueueSnackbar('Fehler beim Erstellen der Reservierung', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
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
          {warningReservations.length > 0 && (
            <Alert severity="warning">
              Für den gewählten Zeitraum gibt es bereits unverbindliche Vormerkungen. Eine finale Reservierung ist möglich, sollte aber abgestimmt werden.
            </Alert>
          )}
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
                const hasDraftWarning = warningReservations.some(reservation => reservation.boatId === boat.id);
                const chipProps: ChipOwnProps = {
                  sx: { ml: 1 },
                  variant: 'outlined',
                  color: 'error'
                }
                return (
                <MenuItem key={boat.id} value={boat.id} disabled={isBlocked || isReserved}>
                  {boat.name} {isBlocked ? <Chip label="blockiert" {...chipProps} /> : ''} {isReserved ? <Chip label="reserviert" {...chipProps} /> : ''} {hasDraftWarning ? <Chip label="Vormerkung" sx={{ ml: 1 }} variant="outlined" color="warning" /> : ''}
                </MenuItem>
              )})}
            </Select>
          </FormControl>

          <FormControl fullWidth variant="outlined">
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={(e) => setFormData({ ...formData, status: e.target.value as FormData['status'] })}
            >
              <MenuItem value="pending">Finale Reservierung</MenuItem>
              <MenuItem value="draft">Unverbindliche Vormerkung</MenuItem>
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

          <FormControlLabel
            control={
              <Switch
                checked={formData.visibility === 'public'}
                onChange={(event) => setFormData({ ...formData, visibility: event.target.checked ? 'public' : 'private' })}
              />
            }
            label="Öffentlich anzeigen, dass noch Plätze frei sind"
          />

          {formData.visibility === 'public' && (
            <TextField
              label="Hinweis für Mitfahrende"
              value={formData.freeSeatsText}
              onChange={(e) => setFormData({ ...formData, freeSeatsText: e.target.value })}
              fullWidth
              variant="outlined"
              placeholder="z. B. 2 freie Plätze für Mitfahrende"
            />
          )}
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
            Reservieren
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
