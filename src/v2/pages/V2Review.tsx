import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon, FactCheck as ReviewIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useSnackbar } from 'notistack';
import { useApp } from '../../contexts/AppContext';
import { useLiveData } from '../data/LiveDataContext';
import { useReviewQueues } from '../hooks/useReviewCounts';
import { setParticipantStatus } from '../../domain/workHourActions';
import { setReservationStatus } from '../../domain/reservationActions';
import { formatSeason, isSeasonModelActive } from '../../domain/seasons';
import { SeasonChip } from '../../components/Members/SeasonFields';
import { AppointmentDetailsDialog } from '../../components/WorkCalendar/AppointmentDetailsDialog';
import { V2Card, V2EmptyState, V2ListSkeleton, V2Page } from '../components/V2Page';
import { formatHours } from '../format';

/**
 * Prüf-Eingang für Admins und Bootswarte: offene Arbeitsstunden und Reservierungen mit direkten Aktionen.
 * Die Liste aktualisiert sich live; erledigte Einträge verschwinden sofort.
 */
export const V2Review: React.FC = () => {
  const { currentUser, database, boats, systemConfig } = useApp();
  const { appointments, loading } = useLiveData();
  const { work, reservations } = useReviewQueues();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [tab, setTab] = useState<'work' | 'reservations'>('work');
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const modelActive = isSeasonModelActive(systemConfig);
  const detailAppointment = detailId ? appointments.find((appointment) => appointment.id === detailId) : undefined;

  if (!currentUser) return null;

  const withBusy = async (key: string, action: () => Promise<void>) => {
    setBusy((prev) => new Set(prev).add(key));
    try {
      await action();
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const decideWork = (appointmentId: string, userId: string, userName: string, status: 'confirmed' | 'declined') =>
    withBusy(`${appointmentId}:${userId}`, async () => {
      try {
        await setParticipantStatus(database, appointmentId, userId, status, currentUser);
        enqueueSnackbar(`${userName}: ${status === 'confirmed' ? 'bestätigt' : 'abgelehnt'}`, {
          variant: 'success',
          autoHideDuration: 8000,
          action: (key) => (
            <Button
              color="inherit"
              size="small"
              onClick={async () => {
                closeSnackbar(key);
                try {
                  await setParticipantStatus(database, appointmentId, userId, 'pending', currentUser);
                } catch {
                  enqueueSnackbar('Rückgängig machen fehlgeschlagen', { variant: 'error' });
                }
              }}
            >
              Rückgängig
            </Button>
          ),
        });
      } catch (error) {
        console.error('Error deciding work entry:', error);
        enqueueSnackbar('Speichern fehlgeschlagen. Bitte erneut versuchen.', { variant: 'error' });
      }
    });

  const decideReservation = (reservationId: string, status: 'approved' | 'rejected') =>
    withBusy(reservationId, async () => {
      const reservation = reservations.find((item) => item.id === reservationId);
      if (!reservation) return;
      try {
        await setReservationStatus(database, reservation, status, currentUser, boats);
        enqueueSnackbar(`Reservierung ${status === 'approved' ? 'genehmigt' : 'abgelehnt'}`, { variant: 'success' });
      } catch (error) {
        console.error('Error deciding reservation:', error);
        enqueueSnackbar('Speichern fehlgeschlagen. Bitte erneut versuchen.', { variant: 'error' });
      }
    });

  return (
    <V2Page title="Zu prüfen" subtitle="Offene Einträge Ihrer Zuständigkeit. Änderungen anderer Prüfender erscheinen sofort.">
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="work" label={`Arbeitsstunden (${work.length})`} sx={{ textTransform: 'none', fontSize: '1rem' }} />
        <Tab value="reservations" label={`Reservierungen (${reservations.length})`} sx={{ textTransform: 'none', fontSize: '1rem' }} />
      </Tabs>

      {loading ? <V2ListSkeleton /> : tab === 'work' ? (
        work.length === 0 ? (
          <V2Card><V2EmptyState icon={<ReviewIcon fontSize="inherit" />} title="Keine offenen Arbeitsstunden" description="Neue Einträge erscheinen hier automatisch." /></V2Card>
        ) : (
          <Stack spacing={1.5}>
            {work.map((review) => {
              const boat = boats.find((b) => b.id === review.appointment.boatId);
              const isBusy = busy.has(review.key);
              const isFuture = review.endTime > new Date();
              return (
                <Card key={review.key} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>{review.participant.userName}</Typography>
                      <Typography variant="subtitle2">{formatHours(review.minutes)}</Typography>
                    </Box>
                    <Typography variant="body2">{review.appointment.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {dayjs(review.startTime).locale('de').format('dd, DD.MM.YYYY · HH:mm')} – {dayjs(review.endTime).format('HH:mm')}
                      {boat ? ` · ${boat.name}` : review.appointment.private ? ' · privat' : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      {modelActive && <SeasonChip season={review.season} manual={review.seasonManual} />}
                      {isFuture && <Chip size="small" label="Termin liegt in der Zukunft" variant="outlined" />}
                      {review.appointment.description && <Chip size="small" label="Beschreibung vorhanden" variant="outlined" onClick={() => setDetailId(review.appointment.id)} />}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckIcon />}
                      disabled={isBusy}
                      onClick={() => decideWork(review.appointment.id, review.participant.userId, review.participant.userName, 'confirmed')}
                    >
                      Bestätigen
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CloseIcon />}
                      disabled={isBusy}
                      onClick={() => decideWork(review.appointment.id, review.participant.userId, review.participant.userName, 'declined')}
                    >
                      Ablehnen
                    </Button>
                    <Button sx={{ ml: 'auto !important' }} onClick={() => setDetailId(review.appointment.id)}>Details</Button>
                  </CardActions>
                </Card>
              );
            })}
          </Stack>
        )
      ) : reservations.length === 0 ? (
        <V2Card><V2EmptyState icon={<ReviewIcon fontSize="inherit" />} title="Keine offenen Reservierungen" /></V2Card>
      ) : (
        <Stack spacing={1.5}>
          {reservations.map((reservation) => {
            const boat = boats.find((b) => b.id === reservation.boatId);
            const isBusy = busy.has(reservation.id);
            return (
              <Card key={reservation.id} variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: boat?.color || 'grey.400' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{boat?.name ?? 'Boot'}</Typography>
                  </Box>
                  <Typography variant="body2">{reservation.title} · {reservation.userName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dayjs(reservation.startTime).locale('de').format('dd, DD.MM.YYYY · HH:mm')} – {dayjs(reservation.endTime).locale('de').format(dayjs(reservation.startTime).isSame(reservation.endTime, 'day') ? 'HH:mm' : 'dd, DD.MM. HH:mm')}
                  </Typography>
                  {reservation.description && <Typography variant="body2" sx={{ mt: 1 }}>{reservation.description}</Typography>}
                  {reservation.eligibilitySnapshot && !reservation.eligibilitySnapshot.workHoursMet && (
                    <Chip size="small" color="warning" variant="outlined" sx={{ mt: 1 }} label={`Arbeitsstunden${modelActive ? ' ' + formatSeason(systemConfig.currentSeason ?? 0) : ''} beim Anlegen nicht erfüllt`} />
                  )}
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button variant="contained" color="success" startIcon={<CheckIcon />} disabled={isBusy} onClick={() => decideReservation(reservation.id, 'approved')}>Genehmigen</Button>
                  <Button variant="outlined" color="error" startIcon={<CloseIcon />} disabled={isBusy} onClick={() => decideReservation(reservation.id, 'rejected')}>Ablehnen</Button>
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      )}

      {detailAppointment && (
        <AppointmentDetailsDialog open onClose={() => setDetailId(null)} appointment={detailAppointment} onUpdate={async () => undefined} />
      )}
    </V2Page>
  );
};
