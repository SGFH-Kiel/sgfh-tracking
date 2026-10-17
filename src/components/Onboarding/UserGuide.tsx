import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Handyman as HandymanIcon,
  DirectionsBoat as BoatIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  AutoAwesome as NewIcon,
} from '@mui/icons-material';
import { useApp } from '../../contexts/AppContext';
import { isSeasonModelActive } from '../../domain/seasons';
import { useUiVersion } from '../../hooks/useUiVersion';
import { UiVersion } from '../../domain/uiVersion';
import { User } from '../../types/models';

interface UserGuideProps {
  open: boolean;
  onClose: () => void;
  /** Schritt, mit dem die Tour beim Öffnen beginnt (z. B. „Neu hier“ beim ersten Wechsel auf v2). */
  initialStep?: number;
}

interface GuideStepDefinition {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const StatusBadge = ({ label, color }: { label: string; color: 'warning' | 'info' | 'success' | 'error' | 'default' }) => (
  <Chip size="small" label={label} color={color} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
);

const FlowStep = ({ label, arrow = true }: { label: string; arrow?: boolean }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Typography variant="caption" sx={{ fontWeight: 500 }}>{label}</Typography>
    {arrow && <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
  </Box>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5, mt: 1.5, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.8 }}>
    {children}
  </Typography>
);

interface GuideContext {
  isAdmin: boolean;
  isAnyBootswart: boolean;
  seasonModelActive: boolean;
  ui: UiVersion;
}

/** Index des v2-Einführungsschritts („Neu hier“) – dort beginnt die Tour für Nutzer, die v1 schon kennen. */
export const V2_INTRO_STEP_INDEX = 1;

