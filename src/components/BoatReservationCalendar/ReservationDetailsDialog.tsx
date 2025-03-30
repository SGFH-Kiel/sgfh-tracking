import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  TextField,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useApp } from '../../contexts/AppContext';
import { BoatReservation, Boat } from '../../types/models';
import { useOverlappingReservations } from '../../hooks/useOverlappingReservations';
import { useSnackbar } from 'notistack';

dayjs.locale('de');

interface ReservationDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  reservation: BoatReservation;
  onUpdate: () => void;
}

interface EditableReservation {
  title: string;
  description: string;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
}

interface EditableReservation {
  title: string;
  description: string;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
}

export const ReservationDetailsDialog: React.FC<ReservationDetailsDialogProps> = ({
  open,
  onClose,
  reservation,
  onUpdate,
}) => {
  const { database, currentUser, isAdmin } = useApp();
  const [boat, setBoat] = useState<Boat | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<EditableReservation>(() => ({
    title: reservation.title,
    description: reservation.description || '',
    startTime: dayjs(reservation.startTime),
    endTime: dayjs(reservation.endTime),
  }));

  useEffect(() => {
    setEditedData({
      title: reservation.title,
      description: reservation.description || '',
      startTime: dayjs(reservation.startTime),
      endTime: dayjs(reservation.endTime),
    });
  }, [reservation]);


  const fetchBoat = useCallback(async (boatId: string) => {
    try {
      const boatDoc = await database.getDocument<Boat>('boats', boatId);
      if (boatDoc) {
        setBoat(boatDoc);
      }
    } catch (error) {
      console.error('Error fetching boat:', error);
    }
  }, [database]);

  useEffect(() => {
    fetchBoat(reservation.boatId);
  }, [reservation.boatId, fetchBoat]);

  const handleCancel = async () => {
    if (!currentUser) return;

    try {
      await database.deleteDocument('boatReservations', reservation.id);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error canceling reservation:', error);
    }
  };

  const isOwner = currentUser?.id === reservation.userId;
  const isBootswartOrAdmin = (boat && currentUser && boat.bootswart === currentUser.id) || isAdmin;

  const handleStatusChange = async (newStatus: 'approved' | 'rejected') => {
    if (!isBootswartOrAdmin) return;

    try {
      await database.updateDocument('boatReservations', reservation.id, {
        status: newStatus,
        updatedAt: new Date(),
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating reservation status:', error);
    }
  };

  const { hasOverlappingReservations } = useOverlappingReservations({
    startTime: editedData.startTime,
    endTime: editedData.endTime,
    excludeReservationId: reservation.id,
  });

  const { enqueueSnackbar } = useSnackbar();

  const handleSaveChanges = async () => {
    try {
      // Check for overlapping reservations before saving
      const [hasOverlapping] = await hasOverlappingReservations(boat?.id);
      if (hasOverlapping) {
        enqueueSnackbar('Es gibt bereits eine Reservierung in diesem Zeitraum.', { variant: 'error' });
        return;
      }

      // Check times
      if (editedData.startTime.isAfter(editedData.endTime)) {
        enqueueSnackbar('Die Endzeit muss später als die Startzeit sein.', { variant: 'error' });
        return;
      }

      await database.updateDocument('boatReservations', reservation.id, {
        title: editedData.title,
        description: editedData.description,
        startTime: editedData.startTime.toDate(),
        endTime: editedData.endTime.toDate(),
        updatedAt: new Date(),
      });
      onUpdate();
      setIsEditing(false);
      enqueueSnackbar('Reservierung wurde aktualisiert', { variant: 'success' });
    } catch (error) {
      console.error('Error updating reservation:', error);
      enqueueSnackbar('Fehler beim Aktualisieren der Reservierung', { variant: 'error' });
    }
  };

  const getStatusChip = () => {
    const statusConfig = {
      pending: { label: 'Nicht genehmigt', color: 'info' as const },
      approved: { label: 'Genehmigt', color: 'success' as const },
      rejected: { label: 'Abgelehnt', color: 'error' as const },
    } as const;
    const config = statusConfig[reservation.status as keyof typeof statusConfig];
    return (
      <Chip
        size="small"
        label={config.label}
        color={config.color}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 3, px: 3 }}>
        {isEditing ? (
          <TextField
            fullWidth
            value={editedData.title}
            onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
            variant="standard"
            sx={{
              mb: 1,
              '& .MuiInputBase-input': {
                color: 'primary.contrastText',
                fontSize: '1.5rem',
                fontWeight: 'bold',
              },
              '& .MuiInput-underline:before': {
                borderBottomColor: 'rgba(255, 255, 255, 0.7)',
              },
              '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                borderBottomColor: 'primary.contrastText',
              },
              '& .MuiInput-underline:after': {
                borderBottomColor: 'primary.contrastText',
              },
            }}
          />
        ) : (
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }} color="primary.contrastText">
            {reservation.title}
          </Typography>
        )}
        {boat && (
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 'normal' }} color="primary.contrastText">
            {boat.name}
          </Typography>
        )}
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ 
          bgcolor: 'grey.50', 
          p: 3, 
          borderRadius: 1,
        }}>
          {!isEditing ? (reservation.startTime.getDay() === reservation.endTime.getDay()) ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {dayjs(reservation.startTime).format('DD. MMMM YYYY')}
              </Typography>
              <Typography variant="subtitle1">
                {dayjs(reservation.startTime).format('HH:mm')} - {dayjs(reservation.endTime).format('HH:mm')} Uhr
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'row', mb: 2, }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {dayjs(reservation.startTime).format('DD. MMMM YYYY')}
                </Typography>
                <Typography variant="subtitle1">
                  {dayjs(reservation.startTime).format('HH:mm')} Uhr
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mx: 3 }}>
                bis
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {dayjs(reservation.endTime).format('DD. MMMM YYYY')}
                </Typography>
                <Typography variant="subtitle1">
                  {dayjs(reservation.endTime).format('HH:mm')} Uhr
                </Typography>
              </Box>
            </Box>
          ) : null}
          
          {isEditing && (
            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
              <DateTimePicker
                label="Start Zeit"
                value={editedData.startTime}
                onChange={(newValue) => newValue && setEditedData({ ...editedData, startTime: newValue })}
                sx={{ flex: 1 }}
                format="DD.MM.YYYY HH:mm"
              />
              <DateTimePicker
                label="End Zeit"
                value={editedData.endTime}
                onChange={(newValue) => newValue && setEditedData({ ...editedData, endTime: newValue })}
                sx={{ flex: 1 }}
                format="DD.MM.YYYY HH:mm"
              />
            </Box>
          )}

          {isEditing ? (
            <TextField
              fullWidth
              multiline
              rows={4}
              value={editedData.description}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              sx={{ mb: 3 }}
            />
          ) : (
            <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
              {reservation.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Status:
              </Typography>
              {getStatusChip()}
            </Box>
            <Typography variant="subtitle2">
              <strong>Reserviert von:</strong> {reservation.userName}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between' }}>
          <Box>
            {(isOwner || isBootswartOrAdmin) && (
              <Button
                color="error"
                variant="outlined"
                onClick={handleCancel}
                startIcon={<DeleteIcon />}
              >
                Stornieren
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isOwner && !isEditing && (!boat?.requiresApproval || isBootswartOrAdmin) && (
              <Button
                color="primary"
                variant="outlined"
                onClick={() => setIsEditing(true)}
                startIcon={<EditIcon />}
              >
                Bearbeiten
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outlined"
                  startIcon={<CloseIcon />}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  variant="contained"
                  startIcon={<SaveIcon />}
                >
                  Speichern
                </Button>
              </>
            )}
            {!isEditing && (
              <Button onClick={onClose} variant="outlined">
                Schließen
              </Button>
            )}
            {!isEditing && isBootswartOrAdmin && reservation.status === 'pending' && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  onClick={() => handleStatusChange('rejected')}
                  color="error"
                  variant="outlined"
                  startIcon={<CloseIcon />}
                >
                  Ablehnen
                </Button>
                <Button
                  onClick={() => handleStatusChange('approved')}
                  color="success"
                  variant="contained"
                  startIcon={<CheckIcon />}
                >
                  Genehmigen
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
