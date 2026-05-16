import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Collapse,
  IconButton,
  Button,
  SxProps,
  TextField,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Replay as ReplayIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { writeActivityLog } from '../../domain/activityLog';
import { useApp } from '../../contexts/AppContext';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useCalculateWorkHours, UserWorkHours } from '../../hooks/memberHooks';
import humanizeDuration from 'humanize-duration';
import { WorkAppointment, WorkParticipant } from '../../types/models';
import { PrivateWorkHoursDialog } from './PrivateWorkHoursDialog';
import { AppointmentDetailsDialog } from '../WorkCalendar/AppointmentDetailsDialog';
import { ImportWorkHoursDialog } from './ImportWorkHoursDialog';
import { utils, writeFile } from 'xlsx';

const humanizer = humanizeDuration.humanizer({ language: 'de', round: true, units: ['h', 'm'], delimiter: ' und ' });
const shortHumanizer = humanizeDuration.humanizer({ language: 'short', round: true, delimiter: ' ', units: ['h', 'm'], maxDecimalPoints: 1, languages: { short: { h: () => 'h', m: () => 'm' } } });

enum WORKSTATUS {
  OPEN = 'OPEN',
  PLANNED = 'PLANNED',
  DONE = 'DONE',
  REJECTED = 'REJECTED',
  PAUSED = 'PAUSED'
}

enum WORKSTATUS_OVERALL_TEXT {
  OPEN = 'Offen',
  PLANNED = 'Geplant',
  DONE = 'Erfüllt',
  REJECTED = 'Prüfen!',
  PAUSED = 'Ausgesetzt'
}

enum WORKSTATUS_TEXT {
  OPEN = 'Unbestätigt',
  PLANNED = 'Geplant',
  DONE = 'Bestätigt',
  REJECTED = 'Abgelehnt',
  PAUSED = 'Ausgesetzt'
}

const StatusChip = ({ status, overall, sx }: { status: WORKSTATUS; overall: boolean; sx?: SxProps }) => {
  return <Chip
    sx={sx}
    size="small"
    label={
      overall
        ? WORKSTATUS_OVERALL_TEXT[status]
        : WORKSTATUS_TEXT[status]
    }
    color={
      (status === WORKSTATUS.DONE || status === WORKSTATUS.PAUSED)
      ? 'success'
      : status === WORKSTATUS.PLANNED
      ? 'info'
      : status === WORKSTATUS.OPEN
      ? 'warning'
      : 'error'
    }
  />;
};

type MembersSortKey = 'name' | 'progress' | 'remaining' | 'status';
type SortDirection = 'asc' | 'desc';

const BOAT_FILTER_ALL = '';
const BOAT_FILTER_NONE = '__none__';

const STATUS_RANK: Record<UserWorkHours['status'], number> = {
  done: 0,
  planned: 1,
  open: 2,
  attention: 3,
  paused: 4,
};

