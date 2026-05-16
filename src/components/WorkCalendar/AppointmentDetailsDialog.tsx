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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { writeActivityLog } from '../../domain/activityLog';
import { CalendarIcon, DateTimePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/de';

import { User, WorkAppointment, WorkParticipant } from '../../types/models';
import { CopyAppointmentSeriesDialog } from './CopyAppointmentSeriesDialog';
import { useApp } from '../../contexts/AppContext';

dayjs.locale('de');

interface AppointmentDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: WorkAppointment;
  onDelete?: () => Promise<void>;
  onUpdate?: () => Promise<void>;
  onCopy?: (copies: Omit<WorkAppointment, 'id'>[]) => Promise<void>;
}

export const AppointmentDetailsDialog: React.FC<AppointmentDetailsDialogProps> = ({
  open,
  onClose,
  appointment,
  onDelete,
  onUpdate,
  onCopy,
}) => {
  const { isAdmin, isSuperAdmin, database, boats, currentUser } = useApp();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [editedData, setEditedData] = useState<Partial<WorkAppointment>>(appointment);
  const [memberOptions, setMemberOptions] = useState<User[]>([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<User | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isBoatPickerOpen, setIsBoatPickerOpen] = useState(false);
  const [boatUpdating, setBoatUpdating] = useState(false);

  useEffect(() => {
    if (open) {
      setEditedData(appointment);
      setIsEditing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // intentionally excludes `appointment` — reset only on dialog open, not on every prop update

  useEffect(() => {
    if (!isEditing) {
      setEditedData(appointment);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment]); // intentionally excludes `isEditing` — read as snapshot, adding it would cause stale closure loops

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

  const appointmentBoat = appointment.boatId ? boats.find(b => b.id === appointment.boatId) : undefined;
  const isAppointmentBootswart = !!appointmentBoat && (appointmentBoat.bootswart === currentUser?.id || appointmentBoat.bootswart2 === currentUser?.id);
  const isCreator = !!currentUser && appointment.createdByUserId === currentUser.id;
  const canManageAppointment = isSuperAdmin || isAdmin || isAppointmentBootswart;
  const canManageParticipants = canManageAppointment;
  const isPast = appointment.endTime < new Date();
  const hasConfirmedParticipants = appointment.participants.some(p => p.status === 'confirmed');
  const isLockedPublicAppointment = !appointment.private && isPast && hasConfirmedParticipants;
  // Private appointments created by the current user are editable as long as no participant is confirmed yet
  const canEditOwnPrivate = !!appointment.private && isCreator && !hasConfirmedParticipants;
  const canEdit = isSuperAdmin || canEditOwnPrivate || (canManageAppointment && !isLockedPublicAppointment);
  // Boat assignment may be corrected by admins/superadmins even on locked public appointments.
  const canEditBoat = !appointment.private && (isSuperAdmin || isAdmin);
  const canAddParticipants = !appointment.private && canManageParticipants;
  const isMyPrivateAppointment = appointment.private && appointment.participants.some(p => p.userId === currentUser?.id);
  const isParticipantLimitReached = Boolean(appointment.maxParticipants && appointment.participants.length >= appointment.maxParticipants);
  const appointmentScopeLabel = appointment.private
    ? 'Privater Termin'
    : appointmentBoat
      ? `Boot: ${appointmentBoat.name}`
      : 'Öffentlicher Termin ohne Bootzuordnung';

  const isParticipant = appointment.participants.some(
    (p) => p.userId === currentUser?.id
  );

  const selectableUsers = memberOptions
    .filter((user) => !appointment.participants.some((participant) => participant.userId === user.id))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'de'));

  useEffect(() => {
    if (!open || !canAddParticipants) {
      setMemberOptions([]);
      setSelectedUserToAdd(null);
      setUsersLoading(false);
      return;
    }

    let isActive = true;

    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const users = await database.getDocuments<User>('users');
        if (!isActive) {
          return;
        }
        setMemberOptions(users.filter((user) => !user.deactivated));
      } catch (error) {
        console.error('Error loading users for appointment participants:', error);
        if (isActive) {
          setMemberOptions([]);
        }
      } finally {
        if (isActive) {
          setUsersLoading(false);
        }
      }
    };

    setSelectedUserToAdd(null);
    loadUsers();

    return () => {
      isActive = false;
    };
  }, [canAddParticipants, database, open]);

  const createParticipant = (user: Pick<User, 'id' | 'displayName'>): WorkParticipant => {
    const shouldAutoConfirm = isAppointmentBootswart && user.id === currentUser?.id;

    return {
      userId: user.id,
      userName: user.displayName,
      status: shouldAutoConfirm ? 'confirmed' : 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const getLatestAppointment = useCallback(async () => {
    return database.getDocument<WorkAppointment>('workAppointments', appointment.id);
  }, [database, appointment.id]);

  const handleJoin = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const latestAppointment = await getLatestAppointment();
      if (!latestAppointment || latestAppointment.participants.some((participant) => participant.userId === currentUser.id)) {
        return;
      }

      await database.updateDocument<WorkAppointment>('workAppointments', appointment.id, {
        participants: [...latestAppointment.participants, createParticipant(currentUser)],
      });
      await onUpdate?.();
    } catch (error) {
      console.error('Error joining appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const latestAppointment = await getLatestAppointment();
      if (!latestAppointment) {
        return;
      }

      const updatedParticipants = latestAppointment.participants.filter((participant) => participant.userId !== currentUser.id);
      if (updatedParticipants.length === latestAppointment.participants.length) {
        return;
      }

      await database.updateDocument<WorkAppointment>('workAppointments', appointment.id, {
        participants: updatedParticipants,
      });
      await onUpdate?.();
    } catch (error) {
      console.error('Error leaving appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedUserToAdd) return;
    setLoading(true);
    try {
      const latestAppointment = await getLatestAppointment();
      if (!latestAppointment || latestAppointment.participants.some((participant) => participant.userId === selectedUserToAdd.id)) {
        return;
      }

      await database.updateDocument<WorkAppointment>('workAppointments', appointment.id, {
        participants: [...latestAppointment.participants, createParticipant(selectedUserToAdd)],
      });
      setSelectedUserToAdd(null);
      await onUpdate?.();
    } catch (error) {
      console.error('Error adding participant to appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateParticipantStatus = async (participantId: string, status: 'confirmed' | 'declined' | 'pending') => {
    setLoading(true);
    try {
      const latestAppointment = await getLatestAppointment();
      if (!latestAppointment) {
        return;
      }

      const targetParticipant = latestAppointment.participants.find((p) => p.userId === participantId);
      const previousStatus = targetParticipant?.status;

      const updatedParticipants = latestAppointment.participants.map((p) => {
        if (p.userId !== participantId) return p;
        const next: WorkParticipant = { ...p, status, updatedAt: new Date() };
        if (status === 'confirmed' && currentUser) {
          next.confirmedByUserId = currentUser.id;
          next.confirmedByUserName = currentUser.displayName;
          next.confirmedAt = new Date();
        } else {
          // Strip confirmation metadata when reverting to pending or moving to declined
          delete next.confirmedByUserId;
          delete next.confirmedByUserName;
          delete next.confirmedAt;
        }
        return next;
      });

      await database.updateDocument<WorkAppointment>('workAppointments', appointment.id, {
        participants: updatedParticipants,
      });
      if (currentUser) {
        await writeActivityLog(database, {
          type: 'workHour.updated',
          entityId: appointment.id,
          entityType: 'workHour',
          actorId: currentUser.id,
          actorName: currentUser.displayName,
          details: {
            action: 'participant_status_changed',
            title: appointment.title,
            targetUserId: participantId,
            targetUserName: targetParticipant?.userName,
            previousStatus,
            newStatus: status,
          },
        });
      }
      await onUpdate?.();
    } catch (error) {
      console.error('Error updating participant status:', error);
      enqueueSnackbar('Fehler beim Aktualisieren des Status', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBoatChange = async (nextBoatId: string) => {
    if (boatUpdating) return;
    const normalized = nextBoatId || '';
    if (normalized === (appointment.boatId || '')) {
      setIsBoatPickerOpen(false);
      return;
    }
    setBoatUpdating(true);
    try {
      await database.updateDocument<WorkAppointment>('workAppointments', appointment.id, {
        boatId: normalized,
        updatedAt: new Date(),
      });
      if (currentUser) {
        await writeActivityLog(database, {
          type: 'workHour.updated',
          entityId: appointment.id,
          entityType: 'workHour',
          actorId: currentUser.id,
          actorName: currentUser.displayName,
          details: {
            action: 'boat_changed',
            title: appointment.title,
            previousBoatId: appointment.boatId || '',
            newBoatId: normalized,
          },
        });
      }
      enqueueSnackbar('Bootzuordnung aktualisiert.', { variant: 'success' });
      await onUpdate?.();
      setIsBoatPickerOpen(false);
    } catch (error) {
      console.error('Error changing appointment boat:', error);
      enqueueSnackbar('Fehler beim Aktualisieren der Bootzuordnung', { variant: 'error' });
    } finally {
      setBoatUpdating(false);
    }
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

  const handleParticipantChange = useCallback((participantId: string, field: 'startTime' | 'endTime') => debounce((newTime: Dayjs | null) => {
    const updateParticipant = async (participantId: string, field: 'startTime' | 'endTime', newTime: Dayjs | null) => {
      if (!newTime) return;
      const latestAppointment = await getLatestAppointment();
      if (!latestAppointment) {
        return;
      }

      const updatedParticipants = latestAppointment.participants.map((p) =>
        p.userId === participantId ? { ...p, [field]: newTime.toDate() } : p
      );
      await database.updateDocument('workAppointments', latestAppointment.id, { participants: updatedParticipants });
      await onUpdate?.();
    };
    updateParticipant(participantId, field, newTime);
  }, 500), [database, getLatestAppointment, onUpdate]);

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
            <>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }} color="primary.contrastText">
                {appointment.title}
              </Typography>
              {appointment.createdByUserName && (
                <Typography variant="caption" sx={{ opacity: 0.75, fontWeight: 'normal', display: 'block', mt: 0.5 }} color="primary.contrastText">
                  Erstellt von {appointment.createdByUserName}
                </Typography>
              )}
            </>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1, flexWrap: 'wrap' }}>
            {isBoatPickerOpen && canEditBoat ? (
              <FormControl
                size="small"
                variant="standard"
                sx={{
                  minWidth: 200,
                  bgcolor: 'rgba(255, 255, 255, 0.16)',
                  borderRadius: 1,
                  px: 1,
                  '& .MuiInputBase-root': { color: 'primary.contrastText' },
                  '& .MuiSvgIcon-root': { color: 'primary.contrastText' },
                  '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.42)' },
                }}
              >
                <Select
                  value={appointment.boatId || ''}
                  onChange={(e) => handleBoatChange(e.target.value as string)}
                  disabled={boatUpdating}
                  disableUnderline
                  autoWidth
                >
                  <MenuItem value="">Kein Boot</MenuItem>
                  {boats.map((boat) => (
                    <MenuItem key={boat.id} value={boat.id}>{boat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Chip
                size="small"
                label={appointmentScopeLabel}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.16)',
                  color: 'primary.contrastText',
                  fontWeight: 'bold'
                }}
              />
            )}
            {canEditBoat && (
              <Tooltip title={isBoatPickerOpen ? 'Schließen' : 'Boot ändern'}>
                <IconButton
                  size="small"
                  onClick={() => setIsBoatPickerOpen((v) => !v)}
                  disabled={boatUpdating}
                  sx={{ color: 'primary.contrastText' }}
                >
                  {isBoatPickerOpen ? <CloseIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
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
            <>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={editedData.description}
                onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                sx={{ mb: 2 }}
              />
              {!appointment.private && (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel id="appointment-boat-edit-label">Boot</InputLabel>
                  <Select
                    labelId="appointment-boat-edit-label"
                    label="Boot"
                    value={editedData.boatId ?? ''}
                    onChange={(e: SelectChangeEvent) => setEditedData({ ...editedData, boatId: e.target.value })}
                  >
                    <MenuItem value="">Kein Boot</MenuItem>
                    {boats.map((boat) => (
                      <MenuItem key={boat.id} value={boat.id}>{boat.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </>
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
            {canAddParticipants && (
              <Box sx={{ px: 2, pt: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Autocomplete
                  sx={{ flex: 1, minWidth: 240 }}
                  size="small"
                  options={selectableUsers}
                  value={selectedUserToAdd}
                  onChange={(_, value) => setSelectedUserToAdd(value)}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  getOptionLabel={(option) => option.displayName}
                  loading={usersLoading}
                  noOptionsText="Keine weiteren Mitglieder"
                  loadingText="Mitglieder werden geladen"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Teilnehmer hinzufügen"
                    />
                  )}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddParticipant}
                  disabled={loading === true || usersLoading || !selectedUserToAdd}
                >
                  Hinzufügen
                </Button>
              </Box>
            )}

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
                    secondaryTypographyProps={{ component: 'div' }}
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
                        {participant.status !== 'confirmed' && (canManageParticipants || participant.userId === currentUser?.id) && (
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
                        {canManageParticipants && participant.status === 'pending' && (
                          <Box sx={{ ml: 1 }}>
                            <Tooltip title="Bestätigen">
                              <IconButton
                                onClick={() => handleUpdateParticipantStatus(participant.userId, 'confirmed')}
                                disabled={loading === true}
                                color="success"
                                size="small"
                                sx={{ mr: 1 }}
                              >
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ablehnen">
                              <IconButton
                                onClick={() => handleUpdateParticipantStatus(participant.userId, 'declined')}
                                disabled={loading === true}
                                color="error"
                                size="small"
                              >
                                <CloseIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                        {canManageParticipants && participant.status === 'confirmed' && participant.userId !== currentUser?.id && (
                          <Box sx={{ ml: 1 }}>
                            <Tooltip title="Freigabe zurücknehmen">
                              <IconButton
                                onClick={() => handleUpdateParticipantStatus(participant.userId, 'pending')}
                                disabled={loading === true}
                                color="warning"
                                size="small"
                              >
                                <ReplayIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        {participant.status === 'confirmed' && participant.confirmedByUserName && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Bestätigt von {participant.confirmedByUserName}
                            {participant.confirmedAt ? ` am ${dayjs(participant.confirmedAt).format('DD.MM.YYYY')}` : ''}
                          </Typography>
                        )}
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
                          onChange={handleParticipantChange(participant.userId, 'startTime')}
                          sx={{ flex: 1, mt: 1 }}
                          format="DD.MM.YYYY HH:mm"
                        />
                        <DateTimePicker
                          label="Endzeit"
                          value={participant.endTime ? dayjs(participant.endTime) : dayjs(appointment.endTime)}
                          onChange={handleParticipantChange(participant.userId, 'endTime')}
                          sx={{ flex: 1, mt: 1 }}
                          format="DD.MM.YYYY HH:mm"
                        />
                        </Box>
                      </>
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
          <Box sx={{ display: 'flex', gap: 1 }}>
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
            {canEdit && onCopy && !isEditing && (
              <Button
                color="secondary"
                variant="outlined"
                onClick={() => setIsCopyDialogOpen(true)}
                startIcon={<CopyIcon />}
                disabled={loading === true}
              >
                Serie
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
                    disabled={loading === true || Boolean(isParticipantLimitReached && !canManageParticipants)}
                    color="primary"
                  >
                    Teilnehmen
                  </Button>
                ) : appointment.participants.find(p => p.userId === currentUser?.id)?.status !== 'confirmed' ? (
                  <Button
                    variant="outlined"
                    onClick={handleLeave}
                    disabled={loading === true}
                    color="error"
                  >
                    Nicht teilnehmen
                  </Button>
                ) : null}
              </>
            )}
          </Box>
        </Box>
      </DialogActions>
      {isCopyDialogOpen && onCopy && (
        <CopyAppointmentSeriesDialog
          open={isCopyDialogOpen}
          onClose={() => setIsCopyDialogOpen(false)}
          appointment={appointment}
          onSave={async (copies) => {
            await onCopy(copies);
            setIsCopyDialogOpen(false);
          }}
        />
      )}
    </Dialog>
  );
};
