import React, { useCallback, useEffect, useState } from 'react';
import { debounce } from 'lodash';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Autocomplete,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { CalendarIcon, DateTimePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/de';

import { WorkAppointment, WorkParticipant } from '../../types/models';
import { useApp } from '../../contexts/AppContext';

dayjs.locale('de');

interface AppointmentDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: WorkAppointment;
  onDelete?: () => Promise<void>;
  onUpdate?: () => Promise<void>;
}

export const AppointmentDetailsDialog: React.FC<AppointmentDetailsDialogProps> = ({
  open,
  onClose,
  appointment,
  onDelete,
  onUpdate,
}) => {
  const { isAdmin, isAnyBootswart, database, boats, currentUser } = useApp();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<WorkAppointment>>(appointment);

  useEffect(() => {
    if (open) {
      setEditedData(appointment);
      setIsEditing(false); // Reset editing state when dialog opens
    }
  }, [open, appointment, appointment.id]); // Only reset when dialog opens or appointment ID changes

  const handleStartTimeChange = useCallback((newValue: Dayjs | null) => {
    if (newValue) {
      setEditedData(prev => ({
        ...prev,
        startTime: newValue.toDate()
      }));
    }
  }, []);

  const handleEndTimeChange = useCallback((newValue: Dayjs | null) => {
    if (newValue) {
      setEditedData(prev => ({
        ...prev,
        endTime: newValue.toDate()
      }));
    }
  }, []);

  const canEdit = isAdmin || (isAnyBootswart && boats.find(b => b.id === appointment.boatId)?.bootswart === currentUser?.id);
  const isMyPrivateAppointment = appointment.private && appointment.participants.some(p => p.userId === currentUser?.id);

  const isParticipant = appointment.participants.some(
    (p) => p.userId === currentUser?.id
  );

  const handleJoin = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const newParticipant: WorkParticipant = {
        userId: currentUser.id,
        userName: currentUser.displayName,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await database.arrayUnion<WorkAppointment>('workAppointments', appointment.id, 'participants', [newParticipant]);
      await onUpdate?.();
    } catch (error) {
      console.error('Error joining appointment:', error);
    }
    setLoading(false);
  };

  const handleLeave = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const participant = appointment.participants.find((p) => p.userId === currentUser.id);
      if (participant) {
        await database.arrayRemove<WorkAppointment>('workAppointments', appointment.id, 'participants', [participant]);
        await onUpdate?.();
      }
    } catch (error) {
      console.error('Error leaving appointment:', error);
    }
    setLoading(false);
  };

  const handleUpdateParticipantStatus = async (participantId: string, status: 'confirmed' | 'declined') => {
    setLoading(true);
    try {
      const updatedParticipants = appointment.participants.map((p) =>
        p.userId === participantId ? { ...p, status, updatedAt: new Date() } : p
      );

      await database.updateDocument<WorkAppointment>('workAppointments', appointment.id, {
        participants: updatedParticipants,
      });
      await onUpdate?.();
    } catch (error) {
      console.error('Error updating participant status:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await database.updateDocument('workAppointments', appointment.id, {
        ...editedData,
        updatedAt: new Date()
      });
      await onUpdate?.();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
    setLoading(false);
  };

  const handleParticipantChange = useCallback((aptm: WorkAppointment, participantId: string, field: 'startTime' | 'endTime') => debounce((newTime: Dayjs | null) => {
    const updateParticipant = async (aptm: WorkAppointment, participantId: string, field: 'startTime' | 'endTime', newTime: Dayjs | null) => {
      if (!newTime) return;
      const updatedParticipants = aptm?.participants?.map((p) =>
        p.userId === participantId ? { ...p, [field]: newTime.toDate() } : p
      );
      await database.updateDocument('workAppointments', aptm.id, { participants: updatedParticipants });
      await onUpdate?.();
    };
    updateParticipant(aptm, participantId, field, newTime);
  }, 500), [onUpdate, database]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        py: 3,
        px: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <Box>
          {isEditing ? (
            <TextField
              value={editedData.title}
              onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
              variant="standard"
              sx={{
                mb: 1,
                '& .MuiInputBase-input': {
                  color: 'primary.contrastText',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                },
                '& .MuiInput-underline:before': {
                  borderBottomColor: 'rgba(255, 255, 255, 0.42)'
                },
                '& .MuiInput-underline:hover:before': {
                  borderBottomColor: 'rgba(255, 255, 255, 0.87)'
                }
              }}
            />
          ) : (
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }} color="primary.contrastText">
              {appointment.title} {appointment.private ? '(privat)' : ''}
            </Typography>
          )}
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 'normal' }} color="primary.contrastText">
            {dayjs(appointment.startTime).format('dddd, DD. MMMM YYYY')} - {dayjs(appointment.endTime).format('dddd, DD. MMMM YYYY')}
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ 
          bgcolor: 'grey.50', 
          p: 3, 
          borderRadius: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
            {isEditing ? (
              <>
                <DateTimePicker
                  label="Start Zeit"
                  value={dayjs(editedData.startTime)}
                  onChange={handleStartTimeChange}
                  sx={{ flex: 1 }}
                  format="DD.MM.YYYY HH:mm"
                />
                <DateTimePicker
                  label="End Zeit"
                  value={dayjs(editedData.endTime)}
                  onChange={handleEndTimeChange}
                  sx={{ flex: 1 }}
                  format="DD.MM.YYYY HH:mm"
                />
              </>
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {dayjs(appointment.startTime).format('HH:mm')} - {dayjs(appointment.endTime).format('HH:mm')} Uhr
              </Typography>
            )}
          </Box>
          
          {isEditing ? (
            <TextField
              fullWidth
              multiline
              rows={4}
              value={editedData.description}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              sx={{ mb: 2 }}
            />
          ) : (
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
              {appointment.description}
            </Typography>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Benötigtes Material:
            </Typography>
            {isEditing ? (
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={editedData.supplies || []}
                onChange={(_, newValue) => setEditedData({ ...editedData, supplies: newValue })}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      label={option}
                      sx={{ 
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'background.paper' }
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Material hinzufügen"
                    helperText="Drücken Sie Enter, um ein neues Material hinzuzufügen"
                  />
                )}
              />
            ) : appointment.supplies?.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {appointment.supplies.map((supply) => (
                  <Chip 
                    key={supply} 
                    label={supply}
                    sx={{ 
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'background.paper' }
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Kein Material angegeben
              </Typography>
            )}
          </Box>
        </Box>
        {!isEditing && (
          <>
            <Box sx={{ p: 2, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Teilnehmer
              </Typography>
              {appointment.maxParticipants && (
                <Chip 
                  label={`${appointment.participants.length}/${appointment.maxParticipants}`}
                  color={appointment.participants.length >= appointment.maxParticipants ? 'error' : 'default'}
                  sx={{ fontWeight: 'bold' }}
                />
              )}
            </Box>

            <List sx={{
              p: 0,
              bgcolor: 'background.paper', 
              borderRadius: 1,
              '& .MuiListItem-root': {
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': {
                  borderBottom: 'none'
                }
              }
            }}>
              {appointment.participants.map((participant) => (
                <ListItem 
                  key={participant.userId}
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                          {participant.userName}
                        </Typography>
                        {/* show status */}
                        <Chip
                          size="small"
                          label={
                            participant.status === 'confirmed'
                              ? 'Bestätigt'
                              : participant.status === 'declined'
                              ? 'Abgelehnt'
                              : 'Ausstehend'
                          }
                          color={
                            participant.status === 'confirmed'
                              ? 'success'
                              : participant.status === 'declined'
                              ? 'error'
                              : 'default'
                          }
                          sx={{ fontWeight: 'bold' }}
                        />
                        {/* show time toggle button when participant status is not confirmed */}
                        {participant.status !== 'confirmed' && (isAdmin || canEdit || participant.userId === currentUser?.id) && (
                          <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => {
                                const ariaItem = document.querySelector(`[aria-controls="time-picker-${participant.userId}"]`);
                                if (!ariaItem) return;
                                const expanded = ariaItem.getAttribute('aria-expanded') === 'true';
                                ariaItem.setAttribute('aria-expanded', (!expanded).toString());
                              }}
                            >
                              <CalendarIcon />
                            </IconButton>
                          </Box>
                        )}
                        {/* show admin action buttons */}
                        {canEdit && participant.status === 'pending' && (
                          <Box sx={{ ml: 1 }}>
                            <IconButton
                              onClick={() => handleUpdateParticipantStatus(participant.userId, 'confirmed')}
                              disabled={loading === true}
                              color="success"
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <CheckIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => handleUpdateParticipantStatus(participant.userId, 'declined')}
                              disabled={loading === true}
                              color="error"
                              size="small"
                            >
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={                      
                        <Box 
                          id={`time-picker-${participant.userId}`}
                          sx={{
                            mb: 1,
                            mt: 1,
                            display: 'flex',
                            gap: 1,
                            maxHeight: 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.3s ease-in-out',
                            '&[aria-expanded="true"]': {
                              maxHeight: '150px'
                            }
                          }}
                          aria-expanded="false"
                          aria-controls={`time-picker-${participant.userId}`}
                        >
                        {/* custom duration selector for participant */}
                        <DateTimePicker
                          label="Startzeit"
                          value={participant.startTime ? dayjs(participant.startTime) : dayjs(appointment.startTime)}
                          onChange={handleParticipantChange(appointment, participant.userId, 'startTime')}
                          sx={{ flex: 1, mt: 1 }}
                          format="DD.MM.YYYY HH:mm"
                        />
                        <DateTimePicker
                          label="Endzeit"
                          value={participant.endTime ? dayjs(participant.endTime) : dayjs(appointment.endTime)}
                          onChange={handleParticipantChange(appointment, participant.userId, 'endTime')}
                          sx={{ flex: 1, mt: 1 }}
                          format="DD.MM.YYYY HH:mm"
                        />
                        </Box>
                    }
                  />
                </ListItem>
              ))}
              {appointment.participants.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="Noch keine Teilnehmer"
                    sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}
                  />
                </ListItem>
              )}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between' }}>
          <Box>
            {(canEdit || isMyPrivateAppointment) && onDelete && !isEditing && (
              <Button
                color="error"
                variant="outlined"
                onClick={onDelete}
                startIcon={<DeleteIcon />}
                disabled={loading === true}
              >
                Löschen
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {canEdit && !isEditing && (
              <Button
                color="primary"
                variant="outlined"
                onClick={() => setIsEditing(true)}
                startIcon={<EditIcon />}
              >
                Bearbeiten
              </Button>
            )}
            {isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outlined"
                  disabled={loading}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSave}
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={<SaveIcon />}
                >
                  Speichern
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={onClose} 
                  disabled={loading === true}
                  variant="outlined"
                >
                  Schließen
                </Button>
                {isMyPrivateAppointment ? null : !isParticipant ? (
                  <Button
                    variant="contained"
                    onClick={handleJoin}
                    disabled={loading === true || Boolean(appointment.maxParticipants && appointment.participants.length >= appointment.maxParticipants)}
                    color="primary"
                  >
                    Teilnehmen
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    onClick={handleLeave}
                    disabled={loading === true}
                    color="error"
                  >
                    Nicht teilnehmen
                  </Button>
                )}
              </>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
