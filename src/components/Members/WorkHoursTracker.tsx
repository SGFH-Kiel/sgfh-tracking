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
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Button,
  SxProps,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useApp } from '../../contexts/AppContext';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useCalculateWorkHours, UserWorkHours } from '../../hooks/memberHooks';
import humanizeDuration from 'humanize-duration';
import { WorkAppointment, WorkParticipant } from '../../types/models';
import { PrivateWorkHoursDialog } from './PrivateWorkHoursDialog';
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

export const WorkHoursTracker: React.FC = () => {
  const { isAdmin, isAnyBootswart, currentUser, systemConfig, database, boats } = useApp();
  const [privateHoursDialogOpen, setPrivateHoursDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const { userWorkHours, loading, error, reload: refreshAppointments } = useCalculateWorkHours();
  const { setBreadcrumbs } = usePageTitle();

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
    setPrivateHoursDialogOpen(true);
  }, [setPrivateHoursDialogOpen]);

  const changeParticipantStatus = useCallback((appointment: WorkAppointment, userId: string, status: 'confirmed' | 'declined') => async () => {
    const updatedParticipants = appointment.participants.map(p =>
      p.userId === userId ? { ...p, status } : p
    );
    await database.updateDocument<WorkAppointment>('workAppointments', appointment.id, {
      participants: updatedParticipants
    });
    refreshAppointments();
  }, [database, refreshAppointments]);
  

  useEffect(() => {
    setBreadcrumbs([
      { text: 'Arbeitsstunden' },
    ]);
  }, [setBreadcrumbs]);

  const currentUserHours = useMemo(() => userWorkHours.find(({ user }) => user.id === currentUser?.id) || { completedDuration: 0, upcomingDuration: 0, declinedDuration: 0, appointments: { completed: [], upcoming: [], declined: [] } }, [userWorkHours, currentUser]);
  // hours to duration
  const required = systemConfig.workHourThreshold * 3600000;
  const userAppointments = useMemo(() => {
    return [
      ...(currentUserHours?.appointments?.completed || []).map(apt => ({ ...apt, status: 'completed' })),
      ...(currentUserHours?.appointments?.upcoming || []).map(apt => ({ ...apt, status: 'pending' })),
      ...(currentUserHours?.appointments?.declined || []).map(apt => ({ ...apt, status: 'declined' }))
    ];
  }, [currentUserHours]);
  const hoursToDo = humanizer(required - currentUserHours?.completedDuration - currentUserHours?.upcomingDuration);

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
              currentUser.skipHours
                ? WORKSTATUS.PAUSED
                : currentUserHours?.completedDuration >= required
                  ? WORKSTATUS.DONE
                  : currentUserHours?.completedDuration + currentUserHours?.upcomingDuration >= required
                    ? WORKSTATUS.PLANNED
                    : WORKSTATUS.OPEN
          } overall={true} sx={{ mt: 1, mb: 2 }} />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mt: 2 }}>
          <Box key={currentUser?.id} sx={{ minWidth: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Tooltip
                title={
                  <Box sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', minWidth: 125 }}>
                      {currentUserHours?.completedDuration >= required
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
                <TableCell>Dauer</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userAppointments.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
                .map((appointment) => {
                  const up: WorkParticipant = appointment.participants.find((p) => p.userId === currentUser.id)!;
                  const start = up.startTime ? up.startTime : appointment.startTime;
                  const end = up.endTime ? up.endTime : appointment.endTime;
                  const startDate = start.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
                  const endDate = end.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
                  
                  const duration = (end.getTime() - start.getTime());
                  const isInPast = (end.getTime() < new Date().getTime());

                  return (
                    <TableRow key={`${appointment.id}-${currentUser.id}-${up.status}`}>
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
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, justifyContent: 'flex-end', mb: 1 }}>
            <Typography variant="h5" gutterBottom>
              Mitgliederstunden
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
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

          <TableContainer>
            <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mitglied</TableCell>
                <TableCell>Fortschritt</TableCell>
                <TableCell align="right">Absolviert</TableCell>
                <TableCell align="right">Geplant</TableCell>
                <TableCell align="right">Ausstehend</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userWorkHours.map(({ user, completedDuration, upcomingDuration, appointments: {upcoming} }) => {
                const remaining = Math.max(
                  0,
                  required - completedDuration - upcomingDuration
                );
                const progress = (completedDuration / required) * 100;
                const hasPending = upcoming.some(apt => apt.participants.some(p => p.status === 'pending'));

                return (
                  <React.Fragment key={user.id}>
                    <TableRow>
                      <TableCell>{user.displayName}</TableCell>
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
                          user.skipHours
                           ? WORKSTATUS.PAUSED
                           : completedDuration >= required
                              ? WORKSTATUS.DONE
                              : hasPending
                                ? WORKSTATUS.REJECTED // special case for "Prüfen!"
                                : completedDuration + upcomingDuration >= required
                                  ? WORKSTATUS.PLANNED
                                  : WORKSTATUS.OPEN
                        } />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                        <Accordion
                          expanded={expandedUser === user.id}
                          onChange={(e, isExpanded) => setExpandedUser(isExpanded ? user.id : null)}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>Arbeitstermine</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
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
                                    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
                                    .map(appointment => {
                                      const up = appointment.participants.find(p => p.userId === user.id)!;
                                      const start = up.startTime || appointment.startTime;
                                      const end = up.endTime || appointment.endTime;
                                      const isInPast = (end.getTime() < new Date().getTime());
                                      const duration = end.getTime() - start.getTime();
                                      const startDate = start.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                      const endDate = end.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                      const isBootswart = boats.find(b => b.id === appointment.boatId)?.bootswart === currentUser?.id;

                                      return (
                                        <TableRow key={`${user.id}-${appointment.id}`}>
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
                                            <TableCell>
                                              {up.status !== 'confirmed' && (
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
                                              )}
                                            </TableCell>
                                          )}
                                        </TableRow>
                                      );
                                    })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </AccordionDetails>
                        </Accordion>
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
      <PrivateWorkHoursDialog
        open={privateHoursDialogOpen}
        onClose={() => setPrivateHoursDialogOpen(false)}
        onUpdate={refreshAppointments}
      />
      <ImportWorkHoursDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportComplete={refreshAppointments}
      />
    </Box>
  );
};
