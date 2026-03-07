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
} from '@mui/material';
import { useApp } from '../../contexts/AppContext';
import { User } from '../../types/models';

interface UserGuideProps {
  open: boolean;
  onClose: () => void;
}

interface GuideStepDefinition {
  title: string;
  body: string;
}

const GUIDE_STEPS: GuideStepDefinition[] = [
  {
    title: 'Willkommen',
    body: 'Hier verwalten Sie Arbeitsstunden, Bootsreservierungen und Mitgliedsdaten. Die Navigation finden Sie links im Menü.',
  },
  {
    title: 'Arbeitsstunden',
    body: 'Private Arbeitsstunden können Sie direkt eintragen. Nicht automatisch bestätigte Einträge erscheinen anschließend als ausstehend und werden erst nach Freigabe angerechnet.',
  },
  {
    title: 'Reservierungen',
    body: 'Sie können finale Reservierungen und unverbindliche Vormerkungen anlegen. Vormerkungen warnen andere Mitglieder, blockieren den Zeitraum aber nicht hart.',
  },
  {
    title: 'Öffentliche Reservierungen',
    body: 'Markieren Sie Reservierungen als öffentlich, wenn noch Plätze frei sind. Für externe Anzeigen wird nur ein datensparsamer öffentlicher Feed veröffentlicht.',
  },
  {
    title: 'Genehmigungen und Status',
    body: 'Achten Sie auf die Statusanzeigen: ausstehend, genehmigt, abgelehnt oder Vormerkung. So sehen Sie sofort, ob Einträge bereits zählen oder noch geprüft werden.',
  },
];

export const UserGuide: React.FC<UserGuideProps> = ({ open, onClose }) => {
  const { currentUser, database, reloadCurrentUser } = useApp();
  const [activeStep, setActiveStep] = useState(0);
  const currentStep = useMemo(() => GUIDE_STEPS[activeStep], [activeStep]);

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

  const handleSkip = async () => {
    await persistState('skipped');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Kurzanleitung</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {GUIDE_STEPS.map((step) => (
              <Step key={step.title}>
                <StepLabel>{step.title}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        <Box sx={{ py: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {currentStep.title}
          </Typography>
          <Typography variant="body1">
            {currentStep.body}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSkip} variant="text">
          Anleitung überspringen
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} variant="outlined">
          Später
        </Button>
        <Button onClick={handleNext} variant="contained">
          {activeStep === GUIDE_STEPS.length - 1 ? 'Fertig' : 'Weiter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
