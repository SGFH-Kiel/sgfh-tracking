import React, { useMemo, useState } from 'react';
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
} from '@mui/icons-material';
import { useApp } from '../../contexts/AppContext';
import { User } from '../../types/models';

interface UserGuideProps {
  open: boolean;
  onClose: () => void;
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

const buildSteps = (isAdmin: boolean, isAnyBootswart: boolean): GuideStepDefinition[] => [
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
          {[
            { icon: '📅', label: 'Kalender', desc: 'Bootsreservierungen und Arbeitstermine' },
            { icon: '🔧', label: 'Arbeitsstunden', desc: 'Eigene Stunden einsehen und eintragen' },
            ...(isAdmin ? [
              { icon: '⛵', label: 'Bootsverwaltung', desc: 'Boote anlegen und verwalten' },
              { icon: '👥', label: 'Mitgliederverwaltung', desc: 'Mitglieder und Rollen verwalten' },
            ] : []),
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
          Jedes Mitglied muss pro Jahr eine Mindestanzahl an Arbeitsstunden leisten. Den aktuellen Stand sehen Sie unter <strong>Arbeitsstunden → Meine Stunden</strong>.
        </Typography>

        <SectionTitle>Fortschrittsanzeige</SectionTitle>
        <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mb: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {[
              { color: 'success.main', label: 'Bestätigt' },
              { color: 'primary.main', label: 'Geplant' },
              { color: 'grey.300', label: 'Ausstehend' },
            ].map(({ color, label }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 8, borderRadius: 1, bgcolor: color }} />
                <Typography variant="caption">{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <SectionTitle>Statuswerte je Eintrag</SectionTitle>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
          <StatusBadge label="Unbestätigt" color="warning" />
          <StatusBadge label="Geplant" color="info" />
          <StatusBadge label="Bestätigt" color="success" />
          <StatusBadge label="Abgelehnt" color="error" />
        </Box>

        <SectionTitle>Stunden eintragen</SectionTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Über <strong>„Arbeitsstunde hinzufügen"</strong> können private Einträge manuell erfasst werden. Diese erscheinen zunächst als <em>Unbestätigt</em> und werden von einem Admin oder Bootswart geprüft.
        </Typography>

        <SectionTitle>Arbeitskalender</SectionTitle>
        <Typography variant="body2">
          Im Tab <strong>Arbeitskalender</strong> sehen Sie geplante Arbeitstermine. Per Klick können Sie sich für einen Termin eintragen.
        </Typography>

        {isAdmin && (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            <Typography variant="caption">
              Als Admin sehen Sie unter <strong>Mitgliederstunden</strong> den Stand aller Mitglieder und können Einträge bestätigen oder ablehnen.
            </Typography>
          </Alert>
        )}
        {!isAdmin && isAnyBootswart && (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            <Typography variant="caption">
              Als Bootswart können Sie Stunden für Einsätze an Ihrem Boot bestätigen oder ablehnen.
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
          Bootsreservierungen verwalten Sie im Tab <strong>Vormerkbuch</strong>. Klicken Sie auf einen freien Zeitraum im Kalender, um eine neue Reservierung zu erstellen.
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
          Den Gesamtstatus Ihrer Arbeitsstunden sehen Sie auf der Seite <strong>Arbeitsstunden</strong> neben der Überschrift.
        </Typography>

        <SectionTitle>Gesamtstatus Arbeitsstunden</SectionTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
          {([
            { label: 'Offen', color: 'warning', desc: 'Stunden fehlen noch, keine Planung vorhanden' },
            { label: 'Geplant', color: 'info', desc: 'Stunden eingeplant, aber noch nicht bestätigt' },
            { label: 'Erfüllt', color: 'success', desc: 'Alle Stunden bestätigt — Reservierungen möglich' },
            { label: 'Prüfen!', color: 'error', desc: 'Mindestens ein Eintrag wurde abgelehnt' },
            { label: 'Ausgesetzt', color: 'success', desc: 'Stundenpflicht für Sie deaktiviert' },
          ] as const).map(({ label, color, desc }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <StatusBadge label={label} color={color} />
              <Typography variant="caption" color="text.secondary">{desc}</Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <SectionTitle>Hilfe jederzeit abrufen</SectionTitle>
        <Typography variant="body2">
          Diese Anleitung ist über den <strong>„Hilfe"</strong>-Button oben rechts in der Menüleiste jederzeit wieder abrufbar.
        </Typography>

        {isAdmin && (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            <Typography variant="caption">
              <strong>Admin:</strong> Reservierungen genehmigen Sie im Kalender per Klick auf den Eintrag. Arbeitsstunden verwalten Sie unter <strong>Mitgliederstunden</strong>.
            </Typography>
          </Alert>
        )}
        {!isAdmin && isAnyBootswart && (
          <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
            <Typography variant="caption">
              <strong>Bootswart:</strong> Ausstehende Reservierungen für Ihr Boot können Sie im Kalender direkt genehmigen oder ablehnen.
            </Typography>
          </Alert>
        )}
      </Box>
    ),
  },
];

export const UserGuide: React.FC<UserGuideProps> = ({ open, onClose }) => {
  const { currentUser, database, reloadCurrentUser, isAdmin, isAnyBootswart } = useApp();
  const [activeStep, setActiveStep] = useState(0);

  const GUIDE_STEPS = useMemo(
    () => buildSteps(isAdmin, isAnyBootswart),
    [isAdmin, isAnyBootswart],
  );
  const currentStep = useMemo(() => GUIDE_STEPS[activeStep], [GUIDE_STEPS, activeStep]);

  const persistState = async (onboardingState: User['onboardingState']) => {
    if (!currentUser || !onboardingState) {
      return;
    }
    await database.updateDocument<User>('users', currentUser.id, {
      onboardingState,
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
