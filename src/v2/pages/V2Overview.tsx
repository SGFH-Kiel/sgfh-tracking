import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as OkIcon,
  DirectionsBoat as BoatIcon,
  FactCheck as ReviewIcon,
  GetApp as InstallIcon,
  Handyman as HoursIcon,
  NewReleases as NewsIcon,
  WarningAmber as WarnIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useApp } from '../../contexts/AppContext';
import { useLiveData } from '../data/LiveDataContext';
import { getMyUpcomingReservations, getUpcomingWorkAppointments } from '../data/selectors';
import { useReviewCounts } from '../hooks/useReviewCounts';
import { useChangelog } from '../../hooks/useChangelog';
import { calculateUserWorkHourSnapshot } from '../../domain/workHours';
import { formatSeason, getCurrentSeason, isNextSeasonOpen, isSeasonModelActive } from '../../domain/seasons';
import { getReservationEligibility } from '../../domain/eligibility';
import { useInstallAction } from '../../pwa/PwaComponents';
import { PrivateWorkHoursDialog } from '../../components/Members/PrivateWorkHoursDialog';
import { AppointmentDetailsDialog } from '../../components/WorkCalendar/AppointmentDetailsDialog';
import { V2Card, V2EmptyState, V2ListSkeleton, V2Page } from '../components/V2Page';
import { formatHours } from '../format';

const RESERVATION_STATUS: Record<string, { label: string; color: 'default' | 'warning' | 'info' | 'success' }> = {
  draft: { label: 'Vormerkung', color: 'warning' },
  pending: { label: 'Wartet auf Genehmigung', color: 'info' },
  approved: { label: 'Genehmigt', color: 'success' },
};