const v2IntroStep = ({ isAdmin, isAnyBootswart }: GuideContext): GuideStepDefinition => ({
  title: 'Neu hier',
  icon: <NewIcon sx={{ fontSize: 22 }} />,
  content: (
    <Box>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Sie nutzen die <strong>neue Oberfläche</strong>. Das Wichtigste in Kürze:
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {[
          { icon: '🏠', label: 'Übersicht', desc: 'Darf ich final reservieren? Was fehlt mir? Was steht an? – alles auf einen Blick.' },
          { icon: '🧭', label: 'Navigation', desc: 'Auf dem Smartphone unten, am Computer links: Übersicht, Kalender, Stunden' + (isAdmin || isAnyBootswart ? ', Prüfen' : '') + ' und Mehr.' },
          ...(isAdmin || isAnyBootswart ? [{ icon: '✅', label: 'Prüfen', desc: 'Alle offenen Arbeitsstunden und Reservierungen Ihrer Zuständigkeit – bestätigen oder ablehnen mit einem Tipp, inklusive „Rückgängig“.' }] : []),
          { icon: '📲', label: 'App installieren', desc: 'Über das Symbol oben rechts (wenn Ihr Gerät es unterstützt) – mit eigenem Symbol und ohne erneute Anmeldung.' },
          { icon: '🔄', label: 'Zurück zur klassischen Ansicht', desc: 'Jederzeit über Ihr Profilsymbol oben rechts oder unter „Mehr“.' },
        ].map(({ icon, label, desc }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
            <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{icon}</Typography>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</Typography>
              <Typography variant="caption" color="text.secondary">{desc}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Alle Änderungen an der App finden Sie unter „Neuigkeiten“.
      </Typography>
    </Box>
  ),
});

const buildSteps = (context: GuideContext): GuideStepDefinition[] => {
  const { isAdmin, isAnyBootswart, seasonModelActive, ui } = context;
  const v2 = ui === 'v2';
  const steps: GuideStepDefinition[] = [
  {
    title: 'Willkommen',
    icon: <span style={{ fontSize: 22 }}>👋</span>,
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Willkommen bei der SGFH-Mitgliederverwaltung. Diese Kurzanleitung erklärt die wichtigsten Funktionen.
        </Typography>

        <SectionTitle>Navigation</SectionTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
          {(v2 ? [
            { icon: '🏠', label: 'Übersicht', desc: 'Status, nächste Reservierungen und Arbeitstermine' },
            { icon: '📅', label: 'Kalender', desc: 'Bootsreservierungen und Arbeitstermine' },
            { icon: '🔧', label: 'Stunden', desc: 'Eigene Stunden einsehen und eintragen' },
            ...(isAdmin || isAnyBootswart ? [{ icon: '✅', label: 'Prüfen', desc: 'Offene Arbeitsstunden und Reservierungen bearbeiten' }] : []),
            { icon: '⋯', label: 'Mehr', desc: isAdmin || isAnyBootswart ? 'Neuigkeiten, Verwaltung (z. B. Mitgliederstunden), Einstellungen, Hilfe' : 'Neuigkeiten, Einstellungen, Hilfe' },
          ] : [
            { icon: '📅', label: 'Kalender', desc: 'Bootsreservierungen und Arbeitstermine' },
            { icon: '🔧', label: 'Arbeitsstunden', desc: 'Eigene Stunden einsehen und eintragen' },
            ...(isAdmin ? [
              { icon: '⛵', label: 'Bootsverwaltung', desc: 'Boote anlegen und verwalten' },
              { icon: '👥', label: 'Mitgliederverwaltung', desc: 'Mitglieder und Rollen verwalten' },
            ] : []),
          ]).map(({ icon, label, desc }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
              <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{icon}</Typography>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</Typography>
                <Typography variant="caption" color="text.secondary">{desc}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <SectionTitle>Voraussetzungen für Reservierungen</SectionTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[
            'Mitgliedsbeitrag bezahlt',
            'Arbeitsstunden erfüllt (oder freigestellt)',
          ].map((req) => (
            <Box key={req} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
              <Typography variant="body2">{req}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    ),
  },
  {
    title: 'Arbeitsstunden',
    icon: <HandymanIcon sx={{ fontSize: 22 }} />,
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Jedes Mitglied muss pro {seasonModelActive ? 'Saison' : 'Jahr'} eine Mindestanzahl an Arbeitsstunden leisten. Den aktuellen Stand sehen Sie {v2 ? <>in der <strong>Übersicht</strong> und unter <strong>Stunden</strong></> : <>unter <strong>Arbeitsstunden → Meine Stunden</strong></>}.
        </Typography>

        {seasonModelActive && (
          <>
            <SectionTitle>Saisons</SectionTitle>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Jeder Eintrag zählt für eine Saison (z. B. <em>Saison 2026</em>). Für Reservierungen zählen die Stunden der aktuellen Saison.
              Gegen Saisonende wird die Buchung für die nächste Saison geöffnet: Dann können Sie beim Eintragen wählen, für welche Saison die Stunden zählen.
              Fehlen Ihnen noch Stunden für die laufende Saison, wird diese vorgeschlagen – sonst die nächste.
            </Typography>
          </>
        )}

        <SectionTitle>Fortschrittsanzeige</SectionTitle>
        <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mb: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {(v2 ? [
              { color: 'primary.main', label: 'Bestätigt (grün, wenn erfüllt)' },
              { color: 'primary.light', label: 'Offen oder geplant' },
              { color: 'grey.300', label: 'Fehlt noch' },
            ] : [
              { color: 'success.main', label: 'Bestätigt' },
              { color: 'primary.main', label: 'Geplant' },
              { color: 'grey.300', label: 'Ausstehend' },
            ]).map(({ color, label }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 8, borderRadius: 1, bgcolor: color }} />
                <Typography variant="caption">{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <SectionTitle>Statuswerte je Eintrag</SectionTitle>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
          <StatusBadge label={v2 ? 'Offen' : 'Unbestätigt'} color="warning" />
          <StatusBadge label="Geplant" color="info" />
          <StatusBadge label="Bestätigt" color="success" />
          <StatusBadge label="Abgelehnt" color="error" />
        </Box>

        <SectionTitle>Stunden eintragen</SectionTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Über <strong>{v2 ? '„Stunden eintragen“' : '„Arbeitsstunde hinzufügen“'}</strong> können private Einträge manuell erfasst werden. Diese erscheinen zunächst als <em>{v2 ? 'Offen' : 'Unbestätigt'}</em> und werden von einem Admin oder Bootswart geprüft.
        </Typography>

        <SectionTitle>Arbeitskalender</SectionTitle>
        <Typography variant="body2">
          {v2
            ? <>Unter <strong>Kalender → Arbeitskalender</strong> sehen Sie geplante Arbeitstermine (auf dem Smartphone als Liste). Termin antippen und „Teilnehmen“ wählen. Die nächsten Termine stehen auch in der Übersicht.</>
            : <>Im Tab <strong>Arbeitskalender</strong> sehen Sie geplante Arbeitstermine. Per Klick können Sie sich für einen Termin eintragen.</>}
        </Typography>

        {isAdmin && (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            <Typography variant="caption">
              {v2
                ? <>Als Admin bestätigen oder lehnen Sie Einträge unter <strong>Prüfen</strong> ab. Den Stand aller Mitglieder (inkl. Import/Export) finden Sie unter <strong>Mehr → Mitgliederstunden</strong>.</>
                : <>Als Admin sehen Sie unter <strong>Mitgliederstunden</strong> den Stand aller Mitglieder und können Einträge bestätigen oder ablehnen.</>}
            </Typography>
          </Alert>
        )}
        {!isAdmin && isAnyBootswart && (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            <Typography variant="caption">
              Als Bootswart können Sie Stunden für Einsätze an Ihrem Boot bestätigen oder ablehnen{v2 ? <> – gesammelt unter <strong>Prüfen</strong></> : ''}.
            </Typography>
          </Alert>
        )}
      </Box>
    ),
  },
  {
    title: 'Reservierungen',
    icon: <CalendarIcon sx={{ fontSize: 22 }} />,
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {v2
            ? <>Bootsreservierungen verwalten Sie unter <strong>Kalender → Vormerkbuch</strong>. Mit <strong>„Reservieren“</strong> (bzw. „Vormerken“) legen Sie eine neue Reservierung an; Ihre nächsten Reservierungen sehen Sie auch in der Übersicht.</>
            : <>Bootsreservierungen verwalten Sie im Tab <strong>Vormerkbuch</strong>. Klicken Sie auf einen freien Zeitraum im Kalender oder auf „Reservieren“, um eine neue Reservierung zu erstellen.</>}
        </Typography>

        <SectionTitle>Reservierungsstatus</SectionTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 1, border: '1px solid', borderColor: 'warning.light', bgcolor: 'warning.50' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Entwurf</Typography>
            <Typography variant="caption" color="text.secondary">
              Unverbindliche Vormerkung — sichtbar für andere Mitglieder, blockiert den Zeitraum aber nicht.
            </Typography>
          </Box>
          <Box sx={{ p: 1, borderRadius: 1, border: '1px solid', borderColor: 'info.light', bgcolor: 'info.50' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Ausstehend</Typography>
            <Typography variant="caption" color="text.secondary">
              Finale Reservierung, wartet auf Genehmigung durch den Bootswart (nur bei Booten mit Genehmigungspflicht).
            </Typography>
          </Box>
          <Box sx={{ p: 1, borderRadius: 1, border: '1px solid', borderColor: 'success.light', bgcolor: 'success.50' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Genehmigt</Typography>
            <Typography variant="caption" color="text.secondary">
              Bestätigte Reservierung. Bei Booten ohne Genehmigungspflicht sofort genehmigt.
            </Typography>
          </Box>
        </Box>

        <SectionTitle>Ablauf</SectionTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.25, p: 1, bgcolor: 'grey.50', borderRadius: 1, mb: 0.5 }}>
          <FlowStep label="Entwurf" />
          <FlowStep label="Ausstehend" />
          <FlowStep label="Genehmigt" arrow={false} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Von jedem Status aus kann eine Reservierung storniert werden.
        </Typography>

        <SectionTitle>Voraussetzungen für finale Reservierungen</SectionTitle>
        <Typography variant="body2">
          Mitgliedsbeitrag bezahlt <strong>und</strong> Arbeitsstunden erfüllt (oder freigestellt). Entwürfe können immer angelegt werden.
        </Typography>
      </Box>
    ),
  },
  {
    title: 'Sichtbarkeit',
    icon: <BoatIcon sx={{ fontSize: 22 }} />,
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Bei jeder Reservierung steuern Sie, was im öffentlichen Feed erscheint.
        </Typography>

        <SectionTitle>Optionen</SectionTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.5, p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
            <Typography sx={{ fontSize: 18 }}>🔒</Typography>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Privat</Typography>
              <Typography variant="caption" color="text.secondary">
                Nur für Mitglieder sichtbar. Erscheint nicht im externen Feed.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
            <Typography sx={{ fontSize: 18 }}>🌐</Typography>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Öffentlich</Typography>
              <Typography variant="caption" color="text.secondary">
                Erscheint im externen Feed. Nur Datum, Boot und ein optionaler Freitext werden veröffentlicht.
              </Typography>
            </Box>
          </Box>
        </Box>

        <SectionTitle>Freie Plätze kommunizieren</SectionTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Bei öffentlichen Reservierungen können Sie einen <strong>Freitext</strong> angeben (z.&nbsp;B. <em>„2 Plätze frei"</em>), der im Feed angezeigt wird.
        </Typography>

        <Alert severity="info" sx={{ py: 0.5 }}>
          <Typography variant="caption">
            <strong>Datenschutz:</strong> Der öffentliche Feed enthält keine Namen oder internen Details Ihrer Reservierung.
          </Typography>
        </Alert>
      </Box>
    ),
  },
  {
    title: 'Status & Hilfe',
    icon: <CheckCircleIcon sx={{ fontSize: 22 }} />,
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {v2
            ? <>Ob Sie final reservieren können und was noch fehlt, zeigt die <strong>Übersicht</strong> ganz oben. Details stehen unter <strong>Stunden</strong>.</>
            : <>Den Gesamtstatus Ihrer Arbeitsstunden sehen Sie auf der Seite <strong>Arbeitsstunden</strong> neben der Überschrift.</>}
        </Typography>

        <SectionTitle>{v2 ? 'Status in der Übersicht' : 'Gesamtstatus Arbeitsstunden'}</SectionTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
          {((v2 ? [
            { label: 'Sie können final reservieren', color: 'success', desc: 'Beitrag bezahlt und Stunden erfüllt (oder befreit)' },
            { label: 'Noch nicht möglich', color: 'warning', desc: 'Die Übersicht nennt, was fehlt – z. B. noch offene Stunden' },
            { label: 'Abgelehnt', color: 'error', desc: 'Ein Eintrag wurde abgelehnt – bitte mit Admin oder Bootswart klären' },
          ] : [
            { label: 'Offen', color: 'warning', desc: 'Stunden fehlen noch, keine Planung vorhanden' },
            { label: 'Geplant', color: 'info', desc: 'Stunden eingeplant, aber noch nicht bestätigt' },
            { label: 'Erfüllt', color: 'success', desc: 'Alle Stunden bestätigt — Reservierungen möglich' },
            { label: 'Prüfen!', color: 'error', desc: 'Mindestens ein Eintrag wurde abgelehnt' },
            { label: 'Ausgesetzt', color: 'success', desc: 'Stundenpflicht für Sie deaktiviert' },
          ]) as ReadonlyArray<{ label: string; color: 'success' | 'warning' | 'error' | 'info'; desc: string }>).map(({ label, color, desc }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <StatusBadge label={label} color={color} />
              <Typography variant="caption" color="text.secondary">{desc}</Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <SectionTitle>Hilfe jederzeit abrufen</SectionTitle>
        <Typography variant="body2">
          {v2
            ? <>Diese Anleitung erreichen Sie jederzeit über Ihr <strong>Profilsymbol</strong> oben rechts → „Hilfe“ oder unter <strong>Mehr → Hilfe</strong>.</>
            : <>Diese Anleitung ist über den <strong>„Hilfe“</strong>-Button oben rechts in der Menüleiste jederzeit wieder abrufbar.</>}
        </Typography>

        {isAdmin && (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            <Typography variant="caption">
              {v2
                ? <><strong>Admin:</strong> Offene Reservierungen und Arbeitsstunden bearbeiten Sie unter <strong>Prüfen</strong>, den Stand aller Mitglieder unter <strong>Mehr → Mitgliederstunden</strong>.</>
                : <><strong>Admin:</strong> Reservierungen genehmigen Sie im Kalender per Klick auf den Eintrag. Arbeitsstunden verwalten Sie unter <strong>Mitgliederstunden</strong>.</>}
            </Typography>
          </Alert>
        )}
        {!isAdmin && isAnyBootswart && (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            <Typography variant="caption">
              {v2
                ? <><strong>Bootswart:</strong> Ausstehende Reservierungen und Arbeitsstunden für Ihr Boot finden Sie gesammelt unter <strong>Prüfen</strong>.</>
                : <><strong>Bootswart:</strong> Ausstehende Reservierungen für Ihr Boot können Sie im Kalender direkt genehmigen oder ablehnen.</>}
            </Typography>
          </Alert>
        )}
      </Box>
    ),
  },
  ];
  if (v2) {
    steps.splice(V2_INTRO_STEP_INDEX, 0, v2IntroStep(context));
  }
  return steps;
};

export const UserGuide: React.FC<UserGuideProps> = ({ open, onClose, initialStep = 0 }) => {
  const { currentUser, database, reloadCurrentUser, isAdmin, isAnyBootswart, systemConfig } = useApp();
  const { version: ui } = useUiVersion();
  const seasonModelActive = isSeasonModelActive(systemConfig);
  const [activeStep, setActiveStep] = useState(0);

  const GUIDE_STEPS = useMemo(
    () => buildSteps({ isAdmin, isAnyBootswart, seasonModelActive, ui }),
    [isAdmin, isAnyBootswart, seasonModelActive, ui],
  );

  useEffect(() => {
    if (open) {
      setActiveStep(Math.min(Math.max(0, initialStep), GUIDE_STEPS.length - 1));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const currentStep = useMemo(() => GUIDE_STEPS[activeStep], [GUIDE_STEPS, activeStep]);

  const persistState = async (onboardingState: User['onboardingState']) => {
    if (!currentUser || !onboardingState) {
      return;
    }
    await database.updateDocument<User>('users', currentUser.id, {
      onboardingState,
      // In v2 merken, dass die Einführung der neuen Oberfläche gesehen wurde
      ...(ui === 'v2' ? { preferences: { ...(currentUser.preferences ?? {}), v2TourSeen: true } } : {}),
      updatedAt: new Date(),
    });
    await reloadCurrentUser();
    onClose();
  };

  const handleNext = async () => {
    if (activeStep === GUIDE_STEPS.length - 1) {
      await persistState('completed');
      return;
    }
    setActiveStep((current) => current + 1);
  };

  const handleBack = () => {
    setActiveStep((current) => current - 1);
  };

  const handleSkip = async () => {
    await persistState('skipped');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {currentStep.icon}
          <Typography variant="h6">{currentStep.title}</Typography>
        </Box>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 1 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {GUIDE_STEPS.map((step) => (
            <Step key={step.title}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': { fontSize: '0.65rem', mt: 0.25 },
                  '& .MuiStepIcon-root': { fontSize: 18 },
                }}
              >
                {step.title}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ pt: 2 }}>
        {currentStep.content}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleSkip} variant="text" size="small" sx={{ color: 'text.secondary' }}>
          Überspringen
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} variant="outlined" size="small">
            Zurück
          </Button>
        )}
        <Button onClick={onClose} variant="outlined" size="small">
          Später
        </Button>
        <Button onClick={handleNext} variant="contained" size="small">
          {activeStep === GUIDE_STEPS.length - 1 ? 'Fertig' : 'Weiter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