export const WorkHoursTracker: React.FC = () => {
  const { isAdmin, isAnyBootswart, currentUser, systemConfig, database, boats } = useApp();
  const { enqueueSnackbar } = useSnackbar();
  const [privateHoursDialogOpen, setPrivateHoursDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<WorkAppointment | undefined>(undefined);
  const [detailAppointment, setDetailAppointment] = useState<WorkAppointment | undefined>(undefined);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const { userWorkHours, loading, refreshing, error, reload: refreshAppointments } = useCalculateWorkHours();
  const { setBreadcrumbs } = usePageTitle();
  // Optimistic local overrides per `${appointmentId}:${userId}` to keep scroll position
  // and avoid status flicker between status change and the asynchronous refresh.
  const [participantOverrides, setParticipantOverrides] = useState<Map<string, Partial<WorkParticipant>>>(new Map());
  // Toolbar state for the member overview table
  const [memberSearch, setMemberSearch] = useState('');
  const [onlyPendingReview, setOnlyPendingReview] = useState(false);
  const [boatFilter, setBoatFilter] = useState<string>(BOAT_FILTER_ALL);
  const [sortKey, setSortKey] = useState<MembersSortKey>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const overrideKey = (appointmentId: string, userId: string) => `${appointmentId}:${userId}`;
  const mergeParticipant = useCallback((appointmentId: string, participant: WorkParticipant): WorkParticipant => {
    const override = participantOverrides.get(overrideKey(appointmentId, participant.userId));
    return override ? { ...participant, ...override } : participant;
  }, [participantOverrides]);

  const myBoatIds = useMemo(
    () => new Set(boats.filter(b => b.bootswart === currentUser?.id || b.bootswart2 === currentUser?.id).map(b => b.id)),
    [boats, currentUser?.id]
  );

  const handleExport = useCallback(() => {
    const wb = utils.book_new();

    // Create a sheet for each user
    userWorkHours.forEach((userHours: UserWorkHours) => {
      // Create metadata section
      const metadata = [
        ['Benutzerinformationen'],
        ['Name', userHours.user.displayName],
        ['E-Mail', userHours.user.email || 'N/A'],
        ['Abgeschlossene Stunden', humanizer(userHours.completedDuration)],
        ['Geplante Stunden', humanizer(userHours.upcomingDuration)],
        ['Abgelehnte Stunden', humanizer(userHours.declinedDuration)],
        [],
        ['Arbeitsstunden'],
        ['Titel', 'Startzeit', 'Endzeit', 'Dauer', 'Status', 'Beschreibung', 'Boot']
      ];

      // Add completed appointments
      userHours.appointments.completed.forEach(apt => {
        const participant = apt.participants.find(p => p.userId === userHours.user.id)!;
        metadata.push([
          apt.title,
          new Date(participant.startTime || apt.startTime).toLocaleString(),
          new Date(participant.endTime || apt.endTime).toLocaleString(),
          humanizer(new Date(participant.endTime || apt.endTime).getTime() - new Date(participant.startTime || apt.startTime).getTime()),
          'Abgeschlossen',
          apt.description || '',
          boats.find(b => b.id === apt.boatId)?.name || ''
        ]);
      });

      // Add upcoming appointments
      userHours.appointments.upcoming.forEach(apt => {
        const participant = apt.participants.find(p => p.userId === userHours.user.id)!;
        metadata.push([
          apt.title,
          new Date(participant.startTime || apt.startTime).toLocaleString(),
          new Date(participant.endTime || apt.endTime).toLocaleString(),
          humanizer(new Date(participant.endTime || apt.endTime).getTime() - new Date(participant.startTime || apt.startTime).getTime()),
          'Geplant',
          apt.description || '',
          boats.find(b => b.id === apt.boatId)?.name || ''
        ]);
      });

      // Add declined appointments
      userHours.appointments.declined.forEach(apt => {
        const participant = apt.participants.find(p => p.userId === userHours.user.id)!;
        metadata.push([
          apt.title,
          new Date(participant.startTime || apt.startTime).toLocaleString(),
          new Date(participant.endTime || apt.endTime).toLocaleString(),
          humanizer(new Date(participant.endTime || apt.endTime).getTime() - new Date(participant.startTime || apt.startTime).getTime()),
          'Abgelehnt',
          apt.description || '',
          boats.find(b => b.id === apt.boatId)?.name || ''
        ]);
      });

      // Create worksheet
      const ws = utils.aoa_to_sheet(metadata);

      // Auto-size columns
      const range = utils.decode_range(ws['!ref'] || 'A1');
      const cols: any[] = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cell = ws[utils.encode_cell({ r: R, c: C })];
          if (cell && cell.v) {
            maxWidth = Math.max(maxWidth, String(cell.v).length);
          }
        }
        cols[C] = { wch: maxWidth };
      }
      ws['!cols'] = cols;

      // Add the worksheet to the workbook
      utils.book_append_sheet(wb, ws, userHours.user.displayName);
    });

    // Save file
    writeFile(wb, `work_hours_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [userWorkHours, boats]);

  const handlePrivateHoursDialog = useCallback(() => {
    setEditingAppointment(undefined);
    setPrivateHoursDialogOpen(true);
  }, [setPrivateHoursDialogOpen]);

  const changeParticipantStatus = useCallback((appointment: WorkAppointment, userId: string, status: 'confirmed' | 'declined' | 'pending') => async () => {
    if (!currentUser) return;
    const key = overrideKey(appointment.id, userId);
    const targetParticipant = appointment.participants.find(p => p.userId === userId);
    const previousStatus = targetParticipant?.status;

    // Apply optimistic override so the UI updates immediately and scroll position is preserved.
    setParticipantOverrides(prev => {
      const nextMap = new Map(prev);
      const override: Partial<WorkParticipant> = { status };
      if (status === 'confirmed') {
        override.confirmedByUserId = currentUser.id;
        override.confirmedByUserName = currentUser.displayName;
        override.confirmedAt = new Date();
      } else {
        override.confirmedByUserId = undefined;
        override.confirmedByUserName = undefined;
        override.confirmedAt = undefined;
      }
      nextMap.set(key, override);
      return nextMap;
    });

    try {
      const latestAppointment = await database.getDocument<WorkAppointment>('workAppointments', appointment.id);
      if (!latestAppointment) {
        return;
      }

      const updatedParticipants = latestAppointment.participants.map(p => {
        if (p.userId !== userId) return p;
        const next: WorkParticipant = { ...p, status, updatedAt: new Date() };
        if (status === 'confirmed') {
          next.confirmedByUserId = currentUser.id;
          next.confirmedByUserName = currentUser.displayName;
          next.confirmedAt = new Date();
        } else {
          delete next.confirmedByUserId;
          delete next.confirmedByUserName;
          delete next.confirmedAt;
        }
        return next;
      });
      await database.updateDocument<WorkAppointment>('workAppointments', appointment.id, {
        participants: updatedParticipants,
      });
      await writeActivityLog(database, {
        type: 'workHour.updated',
        entityId: appointment.id,
        entityType: 'workHour',
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        details: {
          action: 'participant_status_changed',
          title: appointment.title,
          targetUserId: userId,
          targetUserName: targetParticipant?.userName,
          previousStatus,
          newStatus: status,
        },
      });
      await refreshAppointments();
    } catch (err) {
      console.error('Error updating participant status:', err);
      enqueueSnackbar('Fehler beim Aktualisieren des Status', { variant: 'error' });
    } finally {
      // Drop the override either after refresh succeeded (state now reflects server) or after rollback.
      setParticipantOverrides(prev => {
        const nextMap = new Map(prev);
        nextMap.delete(key);
        return nextMap;
      });
    }
  }, [database, refreshAppointments, currentUser, enqueueSnackbar]);
  

  useEffect(() => {
    setBreadcrumbs([
      { text: 'Arbeitsstunden' },
    ]);
  }, [setBreadcrumbs]);

  const currentUserHours = useMemo(() => userWorkHours.find(({ user }) => user.id === currentUser?.id) || {
    user: currentUser!,
    completedDuration: 0,
    upcomingDuration: 0,
    declinedDuration: 0,
    completedMinutes: 0,
    upcomingMinutes: 0,
    declinedMinutes: 0,
    requiredMinutes: Math.round(systemConfig.workHourThreshold * 60),
    remainingMinutes: Math.round(systemConfig.workHourThreshold * 60),
    status: 'open' as const,
    accountingEntries: [],
    appointments: { completed: [], upcoming: [], declined: [] }
  }, [userWorkHours, currentUser, systemConfig.workHourThreshold]);
  const appointmentsById = useMemo(() => {
    const nextAppointments = new Map<string, WorkAppointment>();
    userWorkHours.forEach(({ appointments }) => {
      [...appointments.completed, ...appointments.upcoming, ...appointments.declined].forEach((appointment) => {
        nextAppointments.set(appointment.id, appointment);
      });
    });
    return nextAppointments;
  }, [userWorkHours]);

  const boatFilterOptions = useMemo(() => {
    if (isAdmin) return boats;
    return boats.filter((b) => myBoatIds.has(b.id));
  }, [isAdmin, boats, myBoatIds]);

  const visibleUserWorkHours = useMemo(() => {
    const baseFiltered = userWorkHours.filter(({ appointments: { completed, upcoming, declined } }) => {
      if (isAdmin) return true;
      const allApts = [...completed, ...upcoming, ...declined];
      return allApts.some(apt => apt.boatId && myBoatIds.has(apt.boatId));
    });

    const searchLower = memberSearch.trim().toLowerCase();
    const withDerived = baseFiltered
      .map((uh) => {
        const relevantUpcoming = uh.appointments.upcoming
          .filter(apt => isAdmin || (apt.boatId && myBoatIds.has(apt.boatId)));
        const hasPending = relevantUpcoming
          .some(apt => apt.participants.some(p => mergeParticipant(apt.id, p).status === 'pending' && p.userId === uh.user.id));
        return { uh, hasPending };
      })
      .filter(({ uh, hasPending }) => {
        if (searchLower && !uh.user.displayName.toLowerCase().includes(searchLower)) return false;
        if (onlyPendingReview && !hasPending) return false;
        if (boatFilter !== BOAT_FILTER_ALL) {
          const allApts = [...uh.appointments.completed, ...uh.appointments.upcoming, ...uh.appointments.declined];
          if (boatFilter === BOAT_FILTER_NONE) {
            if (!allApts.some(apt => !apt.boatId)) return false;
          } else if (!allApts.some(apt => apt.boatId === boatFilter)) {
            return false;
          }
        }
        return true;
      });

    const sortMul = sortDir === 'asc' ? 1 : -1;
    return [...withDerived].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.uh.user.displayName.localeCompare(b.uh.user.displayName, 'de') * sortMul;
        case 'progress': {
          const ratioA = a.uh.completedDuration / Math.max(1, systemConfig.workHourThreshold * 3600000);
          const ratioB = b.uh.completedDuration / Math.max(1, systemConfig.workHourThreshold * 3600000);
          return (ratioA - ratioB) * sortMul;
        }
        case 'remaining': {
          const reqMs = systemConfig.workHourThreshold * 3600000;
          const remA = Math.max(0, reqMs - a.uh.completedDuration - a.uh.upcomingDuration);
          const remB = Math.max(0, reqMs - b.uh.completedDuration - b.uh.upcomingDuration);
          return (remA - remB) * sortMul;
        }
        case 'status': {
          const effA = a.hasPending ? STATUS_RANK.attention : STATUS_RANK[a.uh.status];
          const effB = b.hasPending ? STATUS_RANK.attention : STATUS_RANK[b.uh.status];
          return (effA - effB) * sortMul;
        }
        default:
          return 0;
      }
    });
  }, [userWorkHours, isAdmin, myBoatIds, memberSearch, onlyPendingReview, boatFilter, sortKey, sortDir, systemConfig.workHourThreshold, mergeParticipant]);

  const handleSort = (key: MembersSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  useEffect(() => {
    if (!detailAppointment) {
      return;
    }

    const latestDetailAppointment = appointmentsById.get(detailAppointment.id);
    if (latestDetailAppointment && latestDetailAppointment !== detailAppointment) {
      setDetailAppointment(latestDetailAppointment);
    }
  }, [appointmentsById, detailAppointment]);

  // hours to duration
  const required = systemConfig.workHourThreshold * 3600000;
  const userAppointments = useMemo(() => {
    return [
      ...(currentUserHours?.appointments?.completed || []).map(apt => ({ ...apt, status: 'completed' })),
      ...(currentUserHours?.appointments?.upcoming || []).map(apt => ({ ...apt, status: 'pending' })),
      ...(currentUserHours?.appointments?.declined || []).map(apt => ({ ...apt, status: 'declined' }))
    ];
  }, [currentUserHours]);
  const hoursToDo = humanizer(Math.max(0, required - currentUserHours?.completedDuration - currentUserHours?.upcomingDuration));

  if (loading || !currentUser) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            Meine Stunden
          </Typography>
          <StatusChip
            status={
              currentUserHours.status === 'paused'
                ? WORKSTATUS.PAUSED
                : currentUserHours.status === 'done'
                  ? WORKSTATUS.DONE
                  : currentUserHours.status === 'planned'
                    ? WORKSTATUS.PLANNED
                    : currentUserHours.status === 'attention'
                      ? WORKSTATUS.REJECTED
                      : WORKSTATUS.OPEN
          } overall={true} sx={{ mt: 1, mb: 2 }} />
        </Box>
        {currentUserHours.appointments.upcoming.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Sie haben {currentUserHours.appointments.upcoming.length} ausstehende oder zukünftige Einträge. Diese werden erst nach Bestätigung bzw. nach Durchführung vollständig angerechnet.
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mt: 2 }}>
          <Box key={currentUser?.id} sx={{ minWidth: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Tooltip
                title={
                  <Box sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', minWidth: 125 }}>
                      {currentUserHours?.status === 'attention'
                        ? <>
                          <Typography variant="body2">
                            Mindestens ein Eintrag wurde abgelehnt und sollte geprüft werden
                          </Typography>
                        </>
                        : currentUserHours?.completedDuration >= required
                        ? <>
                          <Typography variant="body2">
                            Alle erforderlichen Stunden sind erfüllt
                          </Typography>
                        </>
                        : currentUserHours?.completedDuration + currentUserHours?.upcomingDuration >= required
                        ? <>
                          <Typography variant="body2">
                            Alle erforderlichen Stunden sind eingeplant
                          </Typography>
                        </>
                        : <>
                          <Typography variant="body2">
                            Es sind noch {hoursToDo} ausstehend
                          </Typography>
                        </>
                      }
                    </Box>
                  </Box>
                }
                arrow
              >
                <Box sx={{ flexGrow: 1, cursor: 'pointer', position: 'relative' }}>
                  {/* Base grey progress bar */}
                  <LinearProgress
                    variant="determinate"
                    value={100}
                    sx={{
                      backgroundColor: 'grey.300',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'grey.300'
                      }
                    }}
                  />
                  {/* Upcoming hours bar */}
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (currentUserHours.completedDuration + currentUserHours.upcomingDuration) / required * 100)}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      width: '100%',
                      backgroundColor: 'transparent',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'primary.main'
                      }
                    }}
                  />
                  {/* Completed hours bar */}
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, currentUserHours.completedDuration / required * 100)}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      width: '100%',
                      backgroundColor: 'transparent',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'success.main'
                      }
                    }}
                  />
                </Box>
              </Tooltip>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 1 }}>
                <Typography variant="body2" color="success.main">
                  {shortHumanizer(currentUserHours.completedDuration)}
                </Typography>
                <Typography variant="body2" color="primary.main">
                  +{shortHumanizer(currentUserHours.upcomingDuration)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  / {shortHumanizer(required)}
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Button
                  sx={{
                    justifySelf: 'flex-end',
                    display: 'flex',
                    minWidth: { xs: 'auto', md: undefined },
                    '& .MuiButton-startIcon': {
                      mr: { xs: 0, sm: 1 }
                    }
                  }}
                  onClick={handlePrivateHoursDialog}
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    Arbeitsstunde hinzufügen
                  </Box>
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Datum</TableCell>
                <TableCell>Uhrzeit</TableCell>
                <TableCell>Titel</TableCell>
                <TableCell>Dauer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {userAppointments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Alert severity="info">
                      Es sind noch keine Arbeitsstunden vorhanden. Neue Einträge werden hier sofort angezeigt und als ausstehend markiert, bis sie bestätigt wurden.
                    </Alert>
                  </TableCell>
                </TableRow>
              )}
              {userAppointments.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
                .map((appointment) => {
                  const up: WorkParticipant = appointment.participants.find((p) => p.userId === currentUser.id)!;
                  const start = up.startTime ? up.startTime : appointment.startTime;
                  const end = up.endTime ? up.endTime : appointment.endTime;
                  const startDate = start.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
                  const endDate = end.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
                  
                  const duration = (end.getTime() - start.getTime());
                  const isInPast = (end.getTime() < new Date().getTime());

                  const isPrivateOwn = !!appointment.private && appointment.createdByUserId === currentUser.id;
                  const isLockedPrivate = isPrivateOwn && up.status === 'confirmed';
                  const canEditRow = isPrivateOwn && !isLockedPrivate;

                  return (
                    <TableRow
                      key={`${appointment.id}-${currentUser.id}-${up.status}`}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setDetailAppointment(appointment)}
                    >
                      <TableCell>
                        {startDate}
                        {startDate !== endDate && " - "}
                        {startDate !== endDate && endDate}
                      </TableCell>
                      <TableCell>
                        {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        {" - "}
                        {end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>{appointment.title}</TableCell>
                      <TableCell>{shortHumanizer(duration)}</TableCell>
                      <TableCell>
                        <StatusChip overall={false} status={
                          up.status === 'confirmed' && isInPast
                            ? WORKSTATUS.DONE
                            : up.status === 'pending'
                              ? WORKSTATUS.OPEN
                              : up.status === 'declined'
                                ? WORKSTATUS.REJECTED
                                : WORKSTATUS.PLANNED
                        } />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }} onClick={(e) => e.stopPropagation()}>
                        {canEditRow && (
                          <Tooltip title="Bearbeiten">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingAppointment(appointment);
                                setPrivateHoursDialogOpen(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      </Paper>
      
      {(isAdmin || isAnyBootswart) && (
        <Paper sx={{ p: 3 }}>
          {refreshing && (
            <LinearProgress sx={{ mb: 1 }} />
          )}
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, justifyContent: 'flex-end', mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
              Mitgliederstunden
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outlined"
                color="primary"
                startIcon={<UploadIcon />}
                sx={{
                  minWidth: { xs: 'auto', md: undefined },
                  '& .MuiButton-startIcon': {
                    mr: { xs: 0, sm: 1 }
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Import
                </Box>
              </Button>

              <Button
                onClick={handleExport}
                variant="outlined"
                color="primary"
                startIcon={<DownloadIcon />}
                sx={{
                  minWidth: { xs: 'auto', md: undefined },
                  '& .MuiButton-startIcon': {
                    mr: { xs: 0, sm: 1 }
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Export
                </Box>
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Nach Name suchen"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              sx={{ minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="work-hours-boat-filter-label">Boot</InputLabel>
              <Select
                labelId="work-hours-boat-filter-label"
                label="Boot"
                value={boatFilter}
                onChange={(e: SelectChangeEvent) => setBoatFilter(e.target.value)}
              >
                <MenuItem value={BOAT_FILTER_ALL}>Alle Boote</MenuItem>
                <MenuItem value={BOAT_FILTER_NONE}>Ohne Boot</MenuItem>
                {boatFilterOptions.map((boat) => (
                  <MenuItem key={boat.id} value={boat.id}>{boat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={onlyPendingReview}
                  onChange={(e) => setOnlyPendingReview(e.target.checked)}
                  size="small"
                />
              }
              label="Nur ausstehende Prüfung"
            />
          </Box>

          <TableContainer>
            <Table>
            <TableHead>
              <TableRow>
                <TableCell sortDirection={sortKey === 'name' ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === 'name'}
                    direction={sortKey === 'name' ? sortDir : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Mitglied
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortKey === 'progress' ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === 'progress'}
                    direction={sortKey === 'progress' ? sortDir : 'asc'}
                    onClick={() => handleSort('progress')}
                  >
                    Fortschritt
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Absolviert</TableCell>
                <TableCell align="right">Geplant</TableCell>
                <TableCell align="right" sortDirection={sortKey === 'remaining' ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === 'remaining'}
                    direction={sortKey === 'remaining' ? sortDir : 'asc'}
                    onClick={() => handleSort('remaining')}
                  >
                    Ausstehend
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortKey === 'status' ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === 'status'}
                    direction={sortKey === 'status' ? sortDir : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleUserWorkHours.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Alert severity="info">Keine Mitglieder entsprechen den aktuellen Filtern.</Alert>
                  </TableCell>
                </TableRow>
              )}
              {visibleUserWorkHours.map(({ uh, hasPending }) => {
                const { user, completedDuration, upcomingDuration, status } = uh;
                const remaining = Math.max(
                  0,
                  required - completedDuration - upcomingDuration
                );
                const progress = (completedDuration / required) * 100;

                return (
                  <React.Fragment key={user.id}>
                    <TableRow
                          onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                          sx={{ cursor: 'pointer' }}>
                      <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                          size="small"
                        >
                          <ExpandMoreIcon sx={{ transform: expandedUser === user.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </IconButton>
                        {user.displayName}
                      </Box>
                    </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, progress)}
                            sx={{ flexGrow: 1 }}
                          />
                          <Typography variant="body2" sx={{ width: '4ch' }}>
                            {Math.round(progress)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {shortHumanizer(completedDuration)}
                      </TableCell>
                      <TableCell align="right">
                        {shortHumanizer(upcomingDuration)}
                      </TableCell>
                      <TableCell align="right">{shortHumanizer(remaining)}</TableCell>
                      <TableCell>
                        <StatusChip overall={true} status={
                          status === 'paused'
                           ? WORKSTATUS.PAUSED
                           : status === 'done'
                              ? WORKSTATUS.DONE
                              : status === 'attention' || hasPending
                                ? WORKSTATUS.REJECTED // special case for "Prüfen!"
                                : status === 'planned'
                                  ? WORKSTATUS.PLANNED
                                  : WORKSTATUS.OPEN
                        } />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                        <Collapse in={expandedUser === user.id} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 1 }}>
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Datum</TableCell>
                                    <TableCell>Zeit</TableCell>
                                    <TableCell>Titel</TableCell>
                                    <TableCell>Dauer</TableCell>
                                    <TableCell>Status</TableCell>
                                    {(isAdmin || isAnyBootswart) && <TableCell>Aktionen</TableCell>}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {userWorkHours
                                    .find(h => h.user.id === user.id)?.appointments?.completed
                                    .concat(userWorkHours.find(h => h.user.id === user.id)?.appointments?.upcoming || [])
                                    .filter(apt => isAdmin || (apt.boatId && myBoatIds.has(apt.boatId)))
                                    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
                                    .map(appointment => {
                                      const rawUp = appointment.participants.find(p => p.userId === user.id)!;
                                      const up = mergeParticipant(appointment.id, rawUp);
                                      const start = up.startTime || appointment.startTime;
                                      const end = up.endTime || appointment.endTime;
                                      const isInPast = (end.getTime() < new Date().getTime());
                                      const duration = end.getTime() - start.getTime();
                                      const startDate = start.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                      const endDate = end.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                      const boatForAppointment = boats.find(b => b.id === appointment.boatId);
                                      const isBootswart = boatForAppointment?.bootswart === currentUser?.id || boatForAppointment?.bootswart2 === currentUser?.id;

                                      return (
                                        <TableRow
                                          key={`${user.id}-${appointment.id}`}
                                          hover
                                          sx={{ cursor: 'pointer' }}
                                          onClick={() => setDetailAppointment(appointment)}
                                        >
                                          <TableCell>
                                            {startDate}
                                            {startDate !== endDate && " - "}
                                            {startDate !== endDate && endDate}
                                          </TableCell>
                                          <TableCell>
                                            {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                            {" - "}
                                            {end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                          </TableCell>
                                          <TableCell>{appointment.title}</TableCell>
                                          <TableCell>{shortHumanizer(duration)}</TableCell>
                                          <TableCell>
                                            <StatusChip overall={false} status={
                                              up.status === 'confirmed' && isInPast
                                                ? WORKSTATUS.DONE
                                                : up.status === 'pending'
                                                  ? WORKSTATUS.OPEN
                                                  : up.status === 'declined'
                                                    ? WORKSTATUS.REJECTED
                                                    : WORKSTATUS.PLANNED} />
                                          </TableCell>
                                          {(isAdmin || isBootswart) && (
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                              {up.status !== 'confirmed' ? (
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                  <Tooltip title="Bestätigen">
                                                    <IconButton
                                                      size="small"
                                                      color="success"
                                                      onClick={changeParticipantStatus(appointment, user.id, 'confirmed')}
                                                    >
                                                      <CheckIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                  <Tooltip title="Ablehnen">
                                                    <IconButton
                                                      size="small"
                                                      color="error"
                                                      onClick={changeParticipantStatus(appointment, user.id, 'declined')}
                                                    >
                                                      <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                </Box>
                                              ) : user.id !== currentUser?.id ? (
                                                <Tooltip title="Freigabe zurücknehmen">
                                                  <IconButton
                                                    size="small"
                                                    color="warning"
                                                    onClick={changeParticipantStatus(appointment, user.id, 'pending')}
                                                  >
                                                    <ReplayIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              ) : null}
                                            </TableCell>
                                          )}
                                        </TableRow>
                                      );
                                    })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        </Paper>
      )}
      {detailAppointment && (
        <AppointmentDetailsDialog
          open={!!detailAppointment}
          onClose={() => setDetailAppointment(undefined)}
          appointment={detailAppointment}
          onUpdate={async () => { await refreshAppointments(); }}
          onDelete={async () => {
            await database.deleteDocument('workAppointments', detailAppointment.id);
            setDetailAppointment(undefined);
            await refreshAppointments();
          }}
        />
      )}
      <PrivateWorkHoursDialog
        open={privateHoursDialogOpen}
        onClose={() => {
          setPrivateHoursDialogOpen(false);
          setEditingAppointment(undefined);
        }}
        onUpdate={refreshAppointments}
        appointment={editingAppointment}
      />
      <ImportWorkHoursDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportComplete={refreshAppointments}
      />
    </Box>
  );
};