export const V2Overview: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, systemConfig, boats, isAdmin, isAnyBootswart } = useApp();
  const { appointments, reservations, loading } = useLiveData();
  const reviewCounts = useReviewCounts();
  const { unseen } = useChangelog();
  const { installable, install, dialog: installDialog } = useInstallAction();
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const season = getCurrentSeason(systemConfig);
  const modelActive = isSeasonModelActive(systemConfig);

  const snapshot = useMemo(
    () => (currentUser ? calculateUserWorkHourSnapshot(currentUser, appointments, systemConfig, now, season) : null),
    [currentUser, appointments, systemConfig, now, season],
  );
  const eligibility = currentUser && snapshot
    ? getReservationEligibility(currentUser, snapshot.summary.completedMinutes, systemConfig, season)
    : null;
  const nextSeasonSnapshot = useMemo(
    () => (currentUser && isNextSeasonOpen(systemConfig) ? calculateUserWorkHourSnapshot(currentUser, appointments, systemConfig, now, season + 1) : null),
    [currentUser, appointments, systemConfig, now, season],
  );
  const myReservations = currentUser ? getMyUpcomingReservations(reservations, currentUser.id, now) : [];
  const upcomingWork = currentUser ? getUpcomingWorkAppointments(appointments, currentUser.id, now) : [];
  const detailAppointment = detailId ? appointments.find((appointment) => appointment.id === detailId) : undefined;

  if (!currentUser) return null;
  const firstName = currentUser.displayName.split(' ')[0];
  const required = snapshot?.summary.requiredMinutes ?? 0;
  const completed = snapshot?.summary.completedMinutes ?? 0;
  const pending = snapshot?.summary.pendingMinutes ?? 0;

  return (
    <V2Page title="Übersicht" subtitle={`Hallo ${firstName}!`}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {/* Reservierungsberechtigung */}
        <V2Card
          title={eligibility?.canReserve ? 'Sie können final reservieren' : 'Finale Reservierung noch nicht möglich'}
          icon={eligibility?.canReserve ? <OkIcon color="success" /> : <WarnIcon color="warning" />}
          sx={{ gridColumn: { md: '1 / -1' } }}
        >
          {loading ? <V2ListSkeleton rows={1} /> : (
            <Stack spacing={1.5}>
              {!currentUser.skipHours ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2">
                      Arbeitsstunden{modelActive ? ` ${formatSeason(season)}` : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatHours(completed)} bestätigt{pending > 0 ? ` · ${formatHours(pending)} offen` : ''} von {formatHours(required)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={required ? Math.min(100, (completed / required) * 100) : 100}
                    color={completed >= required ? 'success' : 'primary'}
                    sx={{ height: 10, borderRadius: 5 }}
                    aria-label="Fortschritt Arbeitsstunden"
                  />
                </Box>
              ) : (
                <Typography variant="body2">Sie sind von den Arbeitsstunden befreit.</Typography>
              )}
              {eligibility && eligibility.missingRequirements.length > 0 && (
                <Alert severity="warning" variant="outlined">
                  {eligibility.missingRequirements.map((item) => <div key={item}>{item}</div>)}
                </Alert>
              )}
              {nextSeasonSnapshot && !currentUser.skipHours && (
                <Typography variant="body2" color="text.secondary">
                  Für {formatSeason(season + 1)} bereits vorgebucht: {formatHours(nextSeasonSnapshot.summary.completedMinutes)} bestätigt
                  {nextSeasonSnapshot.summary.pendingMinutes > 0 ? `, ${formatHours(nextSeasonSnapshot.summary.pendingMinutes)} offen` : ''}.
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setHoursDialogOpen(true)}>Stunden eintragen</Button>
                <Button variant="outlined" startIcon={<HoursIcon />} onClick={() => navigate('/hours')}>Meine Stunden</Button>
              </Box>
            </Stack>
          )}
        </V2Card>

        {(isAdmin || isAnyBootswart) && (
          <V2Card title="Zu prüfen" icon={<ReviewIcon />}>
            {reviewCounts.total === 0 ? (
              <Typography variant="body2" color="text.secondary">Alles erledigt – keine offenen Prüfungen.</Typography>
            ) : (
              <Stack spacing={1.5}>
                <Typography variant="body2">
                  {reviewCounts.work > 0 && `${reviewCounts.work} Arbeitsstunden-Einträge`}
                  {reviewCounts.work > 0 && reviewCounts.reservations > 0 && ' und '}
                  {reviewCounts.reservations > 0 && `${reviewCounts.reservations} Reservierungen`} warten auf Sie.
                </Typography>
                <Box><Button variant="contained" onClick={() => navigate('/review')}>Jetzt prüfen</Button></Box>
              </Stack>
            )}
          </V2Card>
        )}

        <V2Card
          title="Meine nächsten Reservierungen"
          icon={<BoatIcon />}
          action={<Button size="small" onClick={() => navigate('/calendar')}>Kalender</Button>}
        >
          {loading ? <V2ListSkeleton rows={2} /> : myReservations.length === 0 ? (
            <V2EmptyState
              title="Keine anstehenden Reservierungen"
              action={<Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/calendar')}>Reservieren</Button>}
            />
          ) : (
            <List disablePadding>
              {myReservations.map((reservation) => {
                const boat = boats.find((b) => b.id === reservation.boatId);
                const status = RESERVATION_STATUS[reservation.status];
                return (
                  <ListItemButton key={reservation.id} onClick={() => navigate('/calendar')} sx={{ borderRadius: 2, px: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: boat?.color || 'grey.400', mr: 1.5, flexShrink: 0 }} />
                    <ListItemText
                      primary={`${boat?.name ?? 'Boot'} · ${reservation.title}`}
                      secondary={dayjs(reservation.startTime).locale('de').format('dd, DD.MM. HH:mm') + ' – ' + dayjs(reservation.endTime).format('HH:mm')}
                    />
                    {status && <Chip size="small" label={status.label} color={status.color} variant="outlined" sx={{ ml: 1 }} />}
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </V2Card>

        <V2Card
          title="Nächste Arbeitstermine"
          icon={<CalendarIcon />}
          action={<Button size="small" onClick={() => navigate('/calendar')}>Alle</Button>}
        >
          {loading ? <V2ListSkeleton rows={2} /> : upcomingWork.length === 0 ? (
            <V2EmptyState title="Keine offenen Arbeitstermine" description="Sie können Stunden auch privat eintragen." />
          ) : (
            <List disablePadding>
              {upcomingWork.map(({ appointment, freeSpots, isParticipant }) => (
                <ListItemButton key={appointment.id} onClick={() => setDetailId(appointment.id)} sx={{ borderRadius: 2, px: 1 }}>
                  <ListItemText
                    primary={appointment.title}
                    secondary={`${dayjs(appointment.startTime).locale('de').format('dd, DD.MM. HH:mm')} – ${dayjs(appointment.endTime).format('HH:mm')}${boats.find((b) => b.id === appointment.boatId) ? ' · ' + boats.find((b) => b.id === appointment.boatId)!.name : ''}`}
                  />
                  {isParticipant
                    ? <Chip size="small" label="Dabei" color="success" sx={{ ml: 1 }} />
                    : freeSpots !== null && <Chip size="small" label={`${freeSpots} frei`} variant="outlined" sx={{ ml: 1 }} />}
                </ListItemButton>
              ))}
            </List>
          )}
        </V2Card>

        {unseen.length > 0 && (
          <V2Card title="Neuigkeiten" icon={<NewsIcon />}>
            <Stack spacing={1}>
              {unseen.slice(0, 3).map((entry) => (
                <Typography key={entry.id} variant="body2">• {entry.title}</Typography>
              ))}
              <Box><Button size="small" variant="outlined" onClick={() => navigate('/changelog')}>Alle Neuigkeiten</Button></Box>
            </Stack>
          </V2Card>
        )}

        {installable && (
          <V2Card title="Als App installieren" icon={<InstallIcon />}>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Mit eigenem Symbol auf dem Startbildschirm, im Vollbild und ohne erneute Anmeldung.
            </Typography>
            <Button variant="outlined" startIcon={<InstallIcon />} onClick={install}>App installieren</Button>
          </V2Card>
        )}
      </Box>

      <PrivateWorkHoursDialog open={hoursDialogOpen} onClose={() => setHoursDialogOpen(false)} onUpdate={() => undefined} />
      {detailAppointment && (
        <AppointmentDetailsDialog
          open
          onClose={() => setDetailId(null)}
          appointment={detailAppointment}
          onUpdate={async () => undefined}
        />
      )}
      {installDialog}
    </V2Page>
  );
};
