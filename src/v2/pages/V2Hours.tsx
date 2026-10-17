import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Handyman as HoursIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useApp } from '../../contexts/AppContext';
import { useLiveData } from '../data/LiveDataContext';
import { calculateUserWorkHourSnapshot, WorkHourEntry } from '../../domain/workHours';
import { collectKnownSeasons, formatSeason, getCurrentSeason, isNextSeasonOpen, isSeasonModelActive } from '../../domain/seasons';
import { PrivateWorkHoursDialog } from '../../components/Members/PrivateWorkHoursDialog';
import { AppointmentDetailsDialog } from '../../components/WorkCalendar/AppointmentDetailsDialog';
import { SeasonChip } from '../../components/Members/SeasonFields';
import { useConfirm } from '../../components/common/ConfirmProvider';
import { V2Card, V2EmptyState, V2Fab, V2ListSkeleton, V2Page, V2StatusChip, workStatusOf } from '../components/V2Page';
import { formatHours } from '../format';
import { WorkAppointment } from '../../types/models';

export const V2Hours: React.FC = () => {
  const { currentUser, systemConfig, boats, database } = useApp();
  const { appointments, loading } = useLiveData();
  const confirm = useConfirm();
  const modelActive = isSeasonModelActive(systemConfig);
  const currentSeason = getCurrentSeason(systemConfig);
  const [season, setSeason] = useState<number>(currentSeason);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkAppointment | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);

  const snapshot = useMemo(
    () => (currentUser ? calculateUserWorkHourSnapshot(currentUser, appointments, systemConfig, now, season) : null),
    [currentUser, appointments, systemConfig, now, season],
  );
  const seasons = useMemo(() => (modelActive ? collectKnownSeasons(appointments, systemConfig) : []), [modelActive, appointments, systemConfig]);
  const appointmentById = useMemo(() => new Map(appointments.map((appointment) => [appointment.id, appointment])), [appointments]);
  const detailAppointment = detailId ? appointmentById.get(detailId) : undefined;

  if (!currentUser || !snapshot) return null;
  const { completedMinutes, pendingMinutes, requiredMinutes, remainingMinutes } = snapshot.summary;

  const groups: { title: string; entries: WorkHourEntry[] }[] = [
    { title: 'Offen', entries: snapshot.pendingEntries.filter((entry) => entry.participantStatus === 'pending') },
    { title: 'Geplant', entries: snapshot.pendingEntries.filter((entry) => entry.participantStatus === 'confirmed') },
    { title: 'Abgelehnt', entries: snapshot.declinedEntries },
    { title: 'Bestätigt', entries: snapshot.completedEntries },
  ].filter((group) => group.entries.length > 0);

  const seasonHint = season === currentSeason
    ? 'Zählt für die Reservierungsberechtigung.'
    : season > currentSeason
      ? `Vorgebucht für die nächste Saison. Für Reservierungen zählt aktuell ${formatSeason(currentSeason)}.`
      : 'Abgeschlossene Saison.';

  return (
    <V2Page
      title="Meine Stunden"
      subtitle={modelActive ? seasonHint : undefined}
      actions={modelActive && seasons.length > 1 ? (
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="v2-season-label">Saison</InputLabel>
          <Select labelId="v2-season-label" label="Saison" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
            {seasons.map((option) => (
              <MenuItem key={option} value={option}>
                {formatSeason(option)}
                {option === currentSeason ? ' (aktuell)' : option === currentSeason + 1 && isNextSeasonOpen(systemConfig) ? ' (nächste)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : undefined}
    >
      <V2Card>
        {currentUser.skipHours ? (
          <Typography variant="body1">Sie sind von den Arbeitsstunden befreit. Eingetragene Stunden werden trotzdem erfasst.</Typography>
        ) : (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h4" component="p" sx={{ fontWeight: 600 }}>{formatHours(completedMinutes)}</Typography>
              <Typography variant="body1" color="text.secondary">von {formatHours(requiredMinutes)} bestätigt</Typography>
            </Box>
            <LinearProgress
              variant="buffer"
              value={requiredMinutes ? Math.min(100, (completedMinutes / requiredMinutes) * 100) : 100}
              valueBuffer={requiredMinutes ? Math.min(100, ((completedMinutes + pendingMinutes) / requiredMinutes) * 100) : 100}
              color={completedMinutes >= requiredMinutes ? 'success' : 'primary'}
              sx={{ height: 10, borderRadius: 5, '& .MuiLinearProgress-dashed': { display: 'none' } }}
              aria-label="Fortschritt Arbeitsstunden"
            />
            <Typography variant="body2" color="text.secondary">
              {pendingMinutes > 0 && `${formatHours(pendingMinutes)} offen oder geplant. `}
              {remainingMinutes > 0 ? `Es fehlen noch ${formatHours(remainingMinutes)}.` : completedMinutes >= requiredMinutes ? 'Pflichtstunden erfüllt.' : 'Alle Stunden sind eingeplant.'}
            </Typography>
          </Stack>
        )}
      </V2Card>

      {loading ? <V2ListSkeleton /> : groups.length === 0 ? (
        <V2Card>
          <V2EmptyState
            icon={<HoursIcon fontSize="inherit" />}
            title="Noch keine Einträge"
            description="Tragen Sie geleistete Stunden ein oder melden Sie sich im Kalender zu einem Arbeitstermin an."
          />
        </V2Card>
      ) : groups.map((group) => (
        <Box key={group.title} component="section">
          <Typography variant="overline" color="text.secondary" component="h2">{group.title} · {group.entries.length}</Typography>
          <Stack spacing={1}>
            {group.entries.map((entry) => {
              const appointment = appointmentById.get(entry.appointmentId);
              const boat = boats.find((b) => b.id === entry.boatId);
              const ownPrivate = !!appointment?.private && appointment.createdByUserId === currentUser.id;
              const editable = ownPrivate && entry.participantStatus !== 'confirmed';
              return (
                <Card key={`${entry.appointmentId}-${entry.userId}`} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                    <CardActionArea onClick={() => setDetailId(entry.appointmentId)} sx={{ p: 1.5, flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>{entry.title}</Typography>
                        <Typography variant="subtitle2">{formatHours(entry.minutes)}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {dayjs(entry.startTime).locale('de').format('dd, DD.MM.YYYY · HH:mm')} – {dayjs(entry.endTime).format('HH:mm')}
                        {boat ? ` · ${boat.name}` : entry.isPrivate ? ' · privat' : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <V2StatusChip status={workStatusOf(entry.participantStatus, entry.endTime)} />
                        {entry.seasonManual && <SeasonChip season={entry.season} manual />}
                        {entry.participantStatus === 'declined' && <Chip size="small" label="Bitte mit Admin/Bootswart klären" variant="outlined" />}
                      </Box>
                    </CardActionArea>
                    {editable && appointment && (
                      <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
                        <Tooltip title="Bearbeiten">
                          <IconButton aria-label="Eintrag bearbeiten" onClick={() => { setEditing(appointment); setDialogOpen(true); }}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </Card>
              );
            })}
          </Stack>
        </Box>
      ))}

      <V2Fab label="Stunden eintragen" icon={<AddIcon />} onClick={() => { setEditing(undefined); setDialogOpen(true); }} />

      <PrivateWorkHoursDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(undefined); }}
        onUpdate={() => undefined}
        appointment={editing}
      />
      {detailAppointment && (
        <AppointmentDetailsDialog
          open
          onClose={() => setDetailId(null)}
          appointment={detailAppointment}
          onUpdate={async () => undefined}
          onDelete={async () => {
            const confirmed = await confirm({
              title: 'Eintrag löschen?',
              message: `„${detailAppointment.title}“ wird endgültig gelöscht.`,
              confirmLabel: 'Löschen',
              destructive: true,
            });
            if (!confirmed) return;
            await database.deleteDocument('workAppointments', detailAppointment.id);
            setDetailId(null);
          }}
        />
      )}
    </V2Page>
  );
};
