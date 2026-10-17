import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Switch,
  Typography,
} from '@mui/material';
import {
  EventAvailable as EventAvailableIcon,
  LockOpen as LockOpenIcon,
  PlayArrow as PlayArrowIcon,
  Sync as SyncIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useApp } from '../../contexts/AppContext';
import { writeActivityLog } from '../../domain/activityLog';
import {
  formatSeason,
  getAccountingYearStart,
  getCurrentSeason,
  getLegacySeason,
  isSeasonModelActive,
  planSeasonBackfill,
  SeasonBackfillPlan,
  suggestSeasonActivation,
} from '../../domain/seasons';
import { calculateUserWorkHourSnapshot } from '../../domain/workHours';
import { SystemConfig, User, UserRole, WorkAppointment } from '../../types/models';
import { useResponsiveDialogProps } from '../../hooks/useIsMobile';

interface SeasonImpact {
  memberCount: number;
  exemptCount: number;
  coveredCount: number;
}

type ConfirmAction = 'activate' | 'openNext' | 'startNext' | 'undoStart';

const formatDate = (date?: Date) => (date ? dayjs(date).format('DD.MM.YYYY') : '–');

const isActiveMember = (user: User) => !user.deactivated && user.roles?.some((role) => role !== UserRole.APPLICANT);

/**
 * Saisonsteuerung im Admin-Bereich.
 * - Backfill und Aktivierung sind einmalige Superadmin-Funktionen.
 * - Nach der Aktivierung steuern Admins den Saisonwechsel über zwei Aktionen.
 */
export const SeasonControl: React.FC = () => {
  const dialogProps = useResponsiveDialogProps();
  const { database, systemConfig, isSuperAdmin, isAdmin, currentUser, boats, reloadSystemConfig } = useApp();
  const { enqueueSnackbar } = useSnackbar();
  const modelActive = isSeasonModelActive(systemConfig);
  const currentSeason = getCurrentSeason(systemConfig);
  const nextSeason = currentSeason + 1;

  const [plan, setPlan] = useState<SeasonBackfillPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState(0);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [impact, setImpact] = useState<SeasonImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const suggestion = useMemo(() => suggestSeasonActivation(systemConfig), [systemConfig]);
  const [activationSeason, setActivationSeason] = useState<number>(suggestion.currentSeason);
  const [activationNextOpen, setActivationNextOpen] = useState<boolean>(suggestion.nextSeasonOpen);

  const legacyPeriodStart = getAccountingYearStart(systemConfig, new Date());
  const legacyPeriodEnd = dayjs(legacyPeriodStart).add(1, 'year').subtract(1, 'day').toDate();
  const allBoatsReleased = boats.length > 0 && boats.every((boat) => !boat.blocked);

  const loadAppointments = useCallback(() => database.getDocuments<WorkAppointment>('workAppointments'), [database]);

  const refreshPlan = useCallback(async () => {
    setPlanning(true);
    try {
      const appointments = await loadAppointments();
      setPlan(planSeasonBackfill(appointments, systemConfig));
    } catch (error) {
      console.error('Error planning season backfill:', error);
      enqueueSnackbar('Fehler beim Prüfen der Saisonzuordnung', { variant: 'error' });
    } finally {
      setPlanning(false);
    }
  }, [loadAppointments, systemConfig, enqueueSnackbar]);

  const updateConfig = useCallback(async (data: Partial<SystemConfig>) => {
    await database.updateDocument<SystemConfig>('systemConfig', 'default', { ...data, updatedAt: new Date() });
    await reloadSystemConfig();
  }, [database, reloadSystemConfig]);

  const log = useCallback(async (type: 'season.backfill' | 'season.activated' | 'season.next_opened' | 'season.started', details: Record<string, unknown>) => {
    if (!currentUser) return;
    await writeActivityLog(database, {
      type,
      entityId: 'systemConfig/default',
      entityType: 'system',
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      details,
    });
  }, [currentUser, database]);

  const runBackfill = async () => {
    if (!isSuperAdmin || backfillRunning) return;
    setBackfillRunning(true);
    setBackfillProgress(0);
    try {
      // Plan direkt vor dem Schreiben neu berechnen, damit zwischenzeitliche Änderungen berücksichtigt werden.
      const appointments = await loadAppointments();
      const freshPlan = planSeasonBackfill(appointments, systemConfig);
      let done = 0;
      for (const change of freshPlan.changes) {
        // Pro Termin den aktuellen Stand lesen und nur die Saisonfelder ändern.
        const latest = await database.getDocument<WorkAppointment>('workAppointments', change.appointmentId);
        if (latest) {
          const latestPlan = planSeasonBackfill([latest], systemConfig);
          if (latestPlan.changes.length > 0) {
            await database.updateDocument<WorkAppointment>('workAppointments', latest.id, {
              participants: latestPlan.changes[0].participants,
            });
          }
        }
        done += 1;
        setBackfillProgress(Math.round((done / Math.max(1, freshPlan.changes.length)) * 100));
      }
      await updateConfig({ seasonBackfillAt: new Date() });
      await log('season.backfill', {
        appointments: freshPlan.changes.length,
        participants: freshPlan.changedParticipantCount,
        modelActive,
        countsBySeason: JSON.stringify(freshPlan.countsBySeason),
      });
      enqueueSnackbar(`Backfill abgeschlossen: ${freshPlan.changedParticipantCount} Einträge aktualisiert.`, { variant: 'success' });
      const after = await loadAppointments();
      setPlan(planSeasonBackfill(after, systemConfig));
    } catch (error) {
      console.error('Error running season backfill:', error);
      enqueueSnackbar('Fehler beim Backfill. Bereits aktualisierte Einträge bleiben erhalten; der Backfill kann erneut ausgeführt werden.', { variant: 'error' });
    } finally {
      setBackfillRunning(false);
    }
  };

  const computeImpact = useCallback(async (season: number) => {
    setImpactLoading(true);
    setImpact(null);
    try {
      const [users, appointments] = await Promise.all([
        database.getDocuments<User>('users'),
        loadAppointments(),
      ]);
      // Für die Vorschau wird so gerechnet, als wäre das Saisonmodell bereits aktiv.
      const previewConfig: SystemConfig = {
        ...systemConfig,
        seasonModelActivatedAt: systemConfig.seasonModelActivatedAt ?? new Date(),
        currentSeason: season,
      };
      const members = users.filter(isActiveMember);
      const exempt = members.filter((user) => user.skipHours);
      const covered = members.filter((user) => {
        if (user.skipHours) return false;
        const snapshot = calculateUserWorkHourSnapshot(user, appointments, previewConfig, new Date(), season);
        return snapshot.summary.completedMinutes >= snapshot.summary.requiredMinutes;
      });
      setImpact({ memberCount: members.length, exemptCount: exempt.length, coveredCount: covered.length });
    } catch (error) {
      console.error('Error computing season impact:', error);
    } finally {
      setImpactLoading(false);
    }
  }, [database, loadAppointments, systemConfig]);

  const openConfirm = (action: ConfirmAction) => {
    setConfirmAction(action);
    if (action === 'activate') {
      setActivationSeason(suggestion.currentSeason);
      setActivationNextOpen(suggestion.nextSeasonOpen);
      computeImpact(suggestion.currentSeason);
    } else if (action === 'startNext') {
      computeImpact(nextSeason);
    } else if (action === 'undoStart') {
      computeImpact(currentSeason - 1);
    } else {
      setImpact(null);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
      const now = new Date();
      if (confirmAction === 'activate') {
        await updateConfig({
          seasonModelActivatedAt: now,
          currentSeason: activationSeason,
          nextSeasonOpen: activationNextOpen,
          currentSeasonStartedAt: now,
          ...(activationNextOpen ? { nextSeasonOpenedAt: now } : {}),
        });
        await log('season.activated', { currentSeason: activationSeason, nextSeasonOpen: activationNextOpen });
        enqueueSnackbar(`Saisonmodell aktiviert: ${formatSeason(activationSeason)} ist die aktuelle Saison.`, { variant: 'success' });
      } else if (confirmAction === 'openNext') {
        await updateConfig({ nextSeasonOpen: true, nextSeasonOpenedAt: now });
        await log('season.next_opened', { currentSeason, nextSeason });
        enqueueSnackbar(`Buchung für ${formatSeason(nextSeason)} ist geöffnet.`, { variant: 'success' });
      } else if (confirmAction === 'startNext') {
        await updateConfig({ currentSeason: nextSeason, nextSeasonOpen: false, currentSeasonStartedAt: now });
        await log('season.started', { previousSeason: currentSeason, currentSeason: nextSeason });
        enqueueSnackbar(`${formatSeason(nextSeason)} ist jetzt die aktuelle Saison.`, { variant: 'success' });
      } else if (confirmAction === 'undoStart') {
        await updateConfig({ currentSeason: currentSeason - 1, nextSeasonOpen: true });
        await log('season.started', { previousSeason: currentSeason, currentSeason: currentSeason - 1, undo: true });
        enqueueSnackbar(`Saisonstart zurückgenommen: ${formatSeason(currentSeason - 1)} ist wieder aktuell.`, { variant: 'info' });
      }
      setConfirmAction(null);
    } catch (error) {
      console.error('Error updating season state:', error);
      enqueueSnackbar('Fehler beim Speichern der Saisonsteuerung', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  const backfillDone = !!systemConfig.seasonBackfillAt;
  const planInSync = !!plan && plan.changes.length === 0;
  const activationReady = backfillDone && planInSync;
  const legacySeasonNow = getLegacySeason(systemConfig, new Date());

  const renderImpact = (season: number) => {
    if (impactLoading) return <LinearProgress sx={{ my: 1 }} />;
    if (!impact) return null;
    const required = impact.memberCount - impact.exemptCount;
    const missing = required - impact.coveredCount;
    return (
      <Alert severity={missing > 0 ? 'warning' : 'success'} sx={{ mt: 2 }}>
        {impact.coveredCount} von {required} Mitgliedern mit Stundenpflicht haben die Stunden für {formatSeason(season)} bereits erfüllt
        {impact.exemptCount > 0 && ` (${impact.exemptCount} befreit)`}.
        {missing > 0 && ` ${missing} Mitglieder können danach erst wieder final reservieren, wenn ihre Stunden für ${formatSeason(season)} bestätigt sind.`}
      </Alert>
    );
  };

  const renderSeasonCounts = (counts: Record<number, number>) => (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
      {Object.entries(counts)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([season, count]) => (
          <Chip key={season} size="small" label={`${formatSeason(Number(season))}: ${count}`} />
        ))}
    </Box>
  );

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Saisonsteuerung
        </Typography>
        <Chip
          size="small"
          color={modelActive ? 'success' : 'default'}
          label={modelActive ? 'Saisonmodell aktiv' : 'Saisonmodell inaktiv'}
        />
      </Box>

      {!modelActive && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            Arbeitsstunden werden aktuell nach dem Stichtag <strong>{dayjs(systemConfig.yearChangeDate).format('DD.MM.')}</strong> gezählt.
            Laufender Zeitraum: {formatDate(legacyPeriodStart)} – {formatDate(legacyPeriodEnd)} (entspricht {formatSeason(legacySeasonNow)}).
            Das Saisonmodell wird erst nach Backfill und Aktivierung wirksam; bis dahin ändert sich nichts.
          </Alert>

          {!isSuperAdmin ? (
            <Alert severity="warning">Backfill und Aktivierung des Saisonmodells können nur Superadmins ausführen.</Alert>
          ) : (
            <Stepper orientation="vertical" activeStep={activationReady ? 1 : 0} nonLinear>
              <Step completed={backfillDone && planInSync}>
                <StepLabel optional={backfillDone ? <Typography variant="caption">Zuletzt ausgeführt am {formatDate(systemConfig.seasonBackfillAt)}</Typography> : undefined}>
                  Backfill: Saison an allen Einträgen speichern
                </StepLabel>
                <StepContent TransitionProps={{ unmountOnExit: false }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Schreibt an jeden vorhandenen Teilnehmereintrag die Saison, die sich aus dem bisherigen Stichtag ergibt.
                    Summen und Berechtigungen ändern sich dadurch nicht. Der Backfill kann gefahrlos wiederholt werden.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    <Button variant="outlined" startIcon={planning ? <CircularProgress size={16} /> : <SyncIcon />} onClick={refreshPlan} disabled={planning || backfillRunning}>
                      Prüfen
                    </Button>
                    <Button
                      variant="contained"
                      onClick={runBackfill}
                      disabled={!plan || plan.changes.length === 0 || backfillRunning}
                    >
                      {plan && plan.changedParticipantCount > 0 ? `Backfill ausführen (${plan.changedParticipantCount})` : 'Backfill ausführen'}
                    </Button>
                  </Box>
                  {backfillRunning && <LinearProgress variant="determinate" value={backfillProgress} sx={{ mt: 2 }} />}
                  {plan && (
                    <Alert severity={plan.changes.length === 0 ? 'success' : 'info'} sx={{ mt: 2 }}>
                      {plan.changes.length === 0
                        ? `Alle ${plan.participantCount} Einträge haben eine Saison.`
                        : `${plan.changedParticipantCount} von ${plan.participantCount} Einträgen in ${plan.changes.length} Terminen werden aktualisiert.`}
                      {renderSeasonCounts(plan.countsBySeason)}
                    </Alert>
                  )}
                </StepContent>
              </Step>
              <Step>
                <StepLabel>Saisonmodell aktivieren</StepLabel>
                <StepContent TransitionProps={{ unmountOnExit: false }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Ab der Aktivierung zählt für die Reservierungsberechtigung die gewählte aktuelle Saison.
                    Mitglieder wählen in der Überlappungsphase, für welche Saison ihre Stunden zählen.
                  </Typography>
                  {!backfillDone && <Alert severity="warning" sx={{ mb: 1 }}>Bitte zuerst den Backfill ausführen.</Alert>}
                  {backfillDone && !plan && <Alert severity="info" sx={{ mb: 1 }}>Bitte im Schritt „Backfill“ auf „Prüfen“ klicken, um den aktuellen Stand zu verifizieren.</Alert>}
                  {backfillDone && plan && !planInSync && (
                    <Alert severity="warning" sx={{ mb: 1 }}>Seit dem letzten Backfill wurden Einträge geändert. Bitte den Backfill erneut ausführen.</Alert>
                  )}
                  <Button variant="contained" color="primary" startIcon={<PlayArrowIcon />} disabled={!activationReady} onClick={() => openConfirm('activate')}>
                    Aktivieren …
                  </Button>
                </StepContent>
              </Step>
            </Stepper>
          )}
        </>
      )}

      {modelActive && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">Aktuelle Saison</Typography>
              <Typography variant="h4">{currentSeason}</Typography>
              <Typography variant="body2" color="text.secondary">
                Zählt für die Reservierungsberechtigung · seit {formatDate(systemConfig.currentSeasonStartedAt)}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">Nächste Saison</Typography>
              <Typography variant="h4">{nextSeason}</Typography>
              <Typography variant="body2" color="text.secondary">
                {systemConfig.nextSeasonOpen
                  ? `Buchung geöffnet seit ${formatDate(systemConfig.nextSeasonOpenedAt)}`
                  : 'Buchung noch geschlossen'}
              </Typography>
            </Paper>
          </Box>

          {systemConfig.nextSeasonOpen && allBoatsReleased && (
            <Alert severity="info" icon={<EventAvailableIcon />} sx={{ mb: 2 }}>
              Alle {boats.length} Boote sind freigegeben. Soll {formatSeason(nextSeason)} jetzt gestartet werden?
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {!systemConfig.nextSeasonOpen ? (
              <Button variant="contained" startIcon={<LockOpenIcon />} onClick={() => openConfirm('openNext')}>
                Buchung für {formatSeason(nextSeason)} öffnen
              </Button>
            ) : (
              <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => openConfirm('startNext')}>
                {formatSeason(nextSeason)} starten
              </Button>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Ablauf: Im Herbst (z. B. ab Auskranen) die Buchung für die nächste Saison öffnen – Winterarbeiten zählen dann für die neue Saison,
            die Reservierungsberechtigung richtet sich weiter nach der laufenden Saison. Im Frühjahr (z. B. bei Freigabe der Boote) die neue Saison starten.
          </Typography>

          {isSuperAdmin && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Erweitert (Superadmin)</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button size="small" variant="outlined" startIcon={planning ? <CircularProgress size={14} /> : <SyncIcon />} onClick={refreshPlan} disabled={planning || backfillRunning}>
                  Fehlende Zuordnungen prüfen
                </Button>
                {plan && plan.changes.length > 0 && (
                  <Button size="small" variant="contained" onClick={runBackfill} disabled={backfillRunning}>
                    {plan.changedParticipantCount} Einträge ergänzen
                  </Button>
                )}
                {!systemConfig.nextSeasonOpen && (
                  <Button size="small" color="warning" variant="outlined" startIcon={<UndoIcon />} onClick={() => openConfirm('undoStart')}>
                    Saisonstart zurücknehmen
                  </Button>
                )}
              </Box>
              {backfillRunning && <LinearProgress variant="determinate" value={backfillProgress} sx={{ mt: 1 }} />}
              {plan && plan.changes.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Alle {plan.participantCount} Einträge haben eine Saison.
                </Typography>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={!!confirmAction} onClose={() => !busy && setConfirmAction(null)} maxWidth="sm" fullWidth {...dialogProps}>
        <DialogTitle>
          {confirmAction === 'activate' && 'Saisonmodell aktivieren'}
          {confirmAction === 'openNext' && `Buchung für ${formatSeason(nextSeason)} öffnen`}
          {confirmAction === 'startNext' && `${formatSeason(nextSeason)} starten`}
          {confirmAction === 'undoStart' && 'Saisonstart zurücknehmen'}
        </DialogTitle>
        <DialogContent>
          {confirmAction === 'activate' && (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Vorschlag auf Basis des heutigen Datums: aktuelle Saison {suggestion.currentSeason}
                {suggestion.nextSeasonOpen ? `, Buchung für ${suggestion.currentSeason + 1} geöffnet` : ''}.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="activation-season-label">Aktuelle Saison</InputLabel>
                  <Select
                    labelId="activation-season-label"
                    label="Aktuelle Saison"
                    value={activationSeason}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setActivationSeason(value);
                      computeImpact(value);
                    }}
                  >
                    {[legacySeasonNow - 1, legacySeasonNow].map((season) => (
                      <MenuItem key={season} value={season}>{formatSeason(season)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Switch checked={activationNextOpen} onChange={(e) => setActivationNextOpen(e.target.checked)} />}
                  label={`Buchung für ${formatSeason(activationSeason + 1)} öffnen`}
                />
              </Box>
              {renderImpact(activationSeason)}
            </>
          )}
          {confirmAction === 'openNext' && (
            <Alert severity="info">
              <AlertTitle>Überlappungsphase beginnt</AlertTitle>
              Mitglieder können ab sofort Stunden für {formatSeason(currentSeason)} oder {formatSeason(nextSeason)} eintragen.
              Wer für {currentSeason} noch Stunden offen hat, bucht standardmäßig auf {currentSeason}, alle anderen auf {nextSeason}.
              Die Reservierungsberechtigung richtet sich weiterhin nach {formatSeason(currentSeason)}.
            </Alert>
          )}
          {confirmAction === 'startNext' && (
            <>
              <Alert severity="info">
                Ab sofort zählen für die Reservierungsberechtigung die Stunden für {formatSeason(nextSeason)}.
                Neue Einträge werden bis zum nächsten Öffnen nur noch auf {nextSeason} gebucht. Bestehende Reservierungen bleiben bestehen.
              </Alert>
              {renderImpact(nextSeason)}
            </>
          )}
          {confirmAction === 'undoStart' && (
            <>
              <Alert severity="warning">
                {formatSeason(currentSeason - 1)} wird wieder aktuelle Saison, die Buchung für {formatSeason(currentSeason)} bleibt geöffnet.
                Bereits gebuchte Einträge behalten ihre Saison.
              </Alert>
              {renderImpact(currentSeason - 1)}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)} disabled={busy}>Abbrechen</Button>
          <Button variant="contained" onClick={handleConfirm} disabled={busy}>
            {busy ? <CircularProgress size={20} /> : 'Bestätigen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
